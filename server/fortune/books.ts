import {READING_VERSION,PROMPT_VERSION,readingPolicies} from './reading-policy';
import {bodyCharacterCount} from './reading-quality';
import {selectChapterFacts} from './chapter-facts';
import {productManifest} from './product-manifest';
import {topicLabel} from './topics';
import {chartView} from './charts';
import { Database } from "../db/types";
import { domains } from "./index";
import { purchaseContexts } from "./charts";
import { analyze } from "./analysis";
import {
  BOOK_VERSION,
  chapterManifest,
  ChapterBody,
  ChapterSpec,
  MasterAnalysis,
} from "./book-contracts";
import { DomainId, DomainContext, FortuneError } from "./shared/contracts";
import { getProduct } from "../payments/catalog";
import { prepareGeneration } from "./generation";
import { FortuneChapterProvider, validateChapter } from "../providers/chapter";

export interface BookQueue {
  send(message: { requestId: string }): Promise<void>;
}
export async function recoverPaidBooks(
  db: Database,
  env: Record<string, string>,
) {
  const { results } = await db
    .prepare(
      "SELECT o.user_id,o.product_id,o.profile_id FROM orders o JOIN order_chart_links l ON l.order_id=o.id JOIN entitlements e ON e.order_id=o.id LEFT JOIN fortune_requests r ON r.entitlement_id=e.id LEFT JOIN fortune_books b ON b.request_id=r.id WHERE o.status='PAID' AND e.status='ACTIVE' AND b.request_id IS NULL AND (r.status IS NULL OR r.status!='SUCCEEDED') LIMIT 50",
    )
    .all<{ user_id: string; product_id: string; profile_id: string }>();
  for (const row of results)
    await prepareBook(db, row.user_id, row.product_id, row.profile_id, env);
}
export async function prepareBook(
  db: Database,
  userId: string,
  productId: string,
  profileId: string,
  env: Record<string, string>,
) {
  const p = getProduct(productId);
  const row = await db
    .prepare("SELECT input_json FROM profiles WHERE id=? AND user_id=?")
    .bind(profileId, userId)
    .first<{ input_json: string }>();
  if (!row) throw new FortuneError("PROFILE_NOT_FOUND", 404);
  const request = await prepareGeneration(db, userId, productId, profileId);
  const existing = await db
    .prepare("SELECT request_id FROM fortune_books WHERE request_id=?")
    .bind(request.id)
    .first();
  if (existing) return request;
  // Old completed results retain their original schema and contents.
  if (request.status === "SUCCEEDED") return request;
  const contract=await db.prepare('SELECT s.spec_json,l.manifest_version FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id LEFT JOIN order_specs s ON s.order_id=e.order_id LEFT JOIN order_chart_links l ON l.order_id=e.order_id WHERE r.id=?').bind(request.id).first<{spec_json:string|null;manifest_version:string|null}>();
  const legacy=!contract?.spec_json||contract?.manifest_version==='destiny-book-v2';
  const fixed=contract?.spec_json?JSON.parse(contract.spec_json):p;
  const input=JSON.parse(row.input_json);
  const { snapshot, contexts } = await purchaseContexts(
    db,
    userId,
    profileId,
    p.domain,
    p.fishId,
    env,
    legacy,
    fixed,
  );
  const master = {...analyze(contexts),topicId:input.topicId||'general',question:input.question||'',asOf:snapshot.as_of,readingMode:input.readingMode||'personal'};
  const manifest = legacy?chapterManifest(p.fishId as import('./shared/contracts').FishId):productManifest(fixed,input.topicId,input.readingMode).map(c=>({...c,factIds:Object.values(contexts).filter(d=>c.systems?.includes(d.domain)).flatMap(d=>selectChapterFacts(d,c,input.topicId).map(f=>f.id))}));
  await db.batch([
    db
      .prepare(
        "INSERT INTO fortune_books (request_id,tier,manifest_json,analysis_json,created_at) VALUES (?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING",
      )
      .bind(
        request.id,
        p.fishId,
        JSON.stringify(manifest),
        JSON.stringify(master),
        Date.now(),
      ),
    db
      .prepare(
        "UPDATE fortune_requests SET book_version=?,chart_id=? WHERE id=? AND book_version IS NULL",
      )
      .bind(legacy?BOOK_VERSION:fixed.manifestVersion, snapshot.id, request.id),
    ...manifest.map((c) =>
      db
        .prepare(
          "INSERT INTO fortune_chapters (request_id,chapter_id,ordinal) VALUES (?,?,?) ON CONFLICT DO NOTHING",
        )
        .bind(request.id, c.id, c.ordinal),
    ),
    db
      .prepare(
        "INSERT INTO fortune_outbox (request_id,created_at) SELECT ?,? WHERE EXISTS(SELECT 1 FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.id=? AND e.status='ACTIVE') ON CONFLICT DO NOTHING",
      )
      .bind(request.id, Date.now(),request.id),
  ]);
  return request;
}
async function owned(db: Database, userId: string, id: string) {
  const row = await db
    .prepare(
      "SELECT r.id,r.status,r.chart_id,r.provider,r.book_version,r.product_id FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id JOIN orders o ON o.id=e.order_id WHERE r.id=? AND r.user_id=? AND e.status='ACTIVE' AND o.status='PAID'",
    )
    .bind(id, userId)
    .first<{ id: string; status: string; chart_id: string;provider:string|null;book_version:string;product_id:string }>();
  if (!row) throw new FortuneError("RESULT_NOT_FOUND", 404);
  return row;
}
export async function bookStatus(db: Database, userId: string, id: string) {
  const request = await owned(db, userId, id);
  const book = await db
    .prepare("SELECT * FROM fortune_books WHERE request_id=?")
    .bind(id)
    .first<{
      manifest_json: string;
      tier: string;
      summary_json: string | null;
      analysis_json: string;
    }>();
  if (!book) return null;
  const chart = await db
    .prepare("SELECT chart_json FROM chart_snapshots WHERE id=?")
    .bind(request.chart_id)
    .first<{ chart_json: string }>();
  const { results } = await db
    .prepare(
      "SELECT chapter_id,status,failure_code FROM fortune_chapters WHERE request_id=? ORDER BY ordinal",
    )
    .bind(id)
    .all<{ chapter_id: string; status: string; failure_code: string | null }>();
  const manifest = JSON.parse(book.manifest_json) as ChapterSpec[];
  const tiers = ["mackerel", "salmon", "flounder", "tuna"] as const;
  const names = {
    mackerel: "고등어",
    salmon: "연어",
    flounder: "광어",
    tuna: "참치",
  };
  const next = ['assorted','omakase'].includes(book.tier)?undefined:tiers[tiers.indexOf(book.tier as (typeof tiers)[number]) + 1];
  const locked = next
    ? (request.book_version===BOOK_VERSION?chapterManifest(next):productManifest({...getProduct(request.product_id),fishId:next,packageId:next,chapterCount:chapterManifest(next).length},JSON.parse(book.analysis_json).topicId,JSON.parse(book.analysis_json).readingMode))
        .filter((c) => !manifest.some((m) => m.title === c.title))
        .slice(0, 5)
        .map((c) => ({ title: c.title, tier: names[next] }))
    : [];
  const analysis = JSON.parse(book.analysis_json) as MasterAnalysis;
  const timing = analysis.contexts.saju?.facts.find(
    (f) => f.label === "yearlyLuck",
  )?.value;
  const timeline =
    (manifest[0]?.version===READING_VERSION ? !["flounder","tuna","assorted","omakase"].includes(book.tier) : book.tier === "mackerel") || !Array.isArray(timing)
      ? []
      : timing
          .slice(
            0,
            book.tier === "salmon" ? 1 : book.tier === "flounder" ? 3 : 10,
          )
          .map((r) => ({ year: r.year, label: r.pillar, source: "사주 세운" }));
  const signals = analysis.themes
    .filter((t) => t.sources.length)
    .map((t) => ({
      theme: t.theme,
      agreement: t.agreement,
      confidence: t.confidence,
    }));

  const progress = await db
    .prepare(
      "SELECT last_chapter,read_json FROM fortune_reading_progress WHERE request_id=?",
    )
    .bind(id)
    .first<{ last_chapter: string; read_json: string }>();
  return {
    version: request.book_version,
    mock:request.provider==='mock',
    id,
    locked,
    timeline,
    signals,
    tier: book.tier,
    packageName:`${topicLabel(analysis.topicId)} ${getProduct(request.product_id).fishName}`.trim(),
    status: request.status,
    chart: chart ? JSON.parse(chart.chart_json) : null,
    charts:Object.values(analysis.contexts).map(c=>chart && c.domain===JSON.parse(chart.chart_json).domain?JSON.parse(chart.chart_json):chartView(c)),
    chapters: manifest.map((c) => ({
      ...c,
      ...results.find((r) => r.chapter_id === c.id),
    })),
    completed: results.filter((c) => c.status === "completed").length,
    total: manifest.length,
    summary: book.summary_json ? JSON.parse(book.summary_json) : null,
    progress: progress
      ? {
          lastChapter: progress.last_chapter,
          read: JSON.parse(progress.read_json),
        }
      : { read: [] },
    retryable: results.some(
      (c) =>
        c.status === "failed" &&
        c.failure_code !== 'LLM_TEST_BUDGET' && c.failure_code !== 'LLM_REQUEST_BUDGET' && c.failure_code !== 'PAYMENT_REVOKED' && c.failure_code !== 'CHAPTER_TOO_SHORT' && c.failure_code !== 'CHAPTER_DEPTH_INCOMPLETE',
    ),
  };
}
export async function readChapter(
  db: Database,
  userId: string,
  id: string,
  chapterId: string,
) {
  await owned(db, userId, id);
  const row = await db
    .prepare(
      "SELECT content_json FROM fortune_chapters WHERE request_id=? AND chapter_id=? AND status='completed'",
    )
    .bind(id, chapterId)
    .first<{ content_json: string }>();
  if (!row) throw new FortuneError("CHAPTER_NOT_READY", 409);
  return JSON.parse(row.content_json) as ChapterBody;
}
export async function saveProgress(
  db: Database,
  userId: string,
  id: string,
  chapterId: string,
) {
  await readChapter(db, userId, id, chapterId);
  // json_each merge is atomic, so simultaneous devices do not discard read chapters.
  await db
    .prepare(
      "INSERT INTO fortune_reading_progress (request_id,last_chapter,read_json,updated_at) VALUES (?,?,json_array(?),?) ON CONFLICT(request_id) DO UPDATE SET last_chapter=excluded.last_chapter,read_json=(SELECT json_group_array(value) FROM (SELECT value FROM json_each(fortune_reading_progress.read_json) UNION SELECT value FROM json_each(excluded.read_json))),updated_at=excluded.updated_at",
    )
    .bind(id, chapterId, chapterId, Date.now())
    .run();
}
export async function retryBook(db: Database, userId: string, id: string) {
  await owned(db, userId, id);
  await db.batch([
    db
      .prepare(
        "UPDATE fortune_chapters SET status='pending',failure_code=NULL,attempt_id=NULL,lease_until=NULL,raw_json=NULL WHERE request_id=? AND status='failed' AND failure_code NOT IN ('LLM_TEST_BUDGET','LLM_REQUEST_BUDGET','PAYMENT_REVOKED','CHAPTER_TOO_SHORT','CHAPTER_DEPTH_INCOMPLETE')",
      )
      .bind(id),
    db
      .prepare(
        "UPDATE fortune_requests SET status='PENDING' WHERE id=? AND EXISTS(SELECT 1 FROM fortune_chapters WHERE request_id=? AND status='pending') AND NOT EXISTS(SELECT 1 FROM fortune_chapters WHERE request_id=? AND failure_code IN ('LLM_TEST_BUDGET','LLM_REQUEST_BUDGET','PAYMENT_REVOKED'))",
      )
      .bind(id, id, id),
    db
      .prepare(
        "INSERT INTO fortune_outbox (request_id,created_at) VALUES (?,?) ON CONFLICT(request_id) DO UPDATE SET sent_at=NULL",
      )
      .bind(id, Date.now()),
  ]);
}
export async function deliverOutbox(db: Database, queue: BookQueue) {
  const { results } = await db
    .prepare(
      "SELECT o.request_id FROM fortune_outbox o JOIN fortune_requests r ON r.id=o.request_id JOIN entitlements e ON e.id=r.entitlement_id WHERE e.status='ACTIVE' AND r.resume_after<=? AND (o.sent_at IS NULL OR o.sent_at<?) LIMIT 50",
    )
    .bind(Date.now(), Date.now() - 120000)
    .all<{ request_id: string }>();
  for (const row of results) {
    await queue.send({ requestId: row.request_id });
    await db
      .prepare("UPDATE fortune_outbox SET sent_at=? WHERE request_id=?")
      .bind(Date.now(), row.request_id)
      .run();
  }
}
export async function runBookStep(
  db: Database,
  id: string,
  provider: FortuneChapterProvider,
): Promise<boolean> {
  const active = await db
    .prepare(
      "SELECT b.analysis_json,b.manifest_json FROM fortune_books b JOIN fortune_requests r ON r.id=b.request_id JOIN entitlements e ON e.id=r.entitlement_id JOIN orders o ON o.id=e.order_id WHERE b.request_id=? AND e.status='ACTIVE' AND o.status='PAID' AND r.resume_after<=?",
    )
    .bind(id,Date.now())
    .first<{ analysis_json: string; manifest_json: string }>();
  if (!active) return false;
  // A lease expiring after an external request is ambiguous; never blindly reissue.
  await db.batch([
    db
      .prepare(
        "UPDATE fortune_chapters SET status='pending',attempt_id=NULL WHERE request_id=? AND status='generating' AND lease_until<? AND raw_json IS NOT NULL",
      )
      .bind(id, Date.now()),
    db
      .prepare(
        "UPDATE fortune_chapters SET status='failed',failure_code='UNCERTAIN' WHERE request_id=? AND status='generating' AND lease_until<? AND raw_json IS NULL",
      )
      .bind(id, Date.now()),
  ]);
  const current = await db
    .prepare(
      "SELECT * FROM fortune_chapters WHERE request_id=? AND status!='completed' ORDER BY ordinal LIMIT 1",
    )
    .bind(id)
    .first<{
      chapter_id: string;
      status: string;
      raw_json: string | null;
      failure_code: string | null;
    }>();
  if (!current) {
    await finishBook(db, id);
    return false;
  }
  if (current.status !== "pending") {
    if (current.failure_code === "UNCERTAIN")
      await db
        .prepare("UPDATE fortune_requests SET status='UNCERTAIN' WHERE id=?")
        .bind(id)
        .run();
    if (current.status === "failed")
      await db
        .prepare("DELETE FROM fortune_outbox WHERE request_id=?")
        .bind(id)
        .run();
    return false;
  }
  const token = crypto.randomUUID();
  const claimed = await db
    .prepare(
      "UPDATE fortune_chapters SET status='generating',attempt_id=?,lease_until=?,attempts=attempts+1 WHERE request_id=? AND chapter_id=? AND status='pending' AND EXISTS(SELECT 1 FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.id=fortune_chapters.request_id AND e.status='ACTIVE')",
    )
    .bind(token, Date.now() + 300000, id, current.chapter_id)
    .run();
  if (!claimed.meta.changes) return false;
  await db
    .prepare("UPDATE fortune_requests SET status='RUNNING' WHERE id=? AND EXISTS(SELECT 1 FROM entitlements e WHERE e.id=fortune_requests.entitlement_id AND e.status='ACTIVE')")
    .bind(id)
    .run();
  const manifest = JSON.parse(active.manifest_json) as ChapterSpec[];
  const previous = await db
    .prepare(
      "SELECT content_json FROM fortune_chapters WHERE request_id=? AND status='completed' ORDER BY ordinal",
    )
    .bind(id)
    .all<{ content_json: string }>();
  const input = {
    chapter: manifest.find((c) => c.id === current.chapter_id)!,
    analysis: JSON.parse(active.analysis_json) as MasterAnalysis,
    previous: previous.results.map((r) => {
      const c = JSON.parse(r.content_json) as ChapterBody;
      return { summary: c.summary, example: c.example, topics: c.topics, analysis:c.analysis, blocks:c.blocks, advice:c.advice };
    }),
  };
  let responseReceived = false,
    persisted = !!current.raw_json;
  try {
    let raw = current.raw_json
      ? JSON.parse(current.raw_json)
      : await provider.generateChapter(input);
    if(raw && typeof raw==='object' && '__readingRepair' in raw) {
      if(!raw.repaired)throw new FortuneError('UNCERTAIN');
    }
    responseReceived = true;
    await db
      .prepare(
        "UPDATE fortune_chapters SET raw_json=? WHERE request_id=? AND chapter_id=? AND attempt_id=? AND status='generating' AND EXISTS(SELECT 1 FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.id=fortune_chapters.request_id AND e.status='ACTIVE')",
      )
      .bind(JSON.stringify(raw), id, current.chapter_id, token)
      .run();
    persisted = true;
    if (provider.receipt)
      await db
        .prepare(
          "UPDATE fortune_requests SET provider=?,model=?,prompt_version=? WHERE id=?",
        )
        .bind(
          provider.receipt.provider,
          provider.receipt.model,
          input.chapter.version===READING_VERSION?PROMPT_VERSION:"chapter-v2",
          id,
        )
        .run();
    let body:ChapterBody;
    const wasRepaired=!!raw?.__readingRepair;
    try { body=validateChapter(wasRepaired?raw.repaired:raw,input); }
    catch(error) {
      if(!(error instanceof FortuneError)||error.code!=='CHAPTER_TOO_SHORT'||input.chapter.version!==READING_VERSION||wasRepaired)throw error;
      // Save intent before the second call. A crash here has an unknown external outcome.
      const draft={__readingRepair:true,original:raw};
      await db.prepare("UPDATE fortune_chapters SET raw_json=? WHERE request_id=? AND chapter_id=? AND attempt_id=? AND status='generating'").bind(JSON.stringify(draft),id,current.chapter_id,token).run();
      const repaired=await provider.generateChapter({...input,repair:{code:'CHAPTER_TOO_SHORT'}});
      persisted=false;
      raw={...draft,repaired};
      await db.prepare("UPDATE fortune_chapters SET raw_json=? WHERE request_id=? AND chapter_id=? AND attempt_id=? AND status='generating'").bind(JSON.stringify(raw),id,current.chapter_id,token).run();
      persisted=true;
      body=validateChapter(repaired,input);
    }
    await db.batch([
      db
        .prepare(
          "UPDATE fortune_chapters SET content_json=?,status='completed',lease_until=NULL WHERE request_id=? AND chapter_id=? AND attempt_id=? AND status='generating' AND EXISTS(SELECT 1 FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.id=? AND e.status='ACTIVE')",
        )
        .bind(JSON.stringify(body), id, current.chapter_id, token, id),
      db
        .prepare("UPDATE fortune_outbox SET sent_at=NULL WHERE request_id=?")
        .bind(id),
    ]);
    return true;
  } catch (e) {
    const code =
      responseReceived && !persisted
        ? "UNCERTAIN"
        : e instanceof FortuneError
          ? e.code
          : "GENERATION_FAILED";
    if(code==='LLM_DAILY_BUDGET') {
      const tomorrow=Date.parse(new Date(Date.now()+9*3600000).toISOString().slice(0,10)+'T00:00:00+09:00')+86400000;
      await db.batch([
        db.prepare("UPDATE fortune_chapters SET status='pending',attempt_id=NULL,lease_until=NULL WHERE request_id=? AND chapter_id=? AND attempt_id=? AND status='generating'").bind(id,current.chapter_id,token),
        db.prepare("UPDATE fortune_requests SET status='PENDING',failure_code='LLM_DAILY_BUDGET',resume_after=? WHERE id=? AND EXISTS(SELECT 1 FROM entitlements e WHERE e.id=fortune_requests.entitlement_id AND e.status='ACTIVE')").bind(tomorrow,id)
      ]);
      return false;
    }
    await db.batch([
      db
        .prepare(
          "UPDATE fortune_chapters SET status='failed',failure_code=?,lease_until=NULL WHERE request_id=? AND chapter_id=? AND attempt_id=? AND status='generating' AND EXISTS(SELECT 1 FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.id=fortune_chapters.request_id AND e.status='ACTIVE')",
        )
        .bind(code, id, current.chapter_id, token),
      db
        .prepare(
          "UPDATE fortune_requests SET status=?,failure_code=? WHERE id=? AND EXISTS(SELECT 1 FROM fortune_chapters c WHERE c.request_id=fortune_requests.id AND c.attempt_id=? AND c.status='failed') AND EXISTS(SELECT 1 FROM entitlements e WHERE e.id=fortune_requests.entitlement_id AND e.status='ACTIVE')",
        )
        .bind(
          ["LLM_TIMEOUT", "UNCERTAIN"].includes(code) ? "UNCERTAIN" : "FAILED",
          code,
          id,
          token,
        ),
    ]);
    return false;
  }
}
async function finishBook(db: Database, id: string) {
  const { results } = await db
    .prepare(
      "SELECT content_json FROM fortune_chapters WHERE request_id=? ORDER BY ordinal",
    )
    .bind(id)
    .all<{ content_json: string }>();
  const chapters = results.map(
    (r) => JSON.parse(r.content_json) as ChapterBody,
  );
  if (!chapters.length) return;
  const contract=await db.prepare('SELECT manifest_json,tier FROM fortune_books WHERE request_id=?').bind(id).first<{manifest_json:string;tier:keyof typeof readingPolicies}>();
  if(contract && JSON.parse(contract.manifest_json)[0]?.version===READING_VERSION && chapters.reduce((n,c)=>n+bodyCharacterCount(c),0)<readingPolicies[contract.tier].minimum) {
    await db.prepare("UPDATE fortune_requests SET status='FAILED',failure_code='BOOK_TOO_SHORT' WHERE id=?").bind(id).run();
    await db.prepare('DELETE FROM fortune_outbox WHERE request_id=?').bind(id).run();
    return;
  }
  const summary = {
    title: "영냥이가 정리한 나의 운명서",
    summary: chapters.at(-1)!.summary,
    keywords: chapters
      .slice(0, 3)
      .flatMap((c) => c.topics)
      .slice(0, 3),
    strongest: chapters[0].summary,
    comment: chapters.at(-1)!.persona,
  };
  await db.batch([
    db
      .prepare("UPDATE fortune_books SET summary_json=? WHERE request_id=?")
      .bind(JSON.stringify(summary), id),
    db
      .prepare(
        "UPDATE fortune_requests SET status='SUCCEEDED',updated_at=? WHERE id=? AND NOT EXISTS(SELECT 1 FROM fortune_chapters WHERE request_id=? AND status!='completed') AND EXISTS(SELECT 1 FROM entitlements e WHERE e.id=fortune_requests.entitlement_id AND e.status='ACTIVE')",
      )
      .bind(Date.now(), id, id),
    db.prepare("DELETE FROM fortune_outbox WHERE request_id=?").bind(id),
  ]);
}

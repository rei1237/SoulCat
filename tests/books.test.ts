import {getProduct} from '../server/payments/catalog';
import { test } from "node:test";
import assert from "node:assert/strict";
import { database, seed, profile } from "./support/database";
import { chapterManifest } from "../server/fortune/book-contracts";
import { createChart } from "../server/fortune/charts";
import {
  prepareBook,
  runBookStep,
  bookStatus,
  readChapter,
  retryBook,
  saveProgress,
  deliverOutbox,
  recoverPaidBooks,
} from "../server/fortune/books";
import { createOrder, grantPaidOrder } from "../server/payments/orders";
import { MockChapterProvider } from "../server/providers/chapter";
import {
  createShare,
  publicSummary,
  revokeShare,
  shareHtml,
} from "../server/shares";
import { domains } from "../server/fortune";
import { messages } from "../server/fortune/shared/prompt";
import { calculateScreenSaju } from "../server/fortune/saju/runtime";
import {handleEdge} from '../server/edge';
import {
  _cdCivilDayPillar,
  _cdHourPillarFromDayStem,
  _applyTrueSolarTimeCorrection,
} from "../server/vendor/code-destiny/saju-runtime.js";
import { explanationFacts } from "../server/fortune/shared/privacy";
import { analyze } from "../server/fortune/analysis";
async function paid(tier = "mackerel") {
  const { db, sqlite } = database();
  seed(sqlite);
  const snapshot = await createChart(db, "alice", "p", {});
  const order = await createOrder(
    db,
    "alice",
    "saju_" + tier,
    "p",
    "test-idempotency-0001",
  );
  const env = { PORTONE_STORE_ID: "fixture", PORTONE_CHANNEL_KEY: "fixture" };
  await grantPaidOrder(
    db,
    order,
    {
      id: order.payment_id,
      status: "PAID",
      amount: { total: order.amount },
      currency: "KRW",
      storeId: "fixture",
      channel: { key: "fixture" },
    },
    env,
  );
  return { db, sqlite, snapshot, order };
}
test('share rendering reads assets from immutable Pages and fails closed on render errors',async()=>{
 const {db}=await paid();const r=await prepareBook(db,'alice','saju_mackerel','p',{});
 for(let i=0;i<6;i++)await runBookStep(db,r.id,new MockChapterProvider());
 const share=await createShare(db,'alice',r.id,{}),url='https://staging.code-destiny.com'+share.url+'/og.png';
 const env={DB:db,APP_ENV:'staging',PUBLIC_ORIGIN:'https://staging.code-destiny.com',SOULCAT_PAGES_ORIGIN:'https://1234abcd.soulcat.pages.dev',renderShare:async(_summary:unknown,_vertical:boolean,origin:string)=>{assert.equal(origin,'https://1234abcd.soulcat.pages.dev');return new Uint8Array([1]);}};
 assert.equal((await handleEdge(new Request(url),env,()=>{})).status,200);
 assert.equal((await handleEdge(new Request(url),{...env,renderShare:async()=>{throw Error('asset unavailable');}},()=>{})).status,503);
});
test("all four paid tiers restore their chart and keep locked chapters private", async () => {
  for (const tier of ["mackerel", "salmon", "flounder", "tuna"] as const) {
    const { db, snapshot } = await paid(tier);
    const r = await prepareBook(db, "alice", "saju_" + tier, "p", {});
    for (let i = 0; i < 72; i++)
      if (!(await runBookStep(db, r.id, new MockChapterProvider()))) break;
    const status = (await bookStatus(db, "alice", r.id))!;
    assert.equal(status.status, "SUCCEEDED");
    assert.equal(status.total, getProduct("saju_"+tier).chapterCount);
    assert.deepEqual(status.chart, JSON.parse(snapshot.chart_json));
    assert.ok(!JSON.stringify(status).includes("모의 해설"));
  }
});
test("paid order abandoned before generation is recovered by the server only once", async () => {
  const { db, sqlite, snapshot, order } = await paid();
  assert.equal(
    (
      sqlite
        .prepare("SELECT chart_id FROM order_chart_links WHERE order_id=?")
        .get(order.id) as { chart_id: string }
    ).chart_id,
    snapshot.id,
  );
  await recoverPaidBooks(db, {});
  await recoverPaidBooks(db, {});
  assert.equal(
    (
      sqlite.prepare("SELECT COUNT(*) n FROM fortune_books").get() as {
        n: number;
      }
    ).n,
    1,
  );
});
test("expired chapter with saved provider response recovers without a new call", async () => {
  const { db, sqlite } = await paid();
  const r = await prepareBook(db, "alice", "saju_mackerel", "p", {});
  await runBookStep(db, r.id, new MockChapterProvider());
  sqlite
    .prepare(
      "UPDATE fortune_chapters SET status='generating',content_json=NULL,lease_until=1 WHERE request_id=? AND chapter_id='mackerel-01'",
    )
    .run(r.id);
  let calls = 0;
  await runBookStep(db, r.id, {
    async generateChapter() {
      calls++;
      throw new Error("not allowed");
    },
  });
  assert.equal(calls, 0);
  assert.ok(await readChapter(db, "alice", r.id, "mackerel-01"));
});
test("all explanation contexts remove raw birth dates while retaining planetary positions", async () => {
  for (const d of ["saju", "ziwei", "sukuyo", "vedic"] as const) {
    const domain = domains[d];
    const context = await domain.calculate(
      domain.validateInput({ personA: profile, readingMode: "personal" }),
    );
    const clean = explanationFacts(context);
    const wire = JSON.stringify(clean);
    for (const key of [
      "birthPlace",
      "birthTimeContext",
      "solarYear",
      "utcIso",
      "lunarYear",
    ])
      assert.ok(!wire.includes(key), `${d}: ${key}`);
    if (d === "vedic") assert.ok(wire.includes("longitude"));
  }
});
test("agreement counts unique systems and preserves opposing evidence", () => {
  const contexts: any = {
    saju: {
      domain: "saju",
      facts: [{ id: "saju.t", label: "tenGods", value: { 정재: 4 } }],
    },
    ziwei: {
      domain: "ziwei",
      facts: [
        {
          id: "ziwei.p",
          label: "palaces",
          value: [
            { name: "재백궁", assistantStars: ["a", "b"], maleficStars: ["x"] },
          ],
        },
      ],
    },
    vedic: {
      domain: "vedic",
      facts: [
        {
          id: "vedic.p",
          label: "planets",
          value: [{ name: "Jupiter", house: 2 }],
        },
      ],
    },
  };
  const wealth = analyze(contexts).themes.find((t) => t.theme === "wealth")!;
  assert.equal(wealth.agreement, 3);
  assert.equal(wealth.confidence, "mixed");
});
test("tier manifests contain 5/13/30/70 distinct chapters and eight tuna parts", () => {
  for (const [tier, size] of [
    ["mackerel", 5],
    ["salmon", 13],
    ["flounder", 30],
    ["tuna", 70],
  ] as const) {
    const m = chapterManifest(tier);
    assert.equal(m.length, size);
    assert.equal(new Set(m.map((c) => c.id)).size, size);
    assert.equal(new Set(m.map((c) => c.title)).size, size);
  }
  assert.equal(new Set(chapterManifest("tuna").map((c) => c.part)).size, 8);
});
test("chart snapshot is private, stable, and never purchases or explains", async () => {
  const { db, sqlite } = database();
  seed(sqlite);
  const a = await createChart(db, "alice", "p", {}),
    b = await createChart(db, "alice", "p", {});
  assert.equal(a.id, b.id);
  assert.equal(a.chart_json, b.chart_json);
  assert.equal(
    (sqlite.prepare("SELECT COUNT(*) n FROM orders").get() as { n: number }).n,
    0,
  );
  await assert.rejects(createChart(db, "bob", "p", {}), /PROFILE_NOT_FOUND/);
});
test("full current chapter book survives failure and resumes without touching completed chapters", async () => {
  const { db, sqlite, snapshot } = await paid("tuna");
  const r = await prepareBook(db, "alice", "saju_tuna", "p", {});
  let calls = 0;
  const provider = {
    async generateChapter(
      input: Parameters<MockChapterProvider["generateChapter"]>[0],
    ) {
      calls++;
      return new MockChapterProvider().generateChapter(input);
    },
  };
  await Promise.all([
    runBookStep(db, r.id, provider),
    runBookStep(db, r.id, provider),
  ]);
  assert.equal(calls, 1);
  const first = await readChapter(db, "alice", r.id, "tuna-01");
  await runBookStep(db, r.id, new MockChapterProvider("tuna-02"));
  assert.equal((await bookStatus(db, "alice", r.id))!.completed, 1);
  await retryBook(db, "alice", r.id);
  for (let i = 0; i < 71; i++)
    if (!(await runBookStep(db, r.id, provider))) break;
  const book = (await bookStatus(db, "alice", r.id))!;
  assert.equal(book.status, "SUCCEEDED");
  assert.equal(book.completed, 12);
  assert.deepEqual(await readChapter(db, "alice", r.id, "tuna-01"), first);
  assert.deepEqual(book.chart, JSON.parse(snapshot.chart_json));
  assert.equal((await prepareBook(db, "alice", "saju_tuna", "p", {})).id, r.id);
  assert.equal(calls, 12);
  assert.equal(
    (sqlite.prepare("SELECT COUNT(*) n FROM orders").get() as { n: number }).n,
    1,
  );
  await assert.rejects(
    readChapter(db, "bob", r.id, "tuna-01"),
    /RESULT_NOT_FOUND/,
  );
  await saveProgress(db, "alice", r.id, "tuna-01");
  await saveProgress(db, "alice", r.id, "tuna-02");
  assert.equal((await bookStatus(db, "alice", r.id))!.progress.read.length, 2);
  const share = await createShare(db, "alice", r.id, {
    nickname: "<script>x</script>",
  });
  const summary = (await publicSummary(db, share.shareId))!;
  assert.ok(!JSON.stringify(summary).includes(profile.birthDate));
  assert.ok(!JSON.stringify(summary).includes("profile_id"));
  assert.ok(
    !shareHtml(summary, "https://example.test/share").includes("<script>"),
  );
  await revokeShare(db, "alice", share.shareId);
  assert.equal(await publicSummary(db, share.shareId), null);
});
test("timed out chapter never automatically makes a second external attempt", async () => {
  const { db } = await paid();
  const r = await prepareBook(db, "alice", "saju_mackerel", "p", {});
  const { FortuneError } = await import("../server/fortune/shared/contracts");
  await runBookStep(db, r.id, {
    async generateChapter() {
      throw new FortuneError("LLM_TIMEOUT");
    },
  });
  let calls = 0;
  await runBookStep(db, r.id, {
    async generateChapter() {
      calls++;
      throw new Error("must not run");
    },
  });
  assert.equal(calls, 0);
  assert.equal((await bookStatus(db, "alice", r.id))!.status, "UNCERTAIN");
});
test("outbox survives a failed send; lower tier cannot read tuna chapters", async () => {
  const { db } = await paid();
  const r = await prepareBook(db, "alice", "saju_mackerel", "p", {});
  await assert.rejects(
    deliverOutbox(db, {
      async send() {
        throw new Error("offline");
      },
    }),
  );
  let sends = 0;
  await deliverOutbox(db, {
    async send() {
      sends++;
    },
  });
  assert.equal(sends, 1);
  await assert.rejects(
    readChapter(db, "alice", r.id, "tuna-01"),
    /CHAPTER_NOT_READY/,
  );
});
test("raw birth profile cannot reach LLM messages", async () => {
  const d = domains.saju;
  const input = d.validateInput({ personA: profile, question: "일" });
  const c = await d.calculate(input);
  const wire = JSON.stringify(messages(d.buildPrompt(input, c, "mackerel")));
  assert.ok(!wire.includes(profile.birthDate));
  assert.ok(!wire.includes("birthPlace"));
  assert.ok(!wire.includes("USER_DATA"));
});
test("screen saju preserves original civil-day and longitude-corrected hour policies", () => {
  for (const date of ["1981-01-27", "1997-02-10", "2024-02-04"])
    for (const time of ["00:00", "00:30", "22:59", "23:00", "23:59"]) {
      const p = { ...profile, birthDate: date, birthTime: time };
      const r = calculateScreenSaju(p, new Date("2026-09-13T00:00:00Z"));
      const [year, month, day] = date.split("-").map(Number);
      const [hour, minute] = time.split(":").map(Number);
      const civil = _cdCivilDayPillar(year, month, day, hour)!;
      const correction = _applyTrueSolarTimeCorrection({
        year,
        month,
        day,
        hour,
        minute,
        longitude: profile.birthPlace.longitude,
        standardMeridian: 135,
      })!;
      const h = _cdHourPillarFromDayStem(civil.g, correction.correctedHour)!;
      assert.equal(r.dayPillar, civil.g + civil.j);
      assert.equal(r.hourPillar, h.g + h.j);
    }
});

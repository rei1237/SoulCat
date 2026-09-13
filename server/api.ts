import {customerFields, resolveCustomer} from './payments/customer';
import {counselInRoom} from './fortune/room-counsel';
import { verify as verifyWebhook } from '@portone/server-sdk/webhook';
import { reconcilePayment } from './payments/reconcile';
import { checkoutChannel } from './payments/portone';
import { stagingProductEnabled, requireStagingProduct, validationRun } from './payments/staging-access';
import { productBudgetReady } from './providers/budget';
import { safeReturnPath } from '../src/lib/return-path';
import {attendanceStatus,attend,unlockToday,requireDailyPass} from './fortune/free/attendance';
import {freeReading} from './fortune/free/readings';
import {searchPlaces} from './fortune/free/places';
import { Database } from "./db/types";
import { domains } from "./fortune";
import { DomainId, FortuneError } from "./fortune/shared/contracts";
import { prepareGeneration, runGeneration } from "./fortune/generation";
import { ProviderEnv, createProvider } from "./providers/provider-factory";
import { createOrder, grantPaidOrder } from "./payments/orders";
import { PaymentEnv, PaymentOrder, lookupPayment } from "./payments/portone";
import { getProduct, products } from "./payments/catalog";
import { AuthEnv, sharedUser, sharedIdentity } from "./auth";
import { createChart, purchaseContexts, chartView } from "./fortune/charts";
import {
  prepareBook,
  bookStatus,
  readChapter,
  saveProgress,
  retryBook,
  runBookStep,
  deliverOutbox,
  BookQueue,
} from "./fortune/books";
import {
  MockChapterProvider,
  StructuredChapterProvider,
} from "./providers/chapter";
import { createShare, revokeShare, listShares } from "./shares";
export interface Env extends ProviderEnv, PaymentEnv, AuthEnv {
  PLACE_SEARCH_ENDPOINT?: string;
  DB?: Database;
  APP_ENV?: string;
  KASI_SERVICE_KEY?: string;
  KASI_API_BASE_URL?: string;
  BOOK_QUEUE?: BookQueue;
}
const json = (data: unknown, status = 200, extra = {}) =>
  Response.json(data, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      ...extra,
    },
  });
async function hash(token: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function user(db: Database, request: Request) {
  const token = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)soulcat_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) throw new FortuneError("SESSION_REQUIRED", 401);
  const row = await db
    .prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?")
    .bind(await hash(token), Date.now())
    .first<{ user_id: string }>();
  if (!row) throw new FortuneError("SESSION_REQUIRED", 401);
  return row.user_id;
}
const messages: Record<string, string> = {
  CUSTOMER_REQUIRED:"결제에 필요한 누락 정보를 확인해 주세요.",
  STAGING_PAYMENT_LIMIT: "이번 결제수단의 검증 주문이 이미 있어요. 보관함에서 해당 주문을 확인해 주세요.",
  ANCHOVY_REQUIRED:'멸치가 부족해. 출석하고 한 마리 받아 와.',
  DAILY_PASS_REQUIRED:'멸치 한 마리를 건네면 오늘의 16가지 이야기를 열어줄게.',
  FREE_PROFILE_REQUIRED:'개인 운세를 계산할 출생 정보를 먼저 알려줘.',
  FREE_READING_PENDING:'같은 운세를 정리하고 있어요. 잠시 후 다시 읽어 주세요.',
  INVALID_CATEGORY:'운세 종류를 다시 선택해 주세요.',
  INVALID_LUNAR_DATE:'음력 날짜와 윤달 여부를 확인해 주세요.',
  INVALID_BIRTH_TIME:'시간은 0~23시, 분은 0~59 사이로 입력해 주세요.',
  INVALID_CALENDAR:'양력 또는 음력을 선택해 주세요.',
  PLACE_SEARCH_BUSY:'검색 요청이 잠시 몰렸어요. 잠깐 뒤 다시 눌러 주세요.',
  PLACE_SEARCH_UNAVAILABLE:'장소를 검색하지 못했어요. 잠시 후 다시 검색해 주세요.',
  INVALID_PLACE_QUERY:'장소 이름을 두 글자 이상 입력해 주세요.',
  PAYMENT_CHECK_BUSY:'결제 상태를 확인하고 있어요. 잠시 후 다시 확인해 주세요.',
  CHECKOUT_METHOD_LOCKED:'진행 중인 주문의 결제수단이 달라요. 보관함에서 기존 결제 상태를 먼저 확인해 주세요.',
  LLM_TEST_BUDGET:'테스트 예산을 모두 사용했어요. 구매 권리와 완료된 챕터는 보관되어 있어요.',
  LLM_DAILY_BUDGET:'테스트 생성이 잠시 대기 중이에요. 구매 권리는 보관되어 있어요.',
  LLM_BUDGET_NOT_CONFIGURED:'상담 연결을 준비하고 있어요. 아직 구매할 수 없어요.',
  PRODUCT_LLM_UNVERIFIED:'이 상담의 제공 준비를 확인하고 있어요. 아직 구매할 수 없어요.',
  LLM_NOT_CONFIGURED:'상담 연결을 준비하고 있어요. 잠시 후 다시 확인해 주세요.',

  PREMIUM_PERSONAL_ONLY:'참치 운명서는 개인 본명숙을 사용해요. 분석 범위를 나의 본명숙으로 바꾸고 차트를 다시 확인해 주세요.',
  SESSION_REQUIRED: "Code Destiny 로그인 후 다시 확인해 주세요.",
  AUTH_UNAVAILABLE:
    "로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
  ENTITLEMENT_REQUIRED:
    "확인된 구매 내역이 없어요. 결제 내역을 먼저 확인해 주세요.",
  PAYMENTS_UNAVAILABLE: "결제 연결을 준비하고 있어요. 아직 구매할 수 없어요.",
  BIRTH_TIME_REQUIRED:
    "이 운세에는 출생시간이 필요해요. 모르는 시간을 임의로 넣지 마세요.",
  INVALID_BIRTH_DATE: "생년월일이 실제 날짜인지 확인해 주세요.",
  PREMIUM_BIRTH_REQUIRED:
    "광어·참치에는 출생시간, 출생지와 계산에 필요한 성별 정보가 필요해요. 출생정보를 먼저 확인해 주세요.",
  SAJU_KST_REQUIRED:
    "현재 사주 원국은 한국 표준시 출생을 지원해요. 다른 지역을 임의로 한국 시각에 대입하지 마세요.",
  CALENDAR_REFERENCE_MISMATCH:
    "달력 기준을 확인하고 있어요. 차트가 확인되기 전에는 구매를 진행하지 않아요.",
  BIRTH_PLACE_REQUIRED: "출생지 좌표와 시간대를 확인해 주세요.",
  AMBIGUOUS_BIRTH_TIME: "일광절약시간 경계에 해당해 출생시각 확인이 필요해요.",
};
export async function handleApi(
  request: Request,
  env: Env,
  waitUntil: (task: Promise<unknown>) => void,
) {
  try {
    const url = new URL(request.url);
    const path = url.pathname
      .replace(/^\/api\/(?:yeongnyangi\/)?/, "")
      .replace(/\/$/, "");
    if (path === "products" && request.method === "GET") {
      let catalogUser: string | undefined;
      if (env.APP_ENV === 'staging' && env.PAYMENTS_ENABLED === 'true') {
        try { catalogUser = await sharedUser(request, env); }
        catch (error) { if (!(error instanceof FortuneError) || error.code !== 'SESSION_REQUIRED') throw error; }
      }
      return json({
        products: products.map(product => ({...product, enabled: stagingProductEnabled(env, catalogUser, product.id)})),
        mode:
          env.APP_ENV === "local" && env.LLM_PROVIDER === "mock"
            ? "local-mock"
            : "preview",
      });
    }
    if (!env.DB) throw new FortuneError("DATABASE_NOT_CONFIGURED", 503);
    const db = env.DB;
    if(path==='places'&&request.method==='GET')return json({places:await searchPlaces(db,url.searchParams.get('q')||'',env.PLACE_SEARCH_ENDPOINT)});
    let body: Record<string, unknown> = {};
    let rawBody = "";
    if (request.method === "POST") {
      if (
        path !== "payments/webhook" &&
        request.headers.get("origin") !== url.origin
      )
        throw new FortuneError("INVALID_ORIGIN", 403);
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        throw new FortuneError("INVALID_CONTENT_TYPE", 415);
      const raw = await request.text();
      rawBody = raw;
      if (raw.length > 10000) throw new FortuneError("REQUEST_TOO_LARGE", 413);
      try {
        body = JSON.parse(raw);
      } catch {
        throw new FortuneError("INVALID_JSON");
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new FortuneError("INVALID_JSON");
    }
    if (path === "session" && request.method === "POST") {
      if (env.APP_ENV !== "local") {
        const identity = await sharedIdentity(request, env);
        const id = identity.userId;
        await db
          .prepare(
            "INSERT INTO users (id,created_at) VALUES (?,?) ON CONFLICT(id) DO NOTHING",
          )
          .bind(id, Date.now())
          .run();
        return json({ userId: id, displayName: identity.displayName });
      }
      if (env.LLM_PROVIDER !== "mock" || env.ALLOW_LIVE_LLM === "true") throw new FortuneError("AUTH_UNAVAILABLE",503);
      // Temporary identity is available only in explicit local mock runs.
      try {
        return json({ userId: await user(db, request) });
      } catch (e) {
        if (!(e instanceof FortuneError) || e.code !== "SESSION_REQUIRED")
          throw e;
      }
      const id = crypto.randomUUID();
      const token = [...crypto.getRandomValues(new Uint8Array(32))]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      await db.batch([
        db
          .prepare("INSERT INTO users (id,created_at) VALUES (?,?)")
          .bind(id, Date.now()),
        db
          .prepare(
            "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)",
          )
          .bind(await hash(token), id, Date.now() + 86400000),
      ]);
      return json({ userId: id }, 201, {
        "set-cookie": `soulcat_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${url.protocol === "https:" ? "; Secure" : ""}`,
      });
    }
    if (path === "payments/webhook" && request.method === "POST") {
      if (!env.PORTONE_WEBHOOK_SECRET) throw new FortuneError('PAYMENTS_UNAVAILABLE',503);
      try { await verifyWebhook(env.PORTONE_WEBHOOK_SECRET,rawBody,Object.fromEntries(request.headers)); }
      catch { throw new FortuneError('INVALID_WEBHOOK',401); }
      const eventId=request.headers.get('webhook-id') || '';
      if(!eventId || eventId.length>200) throw new FortuneError('INVALID_WEBHOOK',401);
      const seen=await db.prepare('SELECT completed_at FROM payment_webhooks WHERE id=?').bind(eventId).first<{completed_at:number|null}>();
      if(seen?.completed_at) return json({ok:true});
      const paymentId=(body.data as {paymentId?:unknown}|undefined)?.paymentId;
      if(typeof paymentId!=='string'||!/^soulcat-[a-zA-Z0-9-]{1,80}$/.test(paymentId)) throw new FortuneError('INVALID_PAYMENT_ID');
      const order=await db.prepare('SELECT * FROM orders WHERE payment_id=?').bind(paymentId).first<PaymentOrder>();
      if(!order) return json({ok:true});
      const updated=await reconcilePayment(db,order,env);
      if(updated.status==='PAID') await prepareBook(db,updated.user_id,updated.product_id,updated.profile_id,{});
      await db.prepare('INSERT INTO payment_webhooks(id,completed_at) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET completed_at=excluded.completed_at').bind(eventId,Date.now()).run();
      return json({ok:true});
    }
    const identity = env.APP_ENV === "local" ? {userId:await user(db,request),displayName:"",customer:{}} : await sharedIdentity(request,env);
    const userId=identity.userId;
    if(path === "checkout/customer" && request.method === "GET") return json({missingFields:customerFields(identity.customer)});
    const engineEnv = {
      SWISS_EPHEMERIS_FILES_BASE_URL: `${url.origin}/_soulcat/ephe/`,
      ...(env.KASI_SERVICE_KEY
        ? {
            KASI_SERVICE_KEY: env.KASI_SERVICE_KEY,
            KASI_API_BASE_URL: env.KASI_API_BASE_URL || "",
          }
        : {}),
    };
    if(path==='attendance'&&request.method==='GET')return json(await attendanceStatus(db,userId));
    if(path==='attendance'&&request.method==='POST')return json(await attend(db,userId));
    if(path==='free/unlock'&&request.method==='POST')return json(await unlockToday(db,userId));
    if(path==='free/reading'&&request.method==='POST')return json(await freeReading(db,userId,String(body.category||''),body,engineEnv));
    if(path==='free/reading'&&request.method==='GET') {
      const {day}=await requireDailyPass(db,userId);
      const row=await db.prepare('SELECT result_json FROM free_readings WHERE user_id=? AND day=? AND category=?').bind(userId,day,url.searchParams.get('category')||'basic').first<{result_json:string|null}>();
      return json({result:row?.result_json?JSON.parse(row.result_json):null});
    }
    if(path==='daily'&&request.method==='GET'){
      const {day}=await requireDailyPass(db,userId);
      const row=await db.prepare('SELECT result_json FROM free_readings WHERE user_id=? AND day=? AND category=?').bind(userId,day,url.searchParams.get('domain')||'saju').first<{result_json:string|null}>();
      return json({result:row?.result_json?JSON.parse(row.result_json):null});
    }
    if(path==='profiles'&&request.method==='GET'){
      const rows=await db.prepare('SELECT id,domain,created_at FROM profiles WHERE user_id=? ORDER BY created_at DESC LIMIT 40').bind(userId).all();return json({profiles:rows.results});
    }
    const dispatchBook = async (id: string) => {
      if (env.APP_ENV === "local" && env.LLM_PROVIDER === "mock") {
        waitUntil(
          (async () => {
            const count=await db.prepare('SELECT COUNT(*) n FROM fortune_chapters WHERE request_id=?').bind(id).first<{n:number}>();
            for (let i = 0; i <= (count?.n||0); i++)
              if (!(await runBookStep(db, id, new MockChapterProvider())))
                break;
          })(),
        );
      } else if (env.BOOK_QUEUE) await deliverOutbox(db, env.BOOK_QUEUE);
    };
    if (path === "charts" && request.method === "POST") {
      if (body.productId) {
        const p=getProduct(body.productId);
        const {snapshot,contexts}=await purchaseContexts(db,userId,String(body.profileId),p.domain,p.fishId,engineEnv);
        return json({id:snapshot.id,chart:JSON.parse(snapshot.chart_json),charts:Object.values(contexts).map(c=>c!.domain===snapshot.domain?JSON.parse(snapshot.chart_json):chartView(c!))});
      }
      const snapshot = await createChart(
        db,
        userId,
        String(body.profileId),
        engineEnv,
      );
      return json({ id: snapshot.id, chart: JSON.parse(snapshot.chart_json) });
    }
    if (path === "fortune/chapter" && request.method === "GET")
      return json(
        await readChapter(
          db,
          userId,
          url.searchParams.get("id") || "",
          url.searchParams.get("chapter") || "",
        ),
      );
    if (path === "fortune/search" && request.method === "GET") {
      const id = url.searchParams.get("id") || "",
        q = (url.searchParams.get("q") || "").slice(0, 80).toLowerCase();
      const book = await bookStatus(db, userId, id);
      if (!book) throw new FortuneError("RESULT_NOT_FOUND", 404);
      const rows = await db
        .prepare(
          "SELECT chapter_id,content_json FROM fortune_chapters WHERE request_id=? AND status='completed'",
        )
        .bind(id)
        .all<{ chapter_id: string; content_json: string }>();
      return json({
        ids: book.chapters
          .filter(
            (c) =>
              c.title.toLowerCase().includes(q) ||
              rows.results.some(
                (r) =>
                  r.chapter_id === c.id &&
                  r.content_json.toLowerCase().includes(q),
              ),
          )
          .map((c) => c.id),
      });
    }
    if (path === "fortune/progress" && request.method === "POST") {
      await saveProgress(
        db,
        userId,
        String(body.requestId),
        String(body.chapterId),
      );
      return json({ ok: true });
    }
    if (path === "shares" && request.method === "POST")
      return json(
        await createShare(db, userId, String(body.requestId), body),
        201,
      );
    if (path === "shares" && request.method === "GET")
      return json({
        shares: await listShares(db, userId, url.searchParams.get("id") || ""),
      });
    if (path === "shares/revoke" && request.method === "POST") {
      await revokeShare(db, userId, String(body.shareId));
      return json({ ok: true });
    }
    if (path === "profiles" && request.method === "POST") {
      const domain = body.domain;
      if (typeof domain !== "string" || !Object.hasOwn(domains, domain))
        throw new FortuneError("INVALID_DOMAIN");
      const input = domains[domain as DomainId].validateInput(body.input);
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO profiles (id,user_id,domain,input_json,created_at) VALUES (?,?,?,?,?)",
        )
        .bind(id, userId, domain, JSON.stringify(input), Date.now())
        .run();
      return json({ id }, 201);
    }
    if (path === "orders" && request.method === "POST") {
      if (env.PAYMENTS_ENABLED !== "true")
        throw new FortuneError("PAYMENTS_UNAVAILABLE", 503);
      requireStagingProduct(env, userId, String(body.productId));
      if (
        Object.keys(body).some(
          (k) => !["productId", "profileId", "idempotencyKey", "payMethod", "returnPath", "customer"].includes(k),
        )
      )
        throw new FortuneError("INVALID_ORDER_FIELDS");
      const customer=resolveCustomer(identity.customer,body.customer);
      const product = getProduct(body.productId);
      const channel=checkoutChannel(env,body.payMethod);
      if(env.LLM_PROVIDER!=='gemini'||env.ALLOW_LIVE_LLM!=='true'||!env.GEMINI_API_KEY||!env.BOOK_QUEUE) throw new FortuneError('LLM_NOT_CONFIGURED',503);
      productBudgetReady(env,product.id,product.chapterCount);
      await purchaseContexts(
        db,
        userId,
        String(body.profileId),
        product.domain,
        product.fishId,
        engineEnv,
      );
      const order = await createOrder(
        db,
        userId,
        String(body.productId),
        String(body.profileId),
        String(body.idempotencyKey),
        {storeId:env.PORTONE_STORE_ID!,channelKey:channel,method:String(body.payMethod),returnPath:safeReturnPath(body.returnPath),validationRun},
      );
      if(order.status==='PAID') {
        const pending=await prepareBook(db,userId,order.product_id,order.profile_id,engineEnv);
        await dispatchBook(pending.id);
        return json({status:'PAID',requestId:pending.id});
      }
      if(order.status!=='PENDING'||!order.store_id||!order.channel_key) throw new FortuneError('ORDER_NOT_PAYABLE',409);
      if(order.pay_method!==body.payMethod) throw new FortuneError('CHECKOUT_METHOD_LOCKED',409);
      const redirect=new URL(safeReturnPath(order.return_path),url.origin);
      redirect.searchParams.set('orderId',order.id);
      redirect.searchParams.set('paymentId',order.payment_id);
      return json({orderId:order.id,paymentId:order.payment_id,productId:order.product_id,profileId:order.profile_id,returnPath:order.return_path,
        payment:{customer,storeId:order.store_id,channelKey:order.channel_key,paymentId:order.payment_id,orderName:product.name+' '+product.fishName,totalAmount:order.amount,currency:'CURRENCY_KRW',
          payMethod:order.pay_method==='CARD'?'CARD':'EASY_PAY',...(order.pay_method==='CARD'?{bypass:{inicis_v2:{acceptmethod:['noeasypay'],P_RESERVED:['noeasypay=Y']}}}:{}),...(order.pay_method==='KAKAOPAY'?{easyPay:{easyPayProvider:'KAKAOPAY'}}:{}),noticeUrls:[`${url.origin}/api/yeongnyangi/payments/webhook`],redirectUrl:redirect.href}});
    }
    if (path === "testing/purchase" && request.method === "POST") {
      if (env.APP_ENV !== "local" || env.LLM_PROVIDER !== "mock")
        throw new FortuneError("NOT_FOUND", 404);
      const chart = await db
        .prepare(
          "SELECT id FROM chart_snapshots WHERE profile_id=? AND user_id=?",
        )
        .bind(String(body.profileId), userId)
        .first();
      if (chart) {
        const p = getProduct(body.productId);
        await purchaseContexts(
          db,
          userId,
          String(body.profileId),
          p.domain,
          p.fishId,
          engineEnv,
        );
      }
      const order = await createOrder(
        db,
        userId,
        String(body.productId),
        String(body.profileId),
        String(body.idempotencyKey),
      );
      // Server-authored local fixture; never accepts a client price or paid status.
      const config = {
        PORTONE_STORE_ID: "local-fixture",
        PORTONE_CHANNEL_KEY: "local-fixture",
      };
      await grantPaidOrder(
        db,
        order,
        {
          id: order.payment_id,
          status: "PAID",
          amount: { total: order.amount },
          currency: "KRW",
          storeId: "local-fixture",
          channel: { key: "local-fixture" },
        },
        config,
      );
      return json({ orderId: order.id, mode: "local-mock" });
    }
    if (path === "payments/verify" && request.method === "POST") {
      const order = await db
        .prepare("SELECT * FROM orders WHERE id=? AND user_id=?")
        .bind(String(body.orderId), userId)
        .first<PaymentOrder>();
      if (!order) throw new FortuneError("ORDER_NOT_FOUND", 404);
      if(body.paymentId!==order.payment_id) throw new FortuneError('PAYMENT_MISMATCH',409);
      const updated=await reconcilePayment(db,order,env);
      if(updated.status!=='PAID') return json({status:updated.pg_status || updated.status});
      const pending=await prepareBook(db,userId,updated.product_id,updated.profile_id,engineEnv);
      await dispatchBook(pending.id);
      return json({status:'PAID',requestId:pending.id,productId:updated.product_id,profileId:updated.profile_id,returnPath:updated.return_path});
    }
    if(path==='orders' && request.method==='GET') {
      const rows=await db.prepare('SELECT id,payment_id,product_id,profile_id,status,pg_status,return_path FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(userId).all();
      return json({orders:rows.results});
    }
    if (path === "fortune/generate" && request.method === "POST") {
      if (
        Object.keys(body).some((k) => !["productId", "profileId"].includes(k))
      )
        throw new FortuneError("INVALID_GENERATION_FIELDS");
      const snapshot = await db
        .prepare(
          "SELECT id FROM chart_snapshots WHERE profile_id=? AND user_id=?",
        )
        .bind(String(body.profileId), userId)
        .first();
      if (snapshot) {
        const pending = await prepareBook(
          db,
          userId,
          String(body.productId),
          String(body.profileId),
          engineEnv,
        );
        await dispatchBook(pending.id);
        return json(pending, 202);
      }
      const pending = await prepareGeneration(
        db,
        userId,
        String(body.productId),
        String(body.profileId),
      );
      waitUntil(
        runGeneration(db, pending.id, createProvider(env, {db,requestId:pending.id}), {
          SWISS_EPHEMERIS_FILES_BASE_URL: `${url.origin}/_soulcat/ephe/`,
        }),
      );
      return json(pending, 202);
    }
    if (path === "fortune/status" && request.method === "GET") {
      const id = url.searchParams.get("id");
      const book = await bookStatus(db, userId, id || "");
      if (book)
        return json({ book, status: book.status, retryable: book.retryable });
      const row = await db
        .prepare(
          "SELECT r.status,r.lease_until,f.structured_result FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id LEFT JOIN fortune_results f ON f.request_id=r.id WHERE r.id=? AND r.user_id=? AND e.status='ACTIVE'",
        )
        .bind(id, userId)
        .first<{
          status: string;
          lease_until: number;
          structured_result?: string;
        }>();
      if (!row) throw new FortuneError("RESULT_NOT_FOUND", 404);
      const stale = row.status === "RUNNING" && row.lease_until < Date.now();
      return json({
        status: stale ? "UNCERTAIN" : row.status,
        retryable: row.status === "FAILED",
        result: row.structured_result
          ? JSON.parse(row.structured_result)
          : null,
        ...(["FAILED", "UNCERTAIN"].includes(row.status) || stale
          ? {
              message:
                "상담을 마치지 못했지만 구매 권리는 보관되어 있어요. 다시 결제하지 마세요.",
            }
          : {}),
      });
    }
    if (path === "fortune/retry" && request.method === "POST") {
      const book = await bookStatus(db, userId, String(body.requestId));
      if (book) {
        await retryBook(db, userId, String(body.requestId));
        await dispatchBook(String(body.requestId));
        return json({ id: body.requestId }, 202);
      }
      const row = await db
        .prepare(
          "SELECT r.id FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.id=? AND r.user_id=? AND r.status='FAILED' AND e.status='ACTIVE'",
        )
        .bind(String(body.requestId), userId)
        .first<{ id: string }>();
      if (!row) throw new FortuneError("RETRY_UNAVAILABLE", 409);
      waitUntil(
        runGeneration(db, row.id, createProvider(env, {db,requestId:row.id}), {
          SWISS_EPHEMERIS_FILES_BASE_URL: `${url.origin}/_soulcat/ephe/`,
        }),
      );
      return json({ id: row.id }, 202);
    }
    if(path==='room/counsel' && request.method==='POST')return json(await counselInRoom(db,userId,body,env));
    if (path === "library" && request.method === "GET") {
      const { results } = await db
        .prepare(
          "SELECT r.id,r.domain,r.product_id,r.status,r.created_at FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.user_id=? AND e.status='ACTIVE' ORDER BY r.created_at DESC LIMIT 100",
        )
        .bind(userId)
        .all();
      return json({ results:results.map((r:any)=>({...r,packageName:getProduct(r.product_id).fishName,image:getProduct(r.product_id).image,name:getProduct(r.product_id).name})) });
    }
    throw new FortuneError("NOT_FOUND", 404);
  } catch (e) {
    const known = e instanceof FortuneError;
    const code = known ? e.code : "INTERNAL_ERROR";
    return json(
      {
        ok: false,
        code,
        message:
          messages[code] ||
          "상담 준비를 마치지 못했어요. 입력과 연결 상태를 확인해 주세요.",
      },
      known ? e.status : 500,
    );
  }
}

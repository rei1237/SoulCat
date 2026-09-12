import { Database } from "./db/types";
import { domains } from "./fortune";
import { DomainId, FortuneError } from "./fortune/shared/contracts";
import { prepareGeneration, runGeneration } from "./fortune/generation";
import { ProviderEnv, createProvider } from "./providers/provider-factory";
import { createOrder, grantPaidOrder } from "./payments/orders";
import { PaymentEnv, PaymentOrder, lookupPayment } from "./payments/portone";
import { getProduct } from "./payments/catalog";
export interface Env extends ProviderEnv, PaymentEnv {
  DB?: Database;
  APP_ENV?: string;
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
  SESSION_REQUIRED: "이 브라우저의 보관함 연결이 필요해요. 다시 시작해 주세요.",
  ENTITLEMENT_REQUIRED:
    "확인된 구매 내역이 없어요. 결제 내역을 먼저 확인해 주세요.",
  PAYMENTS_UNAVAILABLE: "결제 연결을 준비하고 있어요. 아직 구매할 수 없어요.",
  BIRTH_TIME_REQUIRED:
    "이 운세에는 출생시간이 필요해요. 모르는 시간을 임의로 넣지 마세요.",
  INVALID_BIRTH_DATE: "생년월일이 실제 날짜인지 확인해 주세요.",
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
    const path = url.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
    if (!env.DB) throw new FortuneError("DATABASE_NOT_CONFIGURED", 503);
    const db = env.DB;
    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      if (
        path !== "payments/webhook" &&
        request.headers.get("origin") !== url.origin
      )
        throw new FortuneError("INVALID_ORIGIN", 403);
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        throw new FortuneError("INVALID_CONTENT_TYPE", 415);
      const raw = await request.text();
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
      // Temporary browser-bound preview identity; never presented as social login.
      if (env.APP_ENV !== "local")
        throw new FortuneError("AUTH_INTEGRATION_PENDING", 503);
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
      // Untrusted webhook is only a lookup hint. Never trust its reported status.
      const paymentId = (body.data as { paymentId?: unknown } | undefined)
        ?.paymentId;
      if (typeof paymentId !== "string" || paymentId.length > 100)
        throw new FortuneError("INVALID_PAYMENT_ID");
      const order = await db
        .prepare("SELECT * FROM orders WHERE payment_id=?")
        .bind(paymentId)
        .first<PaymentOrder>();
      if (!order) return json({ ok: true });
      const pg = await lookupPayment(order, env);
      if (pg.status === "CANCELLED" || pg.status === "PARTIAL_CANCELLED") {
        if (pg.id !== order.payment_id || pg.storeId !== env.PORTONE_STORE_ID)
          throw new FortuneError("PAYMENT_MISMATCH", 409);
        await db.batch([
          db
            .prepare("UPDATE orders SET status='REFUNDED' WHERE id=?")
            .bind(order.id),
          db
            .prepare(
              "UPDATE entitlements SET status='REVOKED' WHERE order_id=?",
            )
            .bind(order.id),
        ]);
      } else if (pg.status === "PAID") await grantPaidOrder(db, order, pg, env);
      return json({ ok: true });
    }
    const userId = await user(db, request);
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
      if (!getProduct(body.productId).enabled)
        throw new FortuneError("PAYMENTS_UNAVAILABLE", 503);
      if (
        Object.keys(body).some(
          (k) => !["productId", "profileId", "idempotencyKey"].includes(k),
        )
      )
        throw new FortuneError("INVALID_ORDER_FIELDS");
      const order = await createOrder(
        db,
        userId,
        String(body.productId),
        String(body.profileId),
        String(body.idempotencyKey),
      );
      return json({
        order,
        storeId: env.PORTONE_STORE_ID,
        channelKey: env.PORTONE_CHANNEL_KEY,
      });
    }
    if (path === "testing/purchase" && request.method === "POST") {
      if (env.APP_ENV !== "local" || env.LLM_PROVIDER !== "mock")
        throw new FortuneError("NOT_FOUND", 404);
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
      await grantPaidOrder(db, order, await lookupPayment(order, env), env);
      return json({ ok: true });
    }
    if (path === "fortune/generate" && request.method === "POST") {
      if (
        Object.keys(body).some((k) => !["productId", "profileId"].includes(k))
      )
        throw new FortuneError("INVALID_GENERATION_FIELDS");
      const pending = await prepareGeneration(
        db,
        userId,
        String(body.productId),
        String(body.profileId),
      );
      waitUntil(
        runGeneration(db, pending.id, createProvider(env), {
          SWISS_EPHEMERIS_FILES_BASE_URL: `${url.origin}/ephe/`,
        }),
      );
      return json(pending, 202);
    }
    if (path === "fortune/status" && request.method === "GET") {
      const id = url.searchParams.get("id");
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
      const row = await db
        .prepare(
          "SELECT r.id FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.id=? AND r.user_id=? AND r.status='FAILED' AND e.status='ACTIVE'",
        )
        .bind(String(body.requestId), userId)
        .first<{ id: string }>();
      if (!row) throw new FortuneError("RETRY_UNAVAILABLE", 409);
      waitUntil(
        runGeneration(db, row.id, createProvider(env), {
          SWISS_EPHEMERIS_FILES_BASE_URL: `${url.origin}/ephe/`,
        }),
      );
      return json({ id: row.id }, 202);
    }
    if (path === "library" && request.method === "GET") {
      const { results } = await db
        .prepare(
          "SELECT r.id,r.domain,r.status,r.created_at FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.user_id=? AND e.status='ACTIVE' ORDER BY r.created_at DESC LIMIT 100",
        )
        .bind(userId)
        .all();
      return json({ results });
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

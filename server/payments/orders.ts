import { Database } from "../db/types";
import { FortuneError } from "../fortune/shared/contracts";
import { getProduct } from "./catalog";
import {
  PaymentOrder,
  VerifiedPayment,
  PaymentEnv,
  verifyPayment,
} from "./portone";
// 이미 권리가 살아 있는 주문(PAID + ACTIVE entitlement) — 같은 프로필·상품은 다시 결제하지 않는다.
export async function findPaidOrder(db: Database, userId: string, productId: string, profileId: string) {
  return db.prepare("SELECT o.* FROM orders o JOIN entitlements e ON e.order_id=o.id WHERE o.user_id=? AND o.product_id=? AND o.profile_id=? AND o.status='PAID' AND e.status='ACTIVE' ORDER BY o.created_at LIMIT 1").bind(userId,productId,profileId).first<PaymentOrder>();
}
export async function createOrder(
  db: Database,
  userId: string,
  productId: string,
  profileId: string,
  key: string,
  checkout?: { storeId: string; channelKey: string; method: string; returnPath: string; validationRun?: string },
) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key))
    throw new FortuneError("INVALID_IDEMPOTENCY_KEY");
  const p = getProduct(productId);
  const profile = await db
    .prepare("SELECT id,domain,input_json FROM profiles WHERE id=? AND user_id=?")
    .bind(profileId, userId)
    .first<{ id: string; domain: string;input_json:string }>();
  if (!profile || profile.domain !== p.domain)
    throw new FortuneError("PROFILE_NOT_FOUND", 404);
  const keyed=await db.prepare('SELECT * FROM orders WHERE user_id=? AND idempotency_key=?').bind(userId,key).first<PaymentOrder>();
  if(keyed && (keyed.product_id!==productId||keyed.profile_id!==profileId))throw new FortuneError('IDEMPOTENCY_CONFLICT',409);
  const purchased=await findPaidOrder(db,userId,productId,profileId);
  if(purchased)return purchased;
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO orders (id,user_id,profile_id,product_id,amount,currency,payment_id,idempotency_key,status,created_at,store_id,channel_key,pay_method,return_path,staging_validation_run) VALUES (?,?,?,?,?,?,?,?,'PENDING',?,?,?,?,?,?) ON CONFLICT DO NOTHING",
    )
    .bind(
      id,
      userId,
      profileId,
      p.id,
      p.priceKRW,
      "KRW",
      `soulcat-${id}`,
      key,
      Date.now(),
      checkout?.storeId ?? null, checkout?.channelKey ?? null, checkout?.method ?? null, checkout?.returnPath ?? null,
      checkout?.validationRun ?? null,
    )
    .run();
  const order = await db
    .prepare("SELECT * FROM orders WHERE user_id=? AND (idempotency_key=? OR (profile_id=? AND product_id=? AND store_id IS NOT NULL AND status IN ('PENDING','PAID'))) ORDER BY created_at LIMIT 1")
    .bind(userId, key, profileId, productId)
    .first<PaymentOrder>();
  if (
    !order ||
    order.product_id !== productId ||
    order.profile_id !== profileId
  )
    throw new FortuneError(checkout?.validationRun ? "STAGING_PAYMENT_LIMIT" : "IDEMPOTENCY_CONFLICT", 409);
  await db.prepare('INSERT INTO order_chart_links (order_id,chart_id,manifest_version) SELECT ?,id,? FROM chart_snapshots WHERE profile_id=? AND user_id=? ON CONFLICT DO NOTHING').bind(order.id,p.manifestVersion,profileId,userId).run();
  await db.prepare('INSERT INTO order_specs (order_id,spec_json) VALUES (?,?) ON CONFLICT DO NOTHING').bind(order.id,JSON.stringify({...p,topicId:JSON.parse(profile.input_json).topicId||'general'})).run();
  return order;
}
export async function grantPaidOrder(
  db: Database,
  order: PaymentOrder,
  payment: VerifiedPayment,
  env: PaymentEnv,
) {
  verifyPayment(payment, order, env);
  // D1 batch is transactional; order and entitlement can never be half-granted.
  await db.batch([
    db
      .prepare(
        "INSERT INTO payments (id,order_id,amount,currency,status,verified_at) VALUES (?,?,?,?,'PAID',?) ON CONFLICT(id) DO NOTHING",
      )
      .bind(payment.id, order.id, order.amount, order.currency, Date.now()),
    db
      .prepare(
        "UPDATE orders SET status='PAID' WHERE id=? AND status IN ('PENDING','PAID')",
      )
      .bind(order.id),
    db
      .prepare(
        "INSERT INTO entitlements (id,order_id,user_id,product_id,status,created_at) SELECT ?,id,user_id,product_id,'ACTIVE',? FROM orders WHERE id=? AND status='PAID' ON CONFLICT(order_id) DO NOTHING",
      )
      .bind(`ent-${order.id}`, Date.now(), order.id),
  ]);
}
// Code Destiny 단건 결제 증빙으로 권리를 준다. 소유자·상태 검증은 CD 가 했고, 이 워커는 금액을 대조한 뒤 증빙 id 를 결제 행으로 남긴다.
// PortOne 검증(grantPaidOrder)과 같은 D1 batch 라 주문·권리가 반쯤 부여되는 일은 없다.
export async function grantProofOrder(db: Database, order: PaymentOrder, proofId: string, amountKRW: number) {
  if (!/^[a-zA-Z0-9_:-]{1,120}$/.test(proofId)) throw new FortuneError("PAYMENT_PROOF_INVALID", 409);
  if (order.status !== "PENDING" && order.status !== "PAID") throw new FortuneError("ORDER_NOT_PAYABLE", 409);
  if (amountKRW !== order.amount || order.currency !== "KRW") throw new FortuneError("PAYMENT_AMOUNT_MISMATCH", 409);
  await db.batch([
    db.prepare("INSERT INTO payments (id,order_id,amount,currency,status,verified_at) VALUES (?,?,?,?,'PAID',?) ON CONFLICT(id) DO NOTHING").bind(`cd:${proofId}`, order.id, order.amount, order.currency, Date.now()),
    db.prepare("UPDATE orders SET status='PAID' WHERE id=? AND status IN ('PENDING','PAID')").bind(order.id),
    db.prepare("INSERT INTO entitlements (id,order_id,user_id,product_id,status,created_at) SELECT ?,id,user_id,product_id,'ACTIVE',? FROM orders WHERE id=? AND status='PAID' ON CONFLICT(order_id) DO NOTHING").bind(`ent-${order.id}`, Date.now(), order.id),
  ]);
}

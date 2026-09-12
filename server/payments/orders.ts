import { Database } from "../db/types";
import { FortuneError } from "../fortune/shared/contracts";
import { getProduct } from "./catalog";
import {
  PaymentOrder,
  VerifiedPayment,
  PaymentEnv,
  verifyPayment,
} from "./portone";
export async function createOrder(
  db: Database,
  userId: string,
  productId: string,
  profileId: string,
  key: string,
) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key))
    throw new FortuneError("INVALID_IDEMPOTENCY_KEY");
  const p = getProduct(productId);
  const profile = await db
    .prepare("SELECT id,domain FROM profiles WHERE id=? AND user_id=?")
    .bind(profileId, userId)
    .first<{ id: string; domain: string }>();
  if (!profile || profile.domain !== p.domain)
    throw new FortuneError("PROFILE_NOT_FOUND", 404);
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO orders (id,user_id,profile_id,product_id,amount,currency,payment_id,idempotency_key,status,created_at) VALUES (?,?,?,?,?,?,?,?,'PENDING',?) ON CONFLICT(user_id,idempotency_key) DO NOTHING",
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
    )
    .run();
  const order = await db
    .prepare("SELECT * FROM orders WHERE user_id=? AND idempotency_key=?")
    .bind(userId, key)
    .first<PaymentOrder>();
  if (
    !order ||
    order.product_id !== productId ||
    order.profile_id !== profileId
  )
    throw new FortuneError("IDEMPOTENCY_CONFLICT", 409);
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

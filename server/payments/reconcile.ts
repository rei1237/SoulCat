import { Database } from '../db/types';
import { FortuneError } from '../fortune/shared/contracts';
import { PaymentOrder, PaymentEnv, VerifiedPayment, verifyIdentity, lookupPayment } from './portone';
import { grantPaidOrder } from './orders';

// Every entry point uses the same monotonic transaction. Cancellation is terminal.
export async function applyPayment(db: Database, order: PaymentOrder, pg: VerifiedPayment, env: PaymentEnv) {
  verifyIdentity(pg, order, env);
  if (['CANCELLED','PARTIAL_CANCELLED'].includes(pg.status)) {
    const cancelled = pg.amount.cancelled;
    if (!Number.isSafeInteger(cancelled) || cancelled! <= 0 || cancelled! > order.amount ||
      (pg.status === 'CANCELLED' && cancelled !== order.amount) ||
      (pg.status === 'PARTIAL_CANCELLED' && cancelled! >= order.amount) || !Number.isSafeInteger(pg.amount.paid) || pg.amount.paid! < 0 || pg.amount.paid! > order.amount) throw new FortuneError('PAYMENT_MISMATCH',409);
    const prior=await db.prepare('SELECT cancelled_amount FROM orders WHERE id=?').bind(order.id).first<{cancelled_amount:number}>();
    if(prior && prior.cancelled_amount>cancelled!)return (await db.prepare('SELECT * FROM orders WHERE id=?').bind(order.id).first<PaymentOrder>())!;
    const requests = 'SELECT r.id FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE e.order_id=?';
    await db.batch([
      db.prepare("UPDATE orders SET status='REFUNDED',pg_status=?,cancelled_amount=MAX(cancelled_amount,?) WHERE id=?").bind(pg.status,cancelled!,order.id),
      db.prepare("INSERT INTO payments(id,order_id,amount,currency,status,verified_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,verified_at=excluded.verified_at").bind(pg.id,order.id,order.amount,order.currency,pg.status,Date.now()),
      db.prepare("UPDATE entitlements SET status='REVOKED' WHERE order_id=?").bind(order.id),
      db.prepare(`DELETE FROM fortune_outbox WHERE request_id IN (${requests})`).bind(order.id),
      db.prepare(`UPDATE fortune_chapters SET status='failed',failure_code='PAYMENT_REVOKED',attempt_id=NULL,lease_until=NULL,raw_json=NULL WHERE request_id IN (${requests}) AND status!='completed'`).bind(order.id),
      db.prepare(`UPDATE fortune_requests SET status='FAILED',failure_code='PAYMENT_REVOKED',attempt_id=NULL,lease_until=NULL WHERE id IN (${requests})`).bind(order.id),
      db.prepare(`UPDATE fortune_shares SET revoked_at=? WHERE request_id IN (${requests})`).bind(Date.now(),order.id),
    ]);
  } else if (pg.status === 'PAID') {
    await grantPaidOrder(db,order,pg,env);
    await db.prepare("UPDATE orders SET pg_status='PAID' WHERE id=? AND status='PAID'").bind(order.id).run();
  } else if (pg.status === 'FAILED') {
    await db.prepare("UPDATE orders SET status='FAILED',pg_status='FAILED' WHERE id=? AND status='PENDING'").bind(order.id).run();
  }
  return (await db.prepare('SELECT * FROM orders WHERE id=?').bind(order.id).first<PaymentOrder>())!;
}

export async function reconcilePayment(db: Database, order: PaymentOrder, env: PaymentEnv, transport = fetch) {
  const token = crypto.randomUUID(), now = Date.now();
  const lock = await db.prepare('UPDATE orders SET verify_token=?,verify_until=? WHERE id=? AND verify_until<? AND verified_at<?').bind(token,now+20000,order.id,now,now-3000).run();
  if (!lock.meta.changes) throw new FortuneError('PAYMENT_CHECK_BUSY',409);
  try { return await applyPayment(db,order,await lookupPayment(order,env,transport),env); }
  finally { await db.prepare('UPDATE orders SET verify_until=0,verified_at=?,verify_token=NULL WHERE id=? AND verify_token=?').bind(Date.now(),order.id,token).run(); }
}

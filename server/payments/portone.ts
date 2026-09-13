import { FortuneError } from "../fortune/shared/contracts";
export interface PaymentOrder {
  id: string;
  user_id: string;
  product_id: string;
  profile_id: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  store_id?: string | null;
  channel_key?: string | null;
  pay_method?: string | null;
  return_path?: string | null;
  pg_status?: string | null;
}
export interface PaymentEnv {
  PORTONE_API_SECRET?: string;
  PORTONE_STORE_ID?: string;
  PORTONE_CHANNEL_KEY?: string;
  PAYMENTS_ENABLED?: string;
  PORTONE_CARD_CHANNEL_KEY?: string;
  PORTONE_KAKAO_CHANNEL_KEY?: string;
  PORTONE_KAKAO_TYPE?: string;
  PORTONE_WEBHOOK_SECRET?: string;
}
export interface VerifiedPayment {
  id: string;
  status: string;
  amount: { total: number; paid?: number; cancelled?: number };
  currency: string;
  storeId?: string;
  channel?: { key?: string };
}
export function verifyPayment(
  payment: VerifiedPayment,
  order: PaymentOrder,
  env: PaymentEnv,
) {
  verifyIdentity(payment, order, env);
  if (payment.status !== 'PAID' || (payment.amount.cancelled ?? 0) !== 0 ||
    (order.store_id && (payment.amount.paid !== order.amount || payment.amount.cancelled !== 0))) throw new FortuneError('PAYMENT_NOT_PAID',409);
  return payment;
}
export function verifyIdentity(payment: VerifiedPayment, order: PaymentOrder, env: PaymentEnv) {
  const store = order.store_id || env.PORTONE_STORE_ID;
  const channel = order.channel_key || env.PORTONE_CHANNEL_KEY;
  if (
    !store || !channel || order.currency !== 'KRW' ||
    payment.id !== order.payment_id ||
    payment.currency !== order.currency ||
    payment.amount?.total !== order.amount ||
    payment.storeId !== store ||
    payment.channel?.key !== channel
  )
    throw new FortuneError("PAYMENT_MISMATCH", 409);
  return payment;
}
export function checkoutChannel(env: PaymentEnv, method: unknown) {
  if (env.PAYMENTS_ENABLED !== 'true' || !env.PORTONE_API_SECRET || !env.PORTONE_STORE_ID || !env.PORTONE_WEBHOOK_SECRET) throw new FortuneError('PAYMENTS_UNAVAILABLE',503);
  const channel = method === 'CARD' ? env.PORTONE_CARD_CHANNEL_KEY : method === 'KAKAOPAY' && ['inicis','kakaopay'].includes(env.PORTONE_KAKAO_TYPE || '') ? env.PORTONE_KAKAO_CHANNEL_KEY : undefined;
  if (!channel || env.PORTONE_CARD_CHANNEL_KEY === env.PORTONE_KAKAO_CHANNEL_KEY) throw new FortuneError('PAYMENTS_UNAVAILABLE',503);
  return channel;
}
export async function lookupPayment(
  order: PaymentOrder,
  env: PaymentEnv,
  transport = fetch,
): Promise<VerifiedPayment> {
  if (
    !env.PORTONE_API_SECRET ||
    !order.store_id || !order.channel_key
  )
    throw new FortuneError("PAYMENTS_UNAVAILABLE", 503);
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await transport(
      `https://api.portone.io/payments/${encodeURIComponent(order.payment_id)}?storeId=${encodeURIComponent(order.store_id)}`,
      {
        headers: { Authorization: `PortOne ${env.PORTONE_API_SECRET}` },
        signal: abort.signal,
      },
    );
    if (!response.ok) throw new FortuneError("PAYMENT_LOOKUP_FAILED", 502);
    return (await response.json()) as VerifiedPayment;
  } catch (e) {
    throw e instanceof FortuneError
      ? e
      : new FortuneError("PAYMENT_LOOKUP_FAILED", 502);
  } finally {
    clearTimeout(timeout);
  }
}

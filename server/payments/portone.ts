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
}
export interface PaymentEnv {
  PORTONE_API_SECRET?: string;
  PORTONE_STORE_ID?: string;
  PORTONE_CHANNEL_KEY?: string;
  PAYMENTS_ENABLED?: string;
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
  if (
    payment.id !== order.payment_id ||
    payment.currency !== order.currency ||
    payment.amount?.total !== order.amount ||
    payment.storeId !== env.PORTONE_STORE_ID ||
    payment.channel?.key !== env.PORTONE_CHANNEL_KEY
  )
    throw new FortuneError("PAYMENT_MISMATCH", 409);
  if (payment.status !== "PAID" || (payment.amount.cancelled ?? 0) !== 0)
    throw new FortuneError("PAYMENT_NOT_PAID", 409);
  return payment;
}
export async function lookupPayment(
  order: PaymentOrder,
  env: PaymentEnv,
  transport = fetch,
): Promise<VerifiedPayment> {
  if (
    env.PAYMENTS_ENABLED !== "true" ||
    !env.PORTONE_API_SECRET ||
    !env.PORTONE_STORE_ID ||
    !env.PORTONE_CHANNEL_KEY
  )
    throw new FortuneError("PAYMENTS_UNAVAILABLE", 503);
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await transport(
      `https://api.portone.io/payments/${encodeURIComponent(order.payment_id)}?storeId=${encodeURIComponent(env.PORTONE_STORE_ID)}`,
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

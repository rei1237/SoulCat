import type { PaymentEnv } from './portone';
import { getProduct } from './catalog';
import { FortuneError } from '../fortune/shared/contracts';

export const validationRun = 'soulcat-login-payment-20260913';
export function stagingProductEnabled(env: PaymentEnv, userId: string | undefined, productId: string) {
  const users = (env.STAGING_TEST_USER_IDS || '').split(',').map(id => id.trim());
  return env.APP_ENV === 'staging' && env.PAYMENTS_ENABLED === 'true' &&
    env.STAGING_PAYMENT_RUN === validationRun && env.STAGING_TEST_PRODUCT_IDS === 'saju_mackerel' &&
    users.length <= 3 && users.every(id => /^codedestiny:[a-f0-9]{24}$/.test(id)) &&
    !!userId && users.includes(userId) && productId === 'saju_mackerel' && getProduct(productId).priceKRW === 1000;
}
export function requireStagingProduct(env: PaymentEnv, userId: string, productId: string) {
  if (!stagingProductEnabled(env, userId, productId)) throw new FortuneError('PAYMENTS_UNAVAILABLE', 503);
}

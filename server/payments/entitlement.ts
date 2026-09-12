import { FortuneError } from '../fortune/shared/contracts';
export interface Entitlement { id: string; userId: string; orderId: string; productId: string; status: 'ACTIVE' | 'REVOKED' }
export function requireEntitlement(entitlement: Entitlement | undefined, userId: string, productId: string): Entitlement {
  if (!entitlement || entitlement.status !== 'ACTIVE' || entitlement.userId !== userId || entitlement.productId !== productId) throw new FortuneError('ENTITLEMENT_REQUIRED', 403);
  return entitlement;
}

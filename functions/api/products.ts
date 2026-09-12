import { products } from '../../server/payments/catalog';
export function onRequestGet() {
  return Response.json({ products }, { headers: { 'cache-control': 'no-store' } });
}

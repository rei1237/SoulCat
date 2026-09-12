import { DomainId, FishId, FortuneError } from "../fortune/shared/contracts";
// Confirmed by the user on 2026-09-12 against the price images.
const fishCatalog = {
  mackerel: { name: "고등어", priceKRW: 1000 },
  salmon: { name: "연어", priceKRW: 3000 },
  flounder: { name: "광어", priceKRW: 5000 },
  tuna: { name: "참치", priceKRW: 10000 },
} as const;
const domains: DomainId[] = ["saju", "sukuyo", "vedic", "astrology", "ziwei"];
export const products = domains.flatMap((domain) =>
  (Object.keys(fishCatalog) as FishId[]).map((fishId) => ({
    id: `${domain}_${fishId}`,
    domain,
    fishId,
    fishName: fishCatalog[fishId].name,
    priceKRW: fishCatalog[fishId].priceKRW,
    currency: "KRW" as const,
    image: `/_soulcat/assets/fish/${fishId}.webp`,
    resultType: "consultation-v1",
    enabled: false,
  })),
);
export type Product = (typeof products)[number];
export function getProduct(id: unknown): Product {
  const p = products.find((p) => p.id === id);
  if (!p) throw new FortuneError("PRODUCT_NOT_FOUND", 404);
  return { ...p };
}

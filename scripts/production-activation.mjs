// 운영 실 LLM 은 로컬 미커밋 activation 파일로만 켠다. 운영에서 여는 유료 상품은 검증된 고등어 사주(saju_mackerel) 1종뿐이다.
const allowed = new Set(['ALLOW_LIVE_LLM','LLM_PROVIDER','LLM_COST_MODE','GEMINI_MODEL','GEMINI_PRICING_MODEL','GEMINI_INPUT_USD_PER_MILLION','GEMINI_OUTPUT_USD_PER_MILLION','LLM_USD_KRW_CEILING','LLM_PRICING_VALID_UNTIL','LLM_VERIFIED_PRODUCTS']);
export function validateProductionActivation(vars) {
  if (!vars || typeof vars !== 'object' || Object.entries(vars).some(([key,value]) => !allowed.has(key) || typeof value !== 'string')) throw new Error('Unexpected production activation field');
  const positive = key => Number.isFinite(Number(vars[key])) && Number(vars[key]) > 0;
  if (vars.ALLOW_LIVE_LLM !== 'true' || vars.LLM_PROVIDER !== 'gemini' || vars.LLM_COST_MODE !== 'metered' ||
      !vars.GEMINI_MODEL || vars.GEMINI_MODEL !== vars.GEMINI_PRICING_MODEL ||
      !['GEMINI_INPUT_USD_PER_MILLION','GEMINI_OUTPUT_USD_PER_MILLION','LLM_USD_KRW_CEILING'].every(positive) ||
      !Number.isFinite(Date.parse(vars.LLM_PRICING_VALID_UNTIL)) || Date.parse(vars.LLM_PRICING_VALID_UNTIL) <= Date.now()) throw new Error('Production live LLM limits missing');
  let products;
  try { products = JSON.parse(vars.LLM_VERIFIED_PRODUCTS || ''); } catch { throw new Error('LLM_VERIFIED_PRODUCTS must be JSON'); }
  const p = products && typeof products === 'object' && !Array.isArray(products) && Object.keys(products).join(',') === 'saju_mackerel' ? products.saju_mackerel : null;
  if (!p || p.model !== vars.GEMINI_MODEL || p.chapters !== 5 || p.manifestVersion !== 'destiny-book-v4' || p.outputTokens !== 8192 ||
      !Number.isFinite(p.maxKRW) || p.maxKRW <= 0) throw new Error('Only verified 1000 KRW saju is permitted in production');
}

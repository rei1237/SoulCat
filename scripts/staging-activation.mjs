const allowed = new Set(['PAYMENTS_ENABLED','ALLOW_LIVE_LLM','LLM_PROVIDER','STAGING_TEST_USER_IDS','STAGING_TEST_PRODUCT_IDS','STAGING_PAYMENT_RUN','LLM_COST_MODE','LLM_TEST_BUDGET_KRW','LLM_DAILY_BUDGET_KRW','GEMINI_MODEL','GEMINI_PRICING_MODEL','GEMINI_INPUT_USD_PER_MILLION','GEMINI_OUTPUT_USD_PER_MILLION','LLM_USD_KRW_CEILING','LLM_PRICING_VALID_UNTIL','LLM_VERIFIED_PRODUCTS','LLM_STAGING_VALIDATION_MANIFEST']);
export function validateStagingActivation(vars) {
  if (!vars || Object.entries(vars).some(([key,value]) => !allowed.has(key) || typeof value !== 'string')) throw new Error('Unexpected staging activation field');
  if (vars.PAYMENTS_ENABLED !== 'true' || vars.ALLOW_LIVE_LLM !== 'true' || vars.LLM_PROVIDER !== 'gemini' ||
      vars.STAGING_PAYMENT_RUN !== 'soulcat-login-payment-20260913' || vars.STAGING_TEST_PRODUCT_IDS !== 'saju_mackerel' ||
      !/^codedestiny:[a-f0-9]{24}(,codedestiny:[a-f0-9]{24}){0,2}$/.test(vars.STAGING_TEST_USER_IDS || '') ||
      vars.LLM_COST_MODE !== 'test' || !['LLM_TEST_BUDGET_KRW','LLM_DAILY_BUDGET_KRW'].every(key => Number(vars[key]) > 0 && Number(vars[key]) <= 1000) ||
      !vars.GEMINI_MODEL || vars.GEMINI_MODEL !== vars.GEMINI_PRICING_MODEL ||
      !['GEMINI_INPUT_USD_PER_MILLION','GEMINI_OUTPUT_USD_PER_MILLION','LLM_USD_KRW_CEILING'].every(key => Number.isFinite(Number(vars[key])) && Number(vars[key]) > 0) ||
      !Number.isFinite(Date.parse(vars.LLM_PRICING_VALID_UNTIL)) || Date.parse(vars.LLM_PRICING_VALID_UNTIL) <= Date.now()) throw new Error('Staging validation limits missing');
  if (vars.LLM_STAGING_VALIDATION_MANIFEST === 'destiny-book-v4') return;
  const products = JSON.parse(vars.LLM_VERIFIED_PRODUCTS || '{}');
  if (Object.keys(products).join(',') !== 'saju_mackerel' || products.saju_mackerel.chapters !== 5 || products.saju_mackerel.model !== vars.GEMINI_MODEL ||
      !Number.isFinite(products.saju_mackerel.maxKRW) || products.saju_mackerel.maxKRW <= 0 || products.saju_mackerel.maxKRW > Number(vars.LLM_DAILY_BUDGET_KRW)) throw new Error('Only verified 1000 KRW saju is permitted');
}

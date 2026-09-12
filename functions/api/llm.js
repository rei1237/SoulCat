// Direct prompts are retired. Generation requires server-verified ownership.
export function onRequest() {
  return Response.json({ ok: false, code: 'DIRECT_LLM_RETIRED', message: '운세 상품에서 상담을 시작해 주세요.' }, {
    status: 410, headers: { 'cache-control': 'private, no-store' },
  });
}

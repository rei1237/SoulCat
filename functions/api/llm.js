const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_PROMPT_LENGTH = 4000;

function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}

export async function onRequestPost(context) {
  if (!context.env?.AI) {
    return json(
      { ok: false, code: "LLM_NOT_CONFIGURED", message: "LLM 바인딩이 아직 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json(
      { ok: false, code: "INVALID_JSON", message: "요청 형식을 확인해 주세요." },
      { status: 400 },
    );
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return json(
      { ok: false, code: "INVALID_PROMPT", message: "질문은 1자 이상 4,000자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    const result = await context.env.AI.run(MODEL, { prompt });
    return json({ ok: true, model: MODEL, result });
  } catch {
    return json(
      { ok: false, code: "LLM_REQUEST_FAILED", message: "상담 준비 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}

export function onRequest() {
  return json(
    { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST 요청만 사용할 수 있습니다." },
    { status: 405, headers: { allow: "POST" } },
  );
}

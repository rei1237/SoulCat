import { AuthEnv } from "../auth";
import { FortuneError } from "../fortune/shared/contracts";

// 영냥이 결제는 Code Destiny 결제창(단건 결제 전용)에서만 일어난다. 이 워커는 결제를 받지 않고
// CD 의 `/api/yeongnyangi-entitlement` 로 "아직 안 쓴 결제 증빙" 을 읽고, 책을 만든 뒤 소비 표식만 남긴다.
// 사용자 쿠키를 sharedIdentity() 와 같은 규칙으로 그대로 넘기므로 다른 계정의 증빙은 읽을 수 없다.
export interface CdProof { id: string; requestId: string; featureKey: string; amountKRW: number; paidAt: unknown; consumedBy: string | null }

export function checkoutUrl(featureKey: string, returnTo: string) {
  return `/checkout/?featureKey=${encodeURIComponent(featureKey)}&returnTo=${encodeURIComponent(returnTo)}`;
}

async function cdFetch(request: Request, env: AuthEnv, query: string, init?: { method: "POST"; body: object }) {
  const origin = new URL(request.url).origin;
  const expected = env.APP_ENV === "production" ? "https://code-destiny.com" : "https://staging.code-destiny.com";
  const cookies = (request.headers.get("cookie") || "").split(";").map(v => v.trim()).filter(v => /^(fortune_auth_token|fortune_auth_refresh)=/.test(v));
  if (!cookies.length) throw new FortuneError("SESSION_REQUIRED", 401);
  if (!env.AUTH_SERVICE || origin !== expected || env.PUBLIC_ORIGIN !== expected) throw new FortuneError("PAYMENT_PROOF_UNAVAILABLE", 503);
  let response: Response;
  try {
    response = await env.AUTH_SERVICE.fetch(new Request(`${expected}/api/yeongnyangi-entitlement${query}`, {
      method: init?.method || "GET",
      headers: { cookie: cookies.join("; "), accept: "application/json", "user-agent": request.headers.get("user-agent") || "", ...(init ? { "content-type": "application/json" } : {}) },
      body: init ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    }));
  } catch { throw new FortuneError("PAYMENT_PROOF_UNAVAILABLE", 503); }
  if (response.status === 401 || response.status === 403) throw new FortuneError("SESSION_REQUIRED", 401);
  return response;
}

function proofOf(raw: unknown): CdProof | null {
  const p = raw as Partial<CdProof> | null;
  if (!p || typeof p.id !== "string" || !p.id || typeof p.featureKey !== "string") return null;
  return { id: p.id, requestId: typeof p.requestId === "string" ? p.requestId : "", featureKey: p.featureKey, amountKRW: Number(p.amountKRW) || 0, paidAt: p.paidAt ?? null, consumedBy: typeof p.consumedBy === "string" && p.consumedBy ? p.consumedBy : null };
}

export async function listUnconsumedProofs(request: Request, env: AuthEnv, featureKey: string): Promise<CdProof[]> {
  const response = await cdFetch(request, env, `?featureKey=${encodeURIComponent(featureKey)}`);
  if (!response.ok) throw new FortuneError("PAYMENT_PROOF_UNAVAILABLE", 503);
  const body = await response.json().catch(() => null) as { ok?: boolean; featureKey?: string; proofs?: unknown[] } | null;
  if (!body || body.ok !== true || body.featureKey !== featureKey || !Array.isArray(body.proofs)) throw new FortuneError("PAYMENT_PROOF_UNAVAILABLE", 503);
  // fail-closed: 키가 다르거나 이미 소비된 행은 증빙으로 세지 않는다.
  return body.proofs.map(proofOf).filter((p): p is CdProof => !!p && p.featureKey === featureKey && !p.consumedBy);
}

// 같은 requestId 재요청은 CD 쪽에서 멱등 성공한다. 다른 요청이 먼저 쓴 증빙(409)은 false 로 돌려 402 로 되돌아간다.
export async function consumeProof(request: Request, env: AuthEnv, paymentId: string, requestId: string): Promise<boolean> {
  const response = await cdFetch(request, env, "", { method: "POST", body: { paymentId, requestId } });
  if (response.status === 409) return false;
  if (!response.ok) throw new FortuneError("PAYMENT_PROOF_UNAVAILABLE", 503);
  const body = await response.json().catch(() => null) as { ok?: boolean } | null;
  if (!body || body.ok !== true) throw new FortuneError("PAYMENT_PROOF_UNAVAILABLE", 503);
  return true;
}

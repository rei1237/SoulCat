import { FortuneError } from "./fortune/shared/contracts";

export interface AuthEnv {
  APP_ENV?: string;
  AUTH_SERVICE?: { fetch(request: Request): Promise<Response> };
  PUBLIC_ORIGIN?: string;
}

// Only the existing authentication service owns credentials and Atlas access.
export async function sharedIdentity(request: Request, env: AuthEnv) {
  const origin = new URL(request.url).origin;
  const expected = env.APP_ENV === "production"
    ? "https://code-destiny.com" : "https://staging.code-destiny.com";
  const cookies = (request.headers.get("cookie") || "").split(";")
    .map(value => value.trim())
    .filter(value => /^(fortune_auth_token|fortune_auth_refresh)=/.test(value));
  if (!cookies.length) throw new FortuneError("SESSION_REQUIRED", 401);
  if (!env.AUTH_SERVICE || origin !== expected || env.PUBLIC_ORIGIN !== expected)
    throw new FortuneError("AUTH_UNAVAILABLE", 503);
  try {
    const response = await env.AUTH_SERVICE.fetch(new Request(`${expected}/api/auth/me`, {
      headers: { cookie: cookies.join("; "), accept: "application/json", "x-code-destiny-cache-refresh": "1", "user-agent": request.headers.get("user-agent") || "" },
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    }));
    if (response.status === 401 || response.status === 403)
      throw new FortuneError("SESSION_REQUIRED", 401);
    if (!response.ok) throw new FortuneError("AUTH_UNAVAILABLE", 503);
    const body = await response.json() as { authenticated?: boolean; degraded?: boolean; source?: string; user?: { id?: string; _id?: string; name?: string; email?: string; phoneNumber?: string } };
    // Existing /me may return token-only identity during a database outage.
    // Do not allow that fallback to unlock a separate service's private data.
    if (body.degraded || body.source) throw new FortuneError("AUTH_UNAVAILABLE", 503);
    if (body.authenticated !== true) throw new FortuneError("SESSION_REQUIRED", 401);
    const id = body.user?.id || body.user?._id;
    if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id))
      throw new FortuneError("AUTH_UNAVAILABLE", 503);
    return {userId:`codedestiny:${id.toLowerCase()}`,displayName:typeof body.user?.name === "string" && !body.user.name.includes("@") ? body.user.name.trim().slice(0,60) : "",customer:{fullName:body.user?.name,phoneNumber:body.user?.phoneNumber,email:body.user?.email}};
  } catch (error) {
    if (error instanceof FortuneError) throw error;
    throw new FortuneError("AUTH_UNAVAILABLE", 503);
  }
}

export async function sharedUser(request:Request,env:AuthEnv){return (await sharedIdentity(request,env)).userId;}

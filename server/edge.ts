import { handleApi, type Env } from "./api";

export interface EdgeEnv extends Env {
  SOULCAT_PAGES_ORIGIN?: string;
  RELEASE_SHA?: string;
}
const screens = new Set(["/fortune/", "/room/", "/library/"]);
export function routeKind(path: string) {
  if (screens.has(path) || screens.has(`${path}/`)) return "screen";
  if (path.startsWith("/api/yeongnyangi/")) return "api";
  if (path === "/_soulcat/version.json") return "asset";
  if (/^\/_soulcat\/(?:_next\/static\/|assets\/|ephe\/)/.test(path)) return "asset";
  if (path.startsWith("/_soulcat/")) return "missing";
  return "legacy";
}
export async function handleEdge(request: Request, env: EdgeEnv, waitUntil: (task: Promise<unknown>) => void, transport = fetch) {
  const url = new URL(request.url);
  const kind = routeKind(url.pathname);
  if (kind === "legacy") return transport(request);
  const unavailable = () => new Response("영냥이 연결을 준비하고 있어요.", { status: 503, headers: { "cache-control": "no-store" } });
  if (url.origin !== env.PUBLIC_ORIGIN) return unavailable();
  if (kind === "api") {
    if (url.pathname === "/api/yeongnyangi/version" && request.method === "GET")
      return Response.json({ sha: env.RELEASE_SHA || null, environment: env.APP_ENV }, { headers: { "cache-control": "no-store" } });
    return handleApi(request, env, waitUntil);
  }
  if (kind === "missing") return new Response("Not found", { status: 404 });
  if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405 });
  if (kind === "screen" && !url.pathname.endsWith("/")) {
    url.pathname += "/";
    return Response.redirect(url.href, 301);
  }
  // A release must pin an immutable deployment, never the rolling Pages alias.
  if (!/^https:\/\/[a-f0-9]{8}\.soulcat\.pages\.dev$/.test(env.SOULCAT_PAGES_ORIGIN || "")) return unavailable();
  const upstream = new URL(env.SOULCAT_PAGES_ORIGIN!);
  upstream.pathname = kind === "asset" ? url.pathname.replace(/^\/_soulcat/, "") : url.pathname;
  // Static documents are independent of user/session and query string.
  try {
    const response = await transport(new Request(upstream, { method: request.method, redirect: "manual", signal: AbortSignal.timeout(15000) }));
    if (response.status >= 300 && response.status < 400) return unavailable();
    const headers = new Headers(response.headers);
    headers.delete("set-cookie");
    headers.set("x-content-type-options", "nosniff");
    headers.set("x-robots-tag", "noindex, nofollow");
    headers.set("cache-control", kind === "screen" || !response.ok ? "no-store" : "public, max-age=3600");
    return new Response(response.body, { status: response.status, headers });
  } catch { return unavailable(); }
}
export default { fetch(request: Request, env: EdgeEnv, ctx: { waitUntil(task: Promise<unknown>): void }) {
  return handleEdge(request, env, task => ctx.waitUntil(task));
} };

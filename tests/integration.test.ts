import { test } from "node:test";
import assert from "node:assert/strict";
import { sharedUser } from "../server/auth";
import { handleEdge, routeKind, type EdgeEnv } from "../server/edge";
import { handleApi } from "../server/api";
import { loginHref } from "../src/lib/service-links";
import { verifyPayment } from "../server/payments/portone";

const origin = "https://staging.code-destiny.com";
const env: EdgeEnv = { APP_ENV: "staging", PUBLIC_ORIGIN: origin, SOULCAT_PAGES_ORIGIN: "https://1234abcd.soulcat.pages.dev", PAYMENTS_ENABLED: "false", LLM_PROVIDER: "mock" };
const idle = () => {};
test("exact screen routing preserves every existing fortune subroute and other applications", async () => {
  for (const path of ["/", "/fortune/daily/", "/fortune/share/", "/fortune/prompt-hub/", "/fortune-tea-house/", "/fortune/", "/room/", "/library/", "/ggulggul-fortune/", "/roommate", "/library-old", "/api/auth/me", "/api/payments/webhook", "/terms/", "/refund/", "/_next/static/old.js", "/sitemap.xml", "/robots.txt"]) {
    assert.equal(routeKind(path), "legacy", path);
    const req = new Request(origin + path + "?utm_source=original");
    const response = await handleEdge(req, env, idle, async received => {
      assert.equal(received, req);
      return new Response("legacy");
    });
    assert.equal(await response.text(), "legacy");
  }
});
test("slash redirect preserves query and private credentials never reach static origin", async () => {
  const entryRedirect = await handleEdge(new Request(origin + "/_soulcat"), env, idle);
  assert.equal(entryRedirect.status, 302);
  assert.equal(entryRedirect.headers.get("location"), origin + "/yeongnyangi/");
  const redirect = await handleEdge(new Request(origin + "/yeongnyangi/fortune?utm_source=test&domain=saju"), env, idle);
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), origin + "/yeongnyangi/fortune/?utm_source=test&domain=saju");
  const response = await handleEdge(new Request(origin + "/yeongnyangi/fortune/?request=private&utm_source=test", { headers: { cookie: "fortune_auth_token=private", authorization: "Bearer private" } }), env, idle, async received => {
    const req = received as Request;
    assert.equal(req.url, env.SOULCAT_PAGES_ORIGIN + "/yeongnyangi/fortune/");
    assert.equal(req.headers.get("cookie"), null);
    assert.equal(req.headers.get("authorization"), null);
    return new Response("page", { headers: { "set-cookie": "unexpected=value" } });
  });
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("immutable Pages pin and origin gates fail closed, asset 404 remains 404", async () => {
  assert.equal((await handleEdge(new Request(origin + "/yeongnyangi/room/"), { ...env, SOULCAT_PAGES_ORIGIN: "https://soulcat.pages.dev" }, idle)).status, 503);
  assert.equal((await handleEdge(new Request("https://code-destiny.com/yeongnyangi/room/"), env, idle)).status, 503);
  const result = await handleEdge(new Request(origin + "/_soulcat/assets/missing.webp"), env, idle, async received => {
    assert.equal((received as Request).url, env.SOULCAT_PAGES_ORIGIN + "/assets/missing.webp");
    return new Response("missing", { status: 404 });
  });
  assert.equal(result.status, 404);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(routeKind("/_soulcat/api/session"), "missing");
});
test("shared login uses only server verified identity and never forwards spoofed user headers", async () => {
  const id = "0123456789abcdef01234567";
  const request = new Request(origin + "/api/yeongnyangi/library", { headers: { cookie: "other=private; fortune_auth_token=test-token; soulcat_session=local", "x-user-id": "attacker" } });
  const actual = await sharedUser(request, { ...env, AUTH_SERVICE: { async fetch(req) {
    assert.equal(req.url, origin + "/api/auth/me");
    assert.equal(req.headers.get("cookie"), "fortune_auth_token=test-token");
    assert.equal(req.headers.get("x-user-id"), null);
    return Response.json({ authenticated: true, user: { id } });
  } } });
  assert.equal(actual, `codedestiny:${id}`);
  for (const body of [
    { authenticated: false }, { authenticated: true, degraded: true, user: { id } },
    { authenticated: true, source: "token", user: { id } },
    { authenticated: true, source: "local-dev-token", user: { id } },
    { authenticated: true, user: { id: "attacker" } },
  ]) await assert.rejects(sharedUser(request, { ...env, AUTH_SERVICE: { fetch: async () => Response.json(body) } }));
  await assert.rejects(sharedUser(request, { ...env, AUTH_SERVICE: { fetch: async () => { throw new Error("network"); } } }), /AUTH_UNAVAILABLE/);
  await assert.rejects(sharedUser(new Request(origin + "/api/yeongnyangi/library", { headers: { cookie: "soulcat_session=local" } }), env), /SESSION_REQUIRED/);
});
test("login return rejects external, protocol-relative and unexpected routes", () => {
  const fallback = origin + "/login/?returnTo=%2Fyeongnyangi%2Ffortune%2F&next=%2Fyeongnyangi%2Ffortune%2F&redirect=%2Fyeongnyangi%2Ffortune%2F";
  for (const path of ["//evil.com", "https://evil.com", "/\\evil.com", "/login/", "/api/auth/me"]) assert.equal(loginHref(path), fallback);
  assert.equal(loginHref("/library/?utm_source=room"), origin + "/login/?returnTo=%2Fyeongnyangi%2Flibrary%2F&next=%2Fyeongnyangi%2Flibrary%2F&redirect=%2Fyeongnyangi%2Flibrary%2F");
});
test("namespaced catalog is public, every product is sold only through the Code Destiny direct checkout", async () => {
  const response = await handleApi(new Request(origin + "/api/yeongnyangi/products"), env, idle);
  const data = await response.json() as { products: { enabled: boolean; priceKRW: number; currency: string }[] };
  assert.equal(response.status, 200);
  assert.equal(data.products.length, 28);
  assert.deepEqual([...new Set(data.products.map(p => p.priceKRW))], [1000, 3000, 5000, 10000, 20000, 30000]);
  // 판매 자격은 CD 결제창(단건 결제 전용)이 정한다 — 카탈로그 flag 는 전부 열려 있고 상품마다 CD featureKey 가 있다.
  assert.ok(data.products.every(p => p.enabled && p.currency === "KRW" && /^yeongnyangi-[a-z0-9-]+$/.test(String((p as { cdFeatureKey?: string }).cdFeatureKey))));
});
test("PG verification rejects forged ID, amount, currency, store, channel and cancellations", () => {
  const order = { id: "o", user_id: "u", product_id: "saju_mackerel", profile_id: "p", amount: 1000, currency: "KRW", payment_id: "pay", status: "PENDING" };
  const config = { PORTONE_STORE_ID: "mock-store", PORTONE_CHANNEL_KEY: "mock-channel" };
  const valid = { id: "pay", status: "PAID", amount: { total: 1000 }, currency: "KRW", storeId: "mock-store", channel: { key: "mock-channel" } };
  for (const patch of [{ id: "wrong" }, { amount: { total: 1 } }, { currency: "USD" }, { storeId: "old-store" }, { channel: { key: "old-channel" } }, { status: "CANCELLED" }, { amount: { total: 1000, cancelled: 500 } }]) assert.throws(() => verifyPayment({ ...valid, ...patch }, order, config));
});

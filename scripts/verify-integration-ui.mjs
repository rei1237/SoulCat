import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.SOULCAT_TEST_BASE || "http://127.0.0.1:3000";
await mkdir(".integration/screenshots", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const evidence = [];
try {
  for (const width of [360, 390, 430, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    // Public static requests only. Every API is a deterministic browser fixture.
    await context.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/products")) return route.fulfill({ json: { products: [], mode: "preview" } });
      return route.fulfill({ status: 401, json: { code: "SESSION_REQUIRED", message: "Code Destiny 로그인 후 다시 확인해 주세요." } });
    });
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", e => failures.push(e.message));
    for (const path of ["/fortune/", "/room/", "/library/"]) {
      await page.goto(base + path + "?utm_source=integration");
      await page.locator(".service-navigation").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${path} overflow`);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://code-destiny.com" + path);
      assert.match(await page.locator('.service-navigation a').last().getAttribute('href'), /^\/login\/\?returnTo=/);
      const broken = await page.locator("img").evaluateAll(images => images.filter(i => i.complete && !i.naturalWidth).map(i => i.getAttribute("src")));
      assert.deepEqual(broken, [], `${path} broken images`);
      await page.screenshot({ path: `.integration/screenshots/${width}-${path.split('/')[1]}.png`, fullPage: true });
      await page.reload();
      await page.locator(".service-navigation").waitFor();
      evidence.push({ width, path, overflow: false, canonical: true, reload: true });
    }
    await page.locator('.service-navigation a[href="/room/"]').click();
    await page.waitForURL("**/room/");
    await page.goBack();
    await page.waitForURL("**/library/?utm_source=integration");
    await page.goForward();
    await page.waitForURL("**/room/");
    assert.deepEqual(failures, []);
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(".integration/ui-evidence.json", JSON.stringify({ base, api: "mocked", evidence }, null, 2));
console.log(`PASS: ${evidence.length} viewport/route checks, reload, back/forward, canonical and images (mock APIs)`);

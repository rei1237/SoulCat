import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.SOULCAT_REVIEW_DIR || "docs/screenshots";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const [width, height] of [
    [360, 800],
    [375, 812],
    [390, 844],
    [412, 915],
    [430, 932],
    [768, 1024],
    [1440, 1000],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: width < 700,
      hasTouch: width < 700,
    });
    const page = await context.newPage();
    const settle = async () =>
      page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.querySelectorAll("dialog[open] img")].map((i) =>
            i.decode().catch(() => {}),
          ),
        );
      });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.__metrics = { cls: 0, lcp: 0 };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (!e.hadRecentInput) window.__metrics.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__metrics.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const bounds = await page.evaluate(() => {
      const rect = (s) => {
        const b = document.querySelector(s).getBoundingClientRect();
        return {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          bottom: b.bottom,
        };
      };
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        cta: rect(".hero-action .primary-cta"),
        cat: rect(".hero-cat"),
        nav: rect(".bottom-nav"),
        dom: document.querySelectorAll("*").length,
        metrics: window.__metrics,
        assets: performance
          .getEntriesByType("resource")
          .filter((x) => x.name.includes("/assets/"))
          .map((x) => ({
            name: x.name.split("/").pop(),
            bytes: x.transferSize,
          })),
        deferredImages: [...document.images]
          .filter((i) => !i.complete || i.naturalWidth === 0)
          .map((i) => i.src),
      };
    });
    expect(bounds.overflow).toBe(false);
    expect(bounds.cta.bottom).toBeLessThan(bounds.nav.y);
    expect(bounds.cat.x).toBeGreaterThanOrEqual(0);
    expect(bounds.cat.x + bounds.cat.width).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
    await settle();
    await page.screenshot({ path: `${output}/${width}x${height}.png` });
    // Load all below-fold art before the full-page capture.
    await page.evaluate(async () => {
      for (const img of document.images) {
        img.loading = "eager";
      }
      await Promise.all(
        [...document.images].map((i) => i.decode().catch(() => {})),
      );
    });
    await settle();
    await page.screenshot({
      path: `${output}/${width}x${height}-full.png`,
      fullPage: true,
    });
    const brokenImages = await page.evaluate(() =>
      [...document.images]
        .filter((i) => i.naturalWidth === 0)
        .map((i) => i.src),
    );
    expect(brokenImages).toEqual([]);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    results.push({
      viewport: `${width}x${height}`,
      ...bounds,
      brokenImages,
      errors,
      accessibility: accessibility.violations.map((x) => ({
        id: x.id,
        impact: x.impact,
        nodes: x.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });

    if (width === 390) {
      await page.getByRole("button", { name: "운세", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "운세", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(600);
      await page.getByRole("button", { name: "홈", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "홈", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await page
        .getByRole("button", { name: "내 운명 깊게 보기", exact: true })
        .click();
      await page
        .getByRole("button", { name: "여섯 가지 운세 살펴보기", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "운세", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(page.locator("dialog")).not.toBeVisible();
      await page.getByRole("button", { name: "홈", exact: true }).click();
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);

      await page.getByRole("button", { name: "영냥이 쓰다듬기" }).click();
      await expect(page.locator(".speech-bubble")).toContainText("쓰다듬는");
      await page
        .getByRole("button", { name: "무료 운세 보기", exact: true })
        .click();
      await expect(page.locator("dialog")).toBeVisible();
      await expect(page.locator("dialog").getByRole("button", { name: /보관/ })).toHaveCount(0);
      await expect(page.locator(".daily-panel")).not.toContainText("보관");
      await expect(
        page.getByRole("button", { name: "문구 복사하기", exact: true }),
      ).toBeVisible();
      await settle();
      await page.screenshot({ path: `${output}/daily.png` });
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog")).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "무료 운세 보기", exact: true }),
      ).toBeFocused();
      await page.getByRole("button", { name: "보관함", exact: true }).click();
      await expect(page.locator(".library-panel")).toContainText(
        "보관함을 준비하고 있어요",
      );
      await page.keyboard.press("Escape");
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: "보관함", exact: true }).click();
      await expect(page.locator(".library-panel")).toContainText(
        "보관함을 준비하고 있어요",
      );
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "로그인", exact: true }).click();
      await expect(page.locator(".auth-art")).toHaveAttribute(
        "src",
        "/assets/login.webp",
      );
      await settle();
      await page.screenshot({ path: `${output}/login.png` });
      await page.getByRole("button", { name: "회원가입", exact: true }).click();
      await expect(page.locator(".auth-art")).toHaveAttribute(
        "src",
        "/assets/signup.webp",
      );
      await settle();
      await page.screenshot({ path: `${output}/signup.png` });
      await page.keyboard.press("Escape");
      await page.locator(".prologue-banner").click();
      await expect(page).toHaveURL(/\/room\/?$/);
      await page.locator(".room-prologue-entry").click();
      for (let i = 0; i < 8; i++) {
        await expect(page.locator(".story-progress")).toHaveAttribute(
          "aria-label",
          `${i + 1} / 8 장면`,
        );
        await settle();
        await page.screenshot({ path: `${output}/story-${i + 1}.png` });
        if (i < 7)
          await page
            .getByRole("button", { name: "다음 이야기", exact: true })
            .click();
      }
      await page
        .getByRole("button", { name: "점술방으로 돌아가기", exact: true })
        .click();
      await expect(page.locator("dialog")).not.toBeVisible();
      await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "돈", exact: true }).click();
      await expect(page.locator(".concern-answer")).toContainText("돈 얘기");
      await expect(page.locator(".service-card.is-recommended")).toHaveCount(2);
      await page.locator(".concern-answer button").first().click();
      await expect(page.locator(".service-panel")).toContainText("타고난");
      await page.keyboard.press("Escape");
      await page.locator(".expression-button").scrollIntoViewIfNeeded();
      await page.locator(".expression-button").click();
      await expect(
        page.locator(".cat-motion-canvas img.motion-active"),
      ).toHaveAttribute("src", "/assets/prologue-cat.webp");
      await settle();
      await page.screenshot({ path: `${output}/white-sheet-motion.png` });
      await page.getByRole("button", { name: "다음 추천 보기" }).click();
      await expect
        .poll(() =>
          page
            .locator(".recommendation-carousel")
            .evaluate((el) => el.scrollLeft),
        )
        .toBeGreaterThan(0);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("button", { name: "홈", exact: true }).click();
      await page.getByRole("button", { name: "영냥이 쓰다듬기" }).click();
      expect(
        await page
          .locator(".hero-cat")
          .evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
      results.push({
        interactions:
          "PASS: cat tap, no daily storage, library preparation, Escape/focus return, auth tabs, 8-scene story, concern mapping, white-sheet expression, carousel, reduced motion",
      });
    }
    await context.close();
  }
  await writeFile(
    "docs/ui-verification.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}

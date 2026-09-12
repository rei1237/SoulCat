import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const directory = 'docs/fortune-art-screenshots';
await fs.mkdir(directory, { recursive: true });
try {
  for (const width of [360, 390, 430, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 900 : 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    for (const domain of ['saju', 'sukuyo', 'vedic', 'astrology', 'ziwei']) {
      await page.goto(`http://127.0.0.1:8790/fortune/?domain=${domain}`);
      await page.locator('.reading-choice').first().waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const img of document.querySelectorAll('.reading-choice > img')) {
          img.loading = 'eager';
          await img.decode();
        }
      });
      const artwork = await page.locator('.reading-choice > img').evaluateAll(images => images.map(img => ({
        src: img.getAttribute('src'), loaded: img.naturalWidth > 0,
        blend: getComputedStyle(img).mixBlendMode,
      })));
      expect(artwork.every(img => img.loaded && img.src.endsWith('-illustration.webp') && img.blend === 'normal')).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.reading-choice').evaluateAll(cards => new Set(cards.map(card => getComputedStyle(card).backgroundColor)).size)).toBe(1);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(axe.violations).toEqual([]);
      await page.locator('.reading-choice').first().focus();
      expect(await page.locator('.reading-choice').first().evaluate(button => getComputedStyle(button).outlineStyle)).toBe('solid');
      await page.locator('.reading-choice').first().evaluate(button => button.blur());
      await page.screenshot({ path: `${directory}/${domain}-${width}.png`, fullPage: true });
      results.push({ width, domain, artwork, overflow: false, accessibilityViolations: 0 });
    }
    expect(errors).toEqual([]);
    await context.close();
  }
} finally { await browser.close(); }
await fs.writeFile('docs/fortune-art-verification.json', JSON.stringify(results, null, 2));
console.log(`Verified ${results.length} domain/viewport combinations: WebP loading, layout, focus, accessibility. External browser requests blocked.`);

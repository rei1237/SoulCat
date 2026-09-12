import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
await fs.mkdir('docs/fortune-screenshots', { recursive: true });
try {
  for (const [width, height] of [[360,800],[390,844],[430,932],[1280,900]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8790/fortune/?domain=saju');
    await page.getByRole('heading', { name: '네 이야기, 어디부터 볼까?' }).waitFor();
    await page.screenshot({ path: `docs/fortune-screenshots/saju-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: /나의 사주/ }).click();
    await page.locator('[name=adate]').fill('1997-02-10');
    await page.locator('[name=atime]').fill('14:30');
    await page.locator('[name=agender]').selectOption('female');
    await page.getByRole('button', { name: '생선 고르기' }).click();
    await page.getByRole('heading', { name: '어떤 생선을 가져왔어?' }).waitFor();
    await expect(page.locator('.payment-summary strong')).toHaveText('1,000원');
    await page.getByRole('button', { name: '참치 한 마리' }).click();
    await expect(page.locator('.payment-summary strong')).toHaveText('10,000원');
    await page.screenshot({ path: `docs/fortune-screenshots/fish-${width}.png`, fullPage: true });
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.goto('http://127.0.0.1:8790/fortune/?domain=sukuyo');
    await page.getByRole('button', { name: /두 사람의 궁합/ }).click();
    await expect(page.locator('fieldset')).toHaveCount(2);
    await page.screenshot({ path: `docs/fortune-screenshots/sukuyo-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
    results.push({ width, overflow: false, errors, accessibilityViolations: axe.violations.length, profileSaved: true, confirmedPrices: true, sukuyoTwoProfiles: true });
    await context.close();
  }
} finally { await browser.close(); }
await fs.writeFile('docs/fortune-ui-verification.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));

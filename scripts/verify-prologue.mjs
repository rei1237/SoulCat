import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'docs/screenshots/prologue';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const [width, height] of [[360,800],[390,844],[430,932],[1440,1000]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3000/room/', { waitUntil: 'networkidle' });
    await page.locator('.room-prologue-entry').click();
    await expect(page.getByRole('button', { name: '이전 장면', exact: true })).toBeDisabled();
    for (let step = 0; step < 8; step++) {
      await expect(page.locator('.story-progress')).toHaveAttribute('aria-label', `${step + 1} / 8 장면`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('.story-panel img')].map(img => img.decode().catch(() => {})));
      });
      // Capture the authored transition's final frame, not a transient crossfade.
      await page.waitForTimeout(1850);
      const geometry = await page.locator('.story-panel').evaluate(panel => {
        const visual = panel.querySelector('.story-visual').getBoundingClientRect();
        const controls = panel.querySelector('.story-controls').getBoundingClientRect();
        const dialog = panel.closest('dialog').getBoundingClientRect();
        const reading = panel.querySelector('.story-reading');
        return {
          controlsBottom: controls.bottom,
          dialogTop: dialog.top,
          dialogLeft: dialog.left,
          dialogRight: dialog.right,
          visualHeight: visual.height,
          overflow: panel.scrollWidth > panel.clientWidth,
          readingScroll: reading.scrollHeight - reading.clientHeight,
          broken: [...panel.querySelectorAll('img')].some(img => img.naturalWidth === 0),
        };
      });
      expect(geometry.controlsBottom).toBeLessThanOrEqual(height + 1);
      expect(geometry.dialogTop).toBeGreaterThanOrEqual(0);
      expect(geometry.dialogLeft).toBeGreaterThanOrEqual(0);
      expect(geometry.dialogRight).toBeLessThanOrEqual(width + 1);
      expect(geometry.visualHeight).toBeGreaterThan(190);
      expect(geometry.overflow).toBe(false);
      expect(geometry.broken).toBe(false);
      await page.screenshot({ path: `${output}/${width}-scene-${step + 1}.png` });
      results.push({ width, step: step + 1, ...geometry });
      if (step === 4) {
        await expect(page.locator('.final-frame')).toHaveCSS('opacity', '1');
        await expect(page.locator('.first-frame')).toHaveCSS('opacity', '0');
      }
      if (step < 7) await page.getByRole('button', { name: '다음 이야기', exact: true }).click();
    }
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.getByRole('button', { name: '이전 장면', exact: true }).click();
    await expect(page.locator('.story-text h2')).toHaveText('고등어라는 약점');
    await page.getByRole('button', { name: '다음 이야기', exact: true }).click();
    await page.getByRole('button', { name: '영냥이에게 운세 보기', exact: true }).click();
    await expect(page).toHaveURL(/\/fortune\/?$/);
    await page.goto('http://127.0.0.1:3000/room/');
    await page.locator('.room-prologue-entry').click();
    await expect(page.locator('.story-text h2')).toHaveText('하늘을 읽는 사람');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: '다음 이야기', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.story-text h2')).toHaveText('첫 번째 대통령');
    await page.keyboard.press('Escape');
    await expect(page.locator('.room-prologue-entry')).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.room-prologue-entry').click();
    for(let i=0;i<4;i++) await page.getByRole('button', { name: '다음 이야기', exact: true }).click();
    await expect(page.locator('.first-frame')).toHaveCSS('visibility','hidden');
    await expect(page.locator('.final-frame')).toHaveCSS('animation-name','none');
    expect(errors).toEqual([]);
    await context.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/assets/prologue-*.webp', route => route.abort());
  await page.goto('http://127.0.0.1:3000/room/');
  await page.locator('.room-prologue-entry').click();
  await expect(page.locator('.story-text h2')).toBeVisible();
  await page.getByRole('button', { name: '다음 이야기', exact: true }).click();
  await expect(page.locator('.story-text h2')).toHaveText('첫 번째 대통령');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.close();
  await writeFile('docs/prologue-verification.json', JSON.stringify({ results, interactions: 'PASS: previous, next, reset, CTA, focus restoration, keyboard, reduced motion, image failure', axe: '0 violations on all four viewports' }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }

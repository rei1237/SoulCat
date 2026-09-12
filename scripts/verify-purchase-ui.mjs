import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:8790/fortune/?domain=saju');
  await page.getByRole('button', { name: /나의 사주/ }).click();
  await page.locator('[name=adate]').fill('1997-02-10');
  await page.locator('[name=atime]').fill('14:30');
  await page.locator('[name=agender]').selectOption('female');
  await page.getByRole('button', { name: '생선 고르기' }).click();
  await page.getByRole('button', { name: '개발용 구매 흐름 확인 · 청구 없음' }).click();
  await expect(page.getByRole('heading', { name: '영냥이 상담 · 개발 검증용' })).toBeVisible({ timeout: 15000 });
  const url = page.url();
  await page.reload();
  await expect(page.getByRole('heading', { name: '영냥이 상담 · 개발 검증용' })).toBeVisible({ timeout: 15000 });
  await page.goto('http://127.0.0.1:8790/library/');
  await expect(page.getByRole('link', { name: '사주 · 결과 보기' })).toBeVisible();
  await page.getByRole('link', { name: '사주 · 결과 보기' }).click();
  await expect(page.getByRole('heading', { name: '영냥이 상담 · 개발 검증용' })).toBeVisible();
  await fs.writeFile('docs/purchase-ui-verification.json', JSON.stringify({ mockPurchase: true, generated: true, reload: true, libraryReopen: true, stableRequest: new URL(url).searchParams.has('request'), actualPayment: false, actualLLM: false }, null, 2));
  console.log('Mock purchase → calculation → generation → save → reload → library reopen passed.');
} finally { await browser.close(); }

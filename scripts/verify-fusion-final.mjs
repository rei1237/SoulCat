import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:8791',proof=[],browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const width of [360,390,430,1280]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(origin+'/fortune/?domain=tarot');await page.locator('.reading-choice img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));});
 await page.getByRole('button',{name:/사랑과 관계/}).click();await page.locator('[name=question]').fill('관계에서 내가 살펴볼 부분은?');await page.getByRole('button',{name:'내 기본 차트 확인하기'}).click();await page.locator('.chart-tarot').waitFor();
 expect(await page.locator('.tarot-card-image').count()).toBe(6);await page.locator('.tarot-card-image').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));});const chart=await page.locator('.chart-tarot').innerText();expect(chart).not.toContain('self_view');await page.reload();await page.locator('.chart-tarot').waitFor();expect(await page.locator('.chart-tarot').innerText()).toBe(chart);
 await page.getByRole('button',{name:'이 차트로 해설 선택하기'}).click();expect((await new AxeBuilder({page}).include('.fish-reaction').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 await page.goto(origin+'/room/#daily');await page.locator('.room-daily').getByRole('button',{name:'타로',exact:true}).click();await expect(page.locator('.daily-basis')).toBeVisible();expect((await new AxeBuilder({page}).include('.room-daily').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 await page.goto(origin+'/');await page.getByRole('button',{name:/내 운명 깊게 보기/}).click();await expect(page.locator('.fish-catalog-grid a')).toHaveCount(10);expect((await new AxeBuilder({page}).include('.fish-catalog').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);proof.push({width,relationshipCards:6,cardImages:true,menuImages:true,prePurchaseReload:true,dailyCard:true,priceBoardAxe:0,roomAxe:0,reactionAxe:0});await context.close();
}}finally{await browser.close();await fs.writeFile('docs/fusion-final-verification.json',JSON.stringify(proof,null,2));}
console.log(proof);

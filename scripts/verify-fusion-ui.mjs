import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:8791',proof=process.env.FUSION_RESUME?JSON.parse(await fs.readFile('docs/fusion-ui-verification.json','utf8')):[];
const browser=await chromium.launch({channel:'chrome',headless:true});
await fs.mkdir('.integration/fusion-ui',{recursive:true});
try{for(const width of [360,390,430,1280]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:width===430?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(origin+'/');
 await page.locator('.service-card').filter({has:page.getByRole('heading',{name:'타로',exact:true})}).click();
 await expect(page.locator('.service-panel')).not.toContainText('오늘의 한마디');await expect(page.locator('.service-panel a')).toHaveAttribute('href','/fortune/?domain=tarot');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:/내 운명 깊게 보기/}).click();
 await expect(page.locator('.fish-catalog-grid a')).toHaveCount(10);
 await expect(page.locator('.fish-catalog')).toContainText(['30,000원','20,000원']);
 await page.screenshot({path:`.integration/fusion-ui/catalog-${width}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto(origin+'/room/#daily');await expect(page.locator('.room-daily-message')).not.toBeEmpty();
 for(const name of ['사주','자미두수','숙요','베다점','점성술','타로']){await page.locator('.room-daily').getByRole('button',{name,exact:true}).click();await expect(page.locator('.room-daily-message')).not.toBeEmpty();}
 expect(await page.locator('.daily-domain-buttons button').count()).toBe(6);
 await page.screenshot({path:`.integration/fusion-ui/room-${width}.png`,fullPage:true});
 for(const [query,fish,count] of [['domain=tarot','고등어',5],['domain=tarot','연어',13],['domain=tarot','광어',30],['domain=tarot','참치',70],['product=fusion_astrology_tarot','생선 모둠 세트',80],['product=fusion_all','생선 오마카세',120]]){
  if(proof.some(r=>r.width===width&&r.chapters===count))continue;
  await page.goto(origin+'/fortune/?'+query);
  if(query.startsWith('domain')){await page.getByRole('button',{name:/지금의 선택/}).click();expect(await page.locator('[name=adate]').count()).toBe(0);}
  else {await page.locator('[name=adate]').fill('1997-02-10');await page.locator('[name=atime]').fill('14:30');await page.locator('[name=agender]').selectOption('female');}
  await page.locator('[name=question]').fill('내가 지금 바꿀 수 있는 일의 선택은?');
  await page.getByRole('button',{name:'내 기본 차트 확인하기'}).click();await page.locator('.fortune-chart').waitFor({timeout:45000});
  const snapshotText=await page.locator('.fortune-chart').innerText();await page.reload();await page.locator('.fortune-chart').waitFor({timeout:45000});expect(await page.locator('.fortune-chart').innerText()).toBe(snapshotText);
  await page.locator('.fortune-chart img').evaluateAll(async images=>{for(const image of images)await image.decode();});
  if(count===120){expect(await page.locator('.chart-tab-buttons button').count()).toBe(6);for(let i=0;i<6;i++){await page.locator('.chart-tab-buttons button').nth(i).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}}
  await page.getByRole('button',{name:'이 차트로 해설 선택하기'}).click();await page.getByRole('button',{name:`${fish} · ${count}챕터`,exact:true}).click();
  await expect(page.locator('.fish-reaction')).toContainText('기대');expect(await page.locator('.fish-thanks').count()).toBe(0);
  await page.screenshot({path:`.integration/fusion-ui/reaction-${count}-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'개발용 구매 흐름 확인 · 청구 없음'}).click();
  await expect(page.locator('.book-cover')).toContainText(`완성 ${count} / ${count}`,{timeout:60000});await expect(page.locator(".chapter-prose")).toHaveCount(1);
  if(count===120&&width===430)expect(await page.locator('.omakase-burst img').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await expect(page.locator('.chapter-prose')).toContainText('모의 해설');
  await page.getByRole('button',{name:'이 챕터 읽음 표시'}).click();await page.reload();await expect(page.locator('.book-cover')).toContainText('읽은 챕터 1');
  if(width<900)await page.getByRole('button',{name:/목차에서 골라 읽기/}).click();await page.getByRole('button',{name:'지난번 읽던 곳부터'}).click();await expect(page.locator('.chapter-prose')).toContainText('모의 해설');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(count>=80){if(width<900)await page.getByRole('button',{name:/목차에서 골라 읽기/}).click();await page.getByRole('textbox',{name:'내 운명서 검색'}).fill('갈등');await expect(page.locator('.reader-chapter-link')).not.toHaveCount(0);expect(await page.locator('.reader-chapter-link').count()).toBeLessThan(count);await page.getByRole('textbox',{name:'내 운명서 검색'}).fill('');
   await page.getByRole('button',{name:'공유하기',exact:true}).click();await page.getByRole('button',{name:'공유 카드 미리보기'}).click();const img=page.locator('.book-sharing img');await expect.poll(()=>img.evaluate(e=>e.complete&&e.naturalWidth)).toBe(1200);if(width===390)await fs.writeFile(`.integration/fusion-ui/share-${count}.png`,await(await page.request.get(origin+await img.getAttribute('src'))).body());
  }
  if(width===390)await page.screenshot({path:`.integration/fusion-ui/book-${count}.png`,fullPage:true});
  const axe=await new AxeBuilder({page}).include('.destiny-book').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);
  proof.push({width,fish,chapters:count,lazyBody:true,resume:true,overflow:false,accessibilityViolations:0});console.log(width,fish,count,'passed');
 }
 expect(errors).toEqual([]);await context.close();
}}finally{await browser.close();await fs.writeFile('docs/fusion-ui-verification.json',JSON.stringify(proof,null,2));}

import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const origin=process.env.SOULCAT_FREE_ORIGIN||'http://127.0.0.1:8793',results=[];
await fs.mkdir('.integration/free-ui',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const width of [360,390,430,1280]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:width===430?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(origin+'/room/#daily');
 await expect(page.getByRole('button',{name:'출석하고 멸치 받기'})).toBeEnabled();
 await page.getByRole('button',{name:'출석하고 멸치 받기'}).click();
 await expect(page.getByRole('button',{name:'오늘 출석 완료'})).toBeDisabled();
 await page.getByRole('button',{name:'멸치 1마리 건네기'}).click();
 await expect(page.locator('.anchovy-cat')).toHaveClass(/unimpressed/);
 await page.locator('#daily').screenshot({path:`.integration/free-ui/reaction-${width}.png`});
 await expect(page.getByRole('button',{name:'오늘의 16종 열림'})).toBeDisabled();
 await expect(page.locator('.anchovy-balance')).toContainText('0마리');
 await expect(page.locator('.free-categories button')).toHaveCount(16);
 await page.getByRole('button',{name:'출생 정보 새로 입력하기'}).click();
 for(const [label,value] of [['출생 연도','1997'],['출생 월','2'],['출생 일','10'],['출생 시','14'],['출생 분','30']]){const field=page.getByRole('textbox',{name:label,exact:true});await expect(field).toHaveAttribute('inputmode','numeric');await field.fill(value);}
 await page.locator('[name=agender]').selectOption('female');
 await page.getByRole('textbox',{name:'태어난 장소',exact:true}).fill('서울');await page.getByRole('button',{name:'태어난 장소 검색',exact:true}).click();await page.locator('.place-options button').first().click();
 await page.getByRole('textbox',{name:'지금 사는 장소 (선택)',exact:true}).fill('도쿄');await page.getByRole('button',{name:'지금 사는 장소 검색',exact:true}).click();await page.locator('.place-options button').first().click();
 expect(await page.locator('input[type=date],input[type=time]').count()).toBe(0);
 await page.locator('.free-birth-form').screenshot({path:`.integration/free-ui/input-${width}.png`});
 await page.getByRole('button',{name:'이 출생 정보 보관하기'}).click();await expect(page.locator('.free-birth-form')).toHaveCount(0);
 await page.getByRole('button',{name:'오늘의 이야기 읽기'}).click();await expect(page.locator('.free-reading')).toBeVisible({timeout:60000});
 await expect(page.locator('.free-chart .fortune-chart')).toBeVisible();await expect(page.locator('.free-chart')).toContainText('너의 사주 원국');
 if(width!==430)await page.getByRole('button',{name:'바로 읽기'}).click();
 const summary=await page.locator('.free-summary p').innerText();await page.locator('.free-reading').screenshot({path:`.integration/free-ui/reading-${width}.png`});
 await page.getByText('이 운세의 전문가 프롬프트',{exact:true}).click();await expect(page.locator('.free-prompt pre')).toContainText('운세별 전문 지침');
 const axe=await new AxeBuilder({page}).include('#daily').withTags(['wcag2a','wcag2aa']).analyze();
 const serious=axe.violations.filter(v=>['serious','critical'].includes(v.impact));
 expect(serious.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();await expect(page.locator('.free-summary p')).toHaveText(summary);await expect(page.locator('.anchovy-cat')).toHaveClass(/idle/);await expect(page.locator('.anchovy-balance')).toContainText('0마리');
 await page.locator('.free-categories button').filter({hasText:/^타로$/}).click();await page.getByRole('button',{name:'오늘의 이야기 읽기'}).click();await expect(page.locator('.free-reading h3')).toHaveText('타로',{timeout:60000});await expect(page.locator('.chart-tarot .tarot-card-image')).toHaveCount(3);
 if(width===390){await page.getByLabel('이번 이야기에 사용할 본인 프로필').selectOption({index:1});await page.locator('.free-categories button').filter({hasText:/^종합$/}).click();const comprehensiveButton=page.getByRole('button',{name:'오늘의 이야기 읽기'});await expect(comprehensiveButton).toBeEnabled();await comprehensiveButton.click();await expect(page.locator('.chart-tab-buttons button')).toHaveCount(4,{timeout:60000});}
 await page.goto(origin+'/fortune/?domain=saju');await page.locator('.reading-choice').first().click();await expect(page.locator('.birth-date-row')).toBeVisible();expect(await page.locator('input[type=date],input[type=time]').count()).toBe(0);
 expect(errors).toEqual([]);results.push({width,attendance:true,reaction:true,numericInput:true,placeSearch:true,persisted:true,axeViolations:serious.length,errors});await context.close();
 }}finally{await browser.close();await fs.writeFile('docs/free-fortune-ui-verification.json',JSON.stringify(results,null,2)+'\n');}

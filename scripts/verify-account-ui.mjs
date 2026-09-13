import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:3017';
const browser=await chromium.launch({channel:'chrome',headless:true});const proof=[];
await fs.mkdir('.integration/account-ui',{recursive:true});
try{for(const width of [360,390,430,1280]){for(const scenario of ['complete','phone','all','outage']){
 const context=await browser.newContext({viewport:{width,height:844}});const page=await context.newPage();let calls=0;let logged=true;let orders=0;
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();if(!url.pathname.startsWith('/api/'))return route.continue();let data={},status=200;
 if(url.pathname.endsWith('/session')){calls++;status=logged?200:401;data=logged?{userId:'fixture',displayName:'영냥테스트'}:{code:'SESSION_REQUIRED'};}
 if(url.pathname.endsWith('/logout'))logged=false;
 if(url.pathname.endsWith('/products'))data={products:[{id:'saju_mackerel',domain:'saju',fishId:'mackerel',packageId:'mackerel',fishName:'고등어',name:'사주',chapterCount:5,priceKRW:1000,enabled:true,readingKind:'single',image:'/_soulcat/assets/fish/mackerel.webp',reactionAsset:'/_soulcat/assets/fish/reaction-mackerel.webp',systems:['saju'],manifestVersion:'destiny-book-v4'}],mode:'preview'};
 if(url.pathname.endsWith('/charts'))data={chart:{domain:'saju',title:'테스트 차트',groups:[],source:'fixture',limitations:[]}};
 if(url.pathname.endsWith('/checkout/customer')){status=scenario==='outage'?503:200;data=status===503?{code:'AUTH_UNAVAILABLE',message:'확인하지 못했어요'}:{missingFields:scenario==='complete'?[]:scenario==='phone'?['phoneNumber']:['fullName','phoneNumber','email']};}
 if(url.pathname.endsWith('/orders')){if(route.request().method()==='POST'){orders++;data={status:'PAID',requestId:'request'};}else data={orders:[]};}
 if(url.pathname.endsWith('/library'))data={results:[]};
 if(url.pathname.endsWith('/fortune/status'))data={status:'PENDING'};
 return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});});
 await page.goto(origin+'/yeongnyangi/');await expect(page.locator('.header-actions')).toContainText('영냥테스트님 · 로그인됨');expect(calls).toBe(1);
 await page.locator('.header-actions .session-account').click();await expect(page.locator('.header-actions .session-menu')).toContainText('나의 보관함');
 if(width===390&&scenario==='complete'){const tab=await context.newPage();await tab.goto(origin+'/yeongnyangi/library/');await expect(tab.locator('.service-account-bar')).toContainText('영냥테스트님 · 로그인됨');await tab.close();await page.locator('.header-actions .session-menu').getByRole('button',{name:'로그아웃'}).click();await expect(page.locator('.header-actions').getByRole('button',{name:'로그인',exact:true})).toBeVisible();logged=true;}
 await page.goto(origin+'/yeongnyangi/fortune/?profile=profile');await page.getByRole('button',{name:'이 차트로 해설 선택하기'}).click();
 const form=page.locator('.checkout-form');await expect(form).toBeVisible();if(scenario==='outage')await expect(form).toContainText('확인하지 못했어요');else await expect(form.getByRole('button',{name:'1,000원 결제하기'})).toBeEnabled();
 await page.screenshot({path:'.integration/account-ui/'+width+'-'+scenario+'-form.png',fullPage:true});
 if(scenario==='outage'){await expect(form).toContainText('확인하지 못했어요');await expect(form.getByRole('button',{name:'1,000원 결제하기'})).toBeDisabled();expect(orders).toBe(0);}
 else{const fields=scenario==='complete'?[]:scenario==='phone'?['연락처']:['구매자 이름','연락처','이메일'];for(const label of ['구매자 이름','연락처','이메일']){await expect(form.getByLabel(label,{exact:true})).toHaveCount(fields.includes(label)?1:0);}for(const label of fields)await form.getByLabel(label,{exact:true}).fill(label==='연락처'?'01012345678':label==='이메일'?'fixture@example.test':'검증');await form.getByRole('button',{name:'1,000원 결제하기'}).click();await expect(page.locator('.fortune-loading')).toBeVisible();expect(orders).toBe(1);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('fixture@example.test');
 await page.screenshot({path:'.integration/account-ui/'+width+'-'+scenario+'.png',fullPage:true});proof.push({width,scenario,passed:true,realPG:false});await context.close();
 }} }finally{await browser.close();}
await fs.writeFile('.integration/account-ui/results.json',JSON.stringify(proof,null,2));console.log({passed:proof.length,realPG:false});

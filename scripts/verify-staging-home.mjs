import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.SOULCAT_UI_ORIGIN||'http://127.0.0.1:3017';
const folder='.integration/staging-home';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
  for(const width of [360,390,430,1480]){
    const page=await browser.newPage({viewport:{width,height:width>700?900:844},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${origin}/yeongnyangi/`,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.hero-cat img').evaluate(img=>img.decode());
    assert.match(await page.locator('h1').innerText(),/네 운명의 이야기/);
    assert.equal(await page.locator('.starter-invitation').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${folder}/home-${width}.png`,fullPage:false});
    await page.getByRole('button',{name:'로그인',exact:true}).click();
    for(const provider of ['google','naver','kakao']){
      const href=await page.locator(`.social-auth-button--${provider}`).getAttribute('href');
      assert.equal(new URL(href).searchParams.get('next'),'/yeongnyangi/');
    }
    await page.getByRole('button',{name:'닫기',exact:true}).click();
    await page.getByRole('button',{name:'무료 운세 보기',exact:true}).click();
    await page.waitForURL('**/yeongnyangi/room/#daily');
    assert.equal(await page.locator('#daily').count(),1);
    results.push({width,home:true,freeRoute:true,socialReturnPaths:true,errors});
    assert.deepEqual(errors,[]);await page.close();
  }
  if(process.argv.includes('--capture-og')){
    const page=await browser.newPage({viewport:{width:1200,height:630},reducedMotion:'reduce'});
    await page.goto(`${origin}/yeongnyangi/`,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.hero-cat img').evaluate(img=>img.decode());
    await page.screenshot({path:'public/assets/og-yeongnyangi.jpg',type:'jpeg',quality:90});
    await page.close();
  }
  await writeFile(`${folder}/results.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally {await browser.close();}

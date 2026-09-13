import {chromium,webkit,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.CHECKOUT_UI_ORIGIN||'http://127.0.0.1:8794';
const proof=[];
await fs.mkdir('.integration/checkout-ui',{recursive:true});
for(const [name,type,options] of [['chromium',chromium,{channel:'chrome'}],['webkit',webkit,{}]]){
  if(process.env.CHECKOUT_BROWSER && name!==process.env.CHECKOUT_BROWSER)continue;
  const browser=await type.launch({...options,headless:true});
  try{
    for(const width of (process.env.CHECKOUT_WIDTH?[Number(process.env.CHECKOUT_WIDTH)]:process.env.CHECKOUT_BROWSER?[360]:[360,390,430,1280])){
      for(const method of ['CARD','KAKAOPAY']){
        const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage();
        let verifies=0,state='PAID',errors=[];
        page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack?.split("\n").slice(0,3).join("\n"),url:page.url()}));
        await context.route('**/*',async route=>{
          const url=new URL(route.request().url());
          if(url.origin!==origin)return route.abort();
          if(!url.pathname.startsWith('/api/yeongnyangi/'))return route.continue();
          let data={};let status=200;
          if(url.pathname.endsWith('/checkout/customer'))data={missingFields:['fullName','phoneNumber','email']};
          if(url.pathname.endsWith('/session'))data={userId:'fixture',displayName:'검증'};
          if(url.pathname.endsWith('/products'))data={products:[{id:'saju_mackerel',domain:'saju',fishId:'mackerel',fishName:'고등어',name:'사주',chapterCount:5,priceKRW:1000,enabled:true,readingKind:'single',image:'/_soulcat/assets/fish/mackerel.webp',reactionAsset:'/_soulcat/assets/fish/reaction-mackerel.webp',systems:['saju']}],mode:'preview'};
          if(url.pathname.endsWith('/charts'))data={chart:{domain:'saju',title:'테스트 차트',groups:[],source:'fixture',limitations:[]}};
          if(url.pathname.endsWith('/library'))data={results:[]};
          if(url.pathname.endsWith('/orders')){data={orders:[]};if(route.request().method()==='POST'){expect(route.request().postDataJSON().payMethod).toBe(method);expect(route.request().postDataJSON()).not.toHaveProperty('amount');data={status:'PAID',requestId:'request'};}}
          if(url.pathname.endsWith('/daily'))data={message:'fixture',text:'fixture'};
          if(url.pathname.endsWith('/fortune/status'))data={status:'PENDING'};
          if(url.pathname.endsWith('/payments/verify')){
            verifies++;
            expect(route.request().postDataJSON()).toEqual({orderId:'order',paymentId:'payment'});
            status=state==='SESSION_REQUIRED'?401:200;
            data=status===401?{code:state,message:'로그인 후 확인해 주세요.'}:{status:state,requestId:state==='PAID'?'request':undefined,returnPath:'/yeongnyangi/fortune/'};
          }
          return route.fulfill({status,headers:{'access-control-allow-origin':origin},contentType:'application/json',body:JSON.stringify(data)});
        });
        await page.goto(origin+'/yeongnyangi/fortune/?profile=profile');
        await page.getByRole('button',{name:'이 차트로 해설 선택하기'}).click();
        await page.getByRole('radio',{name:method==='CARD'?'신용카드':'카카오페이',exact:true}).check();
        await page.getByLabel('구매자 이름').fill('테스트');await page.getByLabel('연락처').fill('01000000000');await page.getByLabel('이메일').fill('fixture@example.test');
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        await page.screenshot({path:`.integration/checkout-ui/${name}-${width}-${method}-form.png`,fullPage:true});
        const firstStatus=page.waitForResponse(r=>r.url().includes('/fortune/status'));
        await page.getByRole('button',{name:'1,000원 결제하기'}).click();
        await (await firstStatus).finished();
        await expect(page.locator('.fortune-loading')).toBeVisible();
        expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('fixture@example.test');
        const ticket={orderId:'order',paymentId:'payment',productId:'saju_mackerel',profileId:'profile',returnPath:'/yeongnyangi/fortune/',generation:'pending',createdAt:Date.now()};
        await page.evaluate(t=>localStorage.setItem('soulcat:checkout:payment',JSON.stringify(t)),ticket);
        const returnedStatus=page.waitForResponse(r=>r.url().includes('/fortune/status'));
        await page.goto(origin+'/yeongnyangi/fortune/?orderId=order&paymentId=payment');
        await (await returnedStatus).finished();
        await expect(page).toHaveURL(/request=request/);
        expect(verifies).toBe(1);
        expect(await page.evaluate(()=>localStorage.getItem('soulcat:checkout:payment'))).toBeNull();
        const reloadedStatus=page.waitForResponse(r=>r.url().includes('/fortune/status'));
        await page.reload();await (await reloadedStatus).finished();await expect(page.locator('.fortune-loading')).toBeVisible();expect(verifies).toBe(1);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        await page.screenshot({path:`.integration/checkout-ui/${name}-${width}-${method}.png`,fullPage:true});
        const tab=await context.newPage();await tab.goto(origin+'/yeongnyangi/fortune/?orderId=order&paymentId=payment');
        await expect(tab.locator('.checkout-recovery')).toContainText('복귀 정보를 확인하지 못했어요');expect(verifies).toBe(1);await tab.close();
        await page.evaluate(t=>localStorage.setItem('soulcat:checkout:payment',JSON.stringify(t)),ticket);
        await page.goto(origin+'/yeongnyangi/fortune/?orderId=wrong&paymentId=payment');
        await expect(page.locator('.checkout-recovery')).toContainText('복귀 정보를 확인하지 못했어요');expect(verifies).toBe(1);
        state='CANCELLED';await page.goto(origin+'/yeongnyangi/fortune/?orderId=order&paymentId=payment');
        await expect(page.locator('.checkout-recovery')).toContainText('결제가 완료되지 않았어요');expect(verifies).toBe(2);
        expect(await page.evaluate(()=>localStorage.getItem('soulcat:checkout:payment'))).toBeNull();
        state='SESSION_REQUIRED';await page.evaluate(t=>localStorage.setItem('soulcat:checkout:payment',JSON.stringify(t)),ticket);
        await page.goto(origin+'/yeongnyangi/library/?orderId=order&paymentId=payment');
        await expect(page.locator('.checkout-recovery').getByRole('link',{name:'로그인하고 이어가기'})).toHaveAttribute('href',/orderId%3Dorder/,{timeout:15000});
        expect(errors).toEqual([]);
        proof.push({browser:name,width,method,source:'mock API / local static build',paid:true,reload:true,newTab:true,mismatch:true,cancel:true,sessionExpiry:true,checkoutForm:true,overflow:false,errors});
        await context.close();
      }
    }
  }finally{await browser.close();}
}
await fs.writeFile('.integration/checkout-ui/verification.json',JSON.stringify({generatedAt:new Date().toISOString(),realDevice:false,realPG:false,cases:proof},null,2)+'\n');
console.log(JSON.stringify({passed:proof.length,browsers:['chromium','webkit'],realDevice:false,realPG:false}));

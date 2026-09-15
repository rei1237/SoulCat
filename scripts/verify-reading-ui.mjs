// Isolated, in-memory API + static export. Never connects to production or a live LLM.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {database,seed} from '../tests/support/database.ts';
import {handleApi} from '../server/api.ts';
import {createChart} from '../server/fortune/charts.ts';
import {createOrder,grantProofOrder} from '../server/payments/orders.ts';
import {prepareBook,runBookStep,readChapter} from '../server/fortune/books.ts';
import {MockChapterProvider} from '../server/providers/chapter.ts';
import {bodyCharacterCount} from '../server/fortune/reading-quality.ts';
const root=path.resolve(process.env.READING_UI_EXPORT||'.integration/reading-export');
const {db,sqlite}=database();seed(sqlite);
const token='1'.repeat(64);
sqlite.prepare('INSERT INTO sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),'alice',Date.now()+3600000);
await createChart(db,'alice','p',{});
const books=[];
for(const tier of ['mackerel','tuna']){
 const order=await createOrder(db,'alice','saju_'+tier,'p','ui-reading-'+tier+'-fixture');
 await grantProofOrder(db,order,'fixture-'+order.id,order.amount);
 const request=await prepareBook(db,'alice','saju_'+tier,'p',{});
 for(let i=0;i<14;i++)if(!await runBookStep(db,request.id,new MockChapterProvider()))break;
 books.push({id:request.id,tier});
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{
 const origin=`http://127.0.0.1:${server.address().port}`;
 if(req.url.startsWith('/api/')){
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const response=await handleApi(new Request(origin+req.url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})}),{DB:db,APP_ENV:'local',LLM_PROVIDER:'mock',ALLOW_LIVE_LLM:'false'},p=>p.catch(()=>{}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
 }
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,origin).pathname));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
 res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});const proof=[];
await fs.mkdir('.integration/reading-ui',{recursive:true});
try{
 for(const width of [390,1280]){
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.addCookies([{name:'soulcat_session',value:token,url:origin}]);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 for(const book of books){
 await page.goto(`${origin}/fortune/?domain=saju&request=${book.id}`);
 await expect(page.locator('.chapter-prose')).toContainText('모의 해설');
 await expect(page.locator('.chapter-prose section')).toHaveCount(book.tier==='mackerel'?4:6);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.reader-mark').click();await page.reload();await expect(page.locator('.reader-count')).toContainText('읽은 챕터 1');
 const axe=await new AxeBuilder({page}).include('.destiny-book').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);
 await page.screenshot({path:`.integration/reading-ui/${book.tier}-${width}.png`,fullPage:true});
 proof.push({width,tier:book.tier,blocks:true,resume:true,overflow:false,axe:0,firstChapterChars:bodyCharacterCount(await readChapter(db,'alice',book.id,book.tier+'-01'))});
 }
 await page.goto(origin+'/fortune/?domain=saju&profile=p');await page.getByRole('button',{name:'이 차트로 해설 선택하기'}).click();
 await page.locator('.fish-choices button').filter({hasText:'참치'}).click();await page.getByText('이 상담의 목차와 해석 범위',{exact:true}).click();await expect(page.locator('.payment-summary details ol li')).toHaveCount(12);
 await page.screenshot({path:`.integration/reading-ui/catalog-${width}.png`,fullPage:true});
 await page.goto(origin+'/room/');await page.locator('#room-reading').selectOption(books[0].id);await page.locator('#room-question').fill('연애에서 어떤 모습을 살펴볼까?');await page.getByRole('button',{name:'고민 상담하기',exact:true}).click();await expect(page.locator('.room-guide')).toContainText('모의 상담');
 await expect(page.locator('.room-guide')).toContainText('사랑할 때 드러나는 모습');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const axe=await new AxeBuilder({page}).include('.room-conversation').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);
 await page.screenshot({path:`.integration/reading-ui/room-${width}.png`,fullPage:true});
 expect(errors).toEqual([]);proof.push({width,room:true,ownedResult:true,mock:true,axe:0});await context.close();
 }
 await fs.writeFile('docs/reading-v4-ui-verification.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));sqlite.close();}

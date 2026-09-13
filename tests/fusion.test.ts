import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database,seed,profile} from './support/database';
import {products,getProduct} from '../server/payments/catalog';
import {productManifest} from '../server/fortune/product-manifest';
import {purchaseContexts,createChart} from '../server/fortune/charts';
import {domains} from '../server/fortune';
import {createOrder,grantPaidOrder} from '../server/payments/orders';
import {prepareBook,runBookStep,bookStatus,readChapter,retryBook} from '../server/fortune/books';
import {MockChapterProvider,StructuredChapterProvider} from '../server/providers/chapter';
import {dailyMessage,kstDay} from '../server/fortune/daily';
import {createShare,publicSummary} from '../server/shares';
import {analyze} from '../server/fortune/analysis';
import {handleApi} from '../server/api';
import fs from 'node:fs';
import {CARD_TO_FILENAME} from '../server/vendor/code-destiny/lib/tarot/tarot-cards.mjs';
import {fortuneSurfaces} from '../src/data/fortune';
import {chartView} from '../server/fortune/charts';
const pg={PORTONE_STORE_ID:'fixture',PORTONE_CHANNEL_KEY:'fixture'};
test('every native tarot card has a local WebP image including the JPG source exception',()=>{
 assert.equal(Object.keys(CARD_TO_FILENAME).length,78);
 for(const file of Object.values(CARD_TO_FILENAME) as string[])assert.ok(fs.existsSync('public/assets/tarot/'+file.replace(/\.jpe?g$/i,'.webp')),file);
});
test('all consultation menu illustrations exist and relationship positions have readable labels',async()=>{
 for(const surface of Object.values(fortuneSurfaces))for(const [, ,art] of surface.choices)assert.ok(fs.existsSync(art==='tarot'?'public/assets/tarot.webp':`public/assets/fortune/${art}-illustration.webp`),art);
 const c=chartView(await domains.tarot.calculate(domains.tarot.validateInput({question:'관계를 살펴볼까?',topicId:'love'})));
 assert.equal(c.groups.length,6);assert.ok(c.groups.every(g=>!g.label.includes('_')));
});
async function pay(db:ReturnType<typeof database>['db'],id:string){const o=await createOrder(db,'alice',id,'p','fixture-fusion-'+id);await grantPaidOrder(db,o,{id:o.payment_id,status:'PAID',amount:{total:o.amount},currency:'KRW',storeId:'fixture',channel:{key:'fixture'}},pg);return o;}
test('server packages have exact prices, scope, counts and unique chapter questions',()=>{
 for(const p of products){const manifest=productManifest(p);assert.equal(manifest.length,p.chapterCount);assert.equal(new Set(manifest.map(c=>c.title)).size,p.chapterCount);assert.ok(manifest.every(c=>c.systems?.every(d=>p.systems.includes(d))));if(p.readingKind==='single')assert.equal(p.systems.length,1);}
 assert.equal(getProduct('fusion_all').priceKRW,30000);assert.equal(getProduct('fusion_saju_ziwei').priceKRW,20000);
 assert.equal(products.filter(p=>p.readingKind==='pair').length,3);
 const tarot=productManifest(getProduct('tarot_tuna'));assert.ok(tarot.every(c=>! /대운|배우자 명식|10년/.test(c.title)));
 assert.notDeepEqual(productManifest(getProduct('saju_salmon'),'love'),productManifest(getProduct('saju_salmon'),'work'));
});
test('tarot accepts no birth, ignores forged cards and persists one server draw',async()=>{
 const {db,sqlite}=database();seed(sqlite,'tarot');sqlite.prepare('UPDATE profiles SET input_json=? WHERE id=?').run(JSON.stringify({question:'내가 바꿀 수 있는 선택은?',topicId:'love',cards:[{cardId:'FAKE'}]}),'p');
 const [a,b]=await Promise.all([createChart(db,'alice','p',{}),createChart(db,'alice','p',{})]);assert.equal(a.id,b.id);assert.equal(a.contexts_json,b.contexts_json);
 const c=JSON.parse(a.contexts_json).tarot,cards=c.facts.find((f:any)=>f.label==='cards').value;assert.equal(cards.length,6);assert.equal(new Set(cards.map((c:any)=>c.cardId)).size,6);assert.ok(!JSON.stringify(cards).includes('FAKE'));
 assert.equal(domains.tarot.validateInput({question:'선택'}).personA,undefined);
 await pay(db,'tarot_tuna');const r=await prepareBook(db,'alice','tarot_tuna','p',{});for(let i=0;i<71;i++)if(!await runBookStep(db,r.id,new MockChapterProvider()))break;
 assert.equal((await bookStatus(db,'alice',r.id))?.total,8);assert.equal((await createChart(db,'alice','p',{})).contexts_json,a.contexts_json);
});
for(const id of ['fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_astrology_tarot','fusion_all'])test(`${id}: charts before payment, recover chapter failure, reopen/share without repurchase`,async()=>{
 const p=getProduct(id),{db,sqlite}=database();seed(sqlite,p.domain);
 const initial=await purchaseContexts(db,'alice','p',p.domain,p.fishId,{});assert.deepEqual(Object.keys(initial.contexts).sort(),[...p.systems].sort());
 if(p.systems.includes('tarot'))assert.equal((initial.contexts.tarot!.facts.find(f=>f.label==='cards')!.value as any[]).length,6);
 const o=await pay(db,id),r=await prepareBook(db,'alice',id,'p',{});
 const m=productManifest(p);for(let i=0;i<3;i++)await runBookStep(db,r.id,new MockChapterProvider());const first=await readChapter(db,'alice',r.id,m[0].id);
 await runBookStep(db,r.id,new MockChapterProvider(m[3].id));await retryBook(db,'alice',r.id);
 for(let i=0;i<p.chapterCount+2;i++)if(!await runBookStep(db,r.id,new MockChapterProvider()))break;
 const b=(await bookStatus(db,'alice',r.id))!;assert.equal(b.status,'SUCCEEDED');assert.equal(b.total,p.chapterCount);assert.equal(b.charts.length,p.systems.length);assert.deepEqual(await readChapter(db,'alice',r.id,m[0].id),first);
 assert.ok(!JSON.stringify(b).includes('모의 해설'));await assert.rejects(()=>bookStatus(db,'bob',r.id),/RESULT_NOT_FOUND/);
 assert.equal((await prepareBook(db,'alice',id,'p',{})).id,r.id);assert.equal((await pay(db,id)).id,o.id);
 const share=await createShare(db,'alice',r.id,{});const summary=await publicSummary(db,share.shareId);assert.equal(summary!.tier,p.fishId);assert.ok(!JSON.stringify(summary).includes('1997-02-10'));
 const restored=await purchaseContexts(db,'alice','p',p.domain,p.fishId,{});assert.deepEqual(restored.contexts,initial.contexts);
});
test('new tuna is single system while a legacy paid tuna keeps four systems',async()=>{
 for(const legacy of [false,true]){const {db,sqlite}=database();seed(sqlite);await createChart(db,'alice','p',{});const o=await pay(db,'saju_tuna');if(legacy){sqlite.prepare('DELETE FROM order_specs WHERE order_id=?').run(o.id);sqlite.prepare("UPDATE order_chart_links SET manifest_version='destiny-book-v2' WHERE order_id=?").run(o.id);}const r=await prepareBook(db,'alice','saju_tuna','p',{});const b=(await bookStatus(db,'alice',r.id))!;assert.equal(b.charts.length,legacy?4:1);assert.equal(b.version,legacy?'destiny-book-v2':'destiny-book-v4');}
});
test('daily phrase is KST-cached, profile-owned and degrades explicitly without enough data',async()=>{
 const {db,sqlite}=database();seed(sqlite);const before=new Date('2026-09-13T14:59:59Z'),after=new Date('2026-09-13T15:00:00Z');assert.notEqual(kstDay(before),kstDay(after));
 const a=await dailyMessage(db,'alice','p','tarot',{},before),b=await dailyMessage(db,'alice','p','tarot',{},before);assert.deepEqual(a,b);assert.equal(a.kind,'daily-card');
 assert.notEqual((await dailyMessage(db,'alice','p','tarot',{},after)).day,a.day);
 await assert.rejects(()=>dailyMessage(db,'bob','p','saju',{},before),/PROFILE_NOT_FOUND/);
 sqlite.prepare('UPDATE profiles SET input_json=? WHERE id=?').run(JSON.stringify({question:'선택'}),'p');const general=await dailyMessage(db,'alice','p','vedic',{},before);assert.equal(general.kind,'general');assert.match(general.notice,/부족/);
});
test('all 28 structured chapter requests stay in scope without calling an external provider',async()=>{
 const {db,sqlite}=database();seed(sqlite);const p=getProduct('fusion_all');const {contexts}=await purchaseContexts(db,'alice','p',p.domain,p.fishId,{});const analysis={...analyze(contexts),topicId:'work',question:'내가 선택할 일은?'};
 for(const chapter of productManifest(p,'work')){
  let called=false;
  await new StructuredChapterProvider({async generate(req){called=true;assert.ok(JSON.stringify(req.calculatedData).length<=180000);assert.ok(!JSON.stringify(req.calculatedData).includes('1997-02-10'));assert.ok(req.calculatedData.facts.every(f=>chapter.systems?.some(d=>f.id.startsWith(d+'.'))));assert.equal(req.userQuestion,analysis.question);return {result:await new MockChapterProvider().generateChapter({chapter,analysis,previous:[]}),provider:'mock',model:'injected-test'};}}).generateChapter({chapter,analysis,previous:[]});
  assert.equal(called,true);
 }
});
test('fusion missing required birth data stops before an order and daily responses are private',async()=>{
 const {db,sqlite}=database();seed(sqlite);sqlite.prepare('UPDATE profiles SET input_json=? WHERE id=?').run(JSON.stringify({personA:{...profile,birthTime:undefined},question:'진로'}),'p');
 await assert.rejects(()=>purchaseContexts(db,'alice','p','saju','omakase',{}),/BIRTH_TIME_REQUIRED/);
 assert.equal((sqlite.prepare('SELECT COUNT(*) n FROM orders').get() as {n:number}).n,0);
 const r=await handleApi(new Request('http://local/api/yeongnyangi/daily?domain=saju'),{DB:db,APP_ENV:'local'},()=>{});assert.match(r.headers.get('cache-control')!,/no-store/);assert.equal(r.status,401);
 const privateResult=await handleApi(new Request('http://local/api/yeongnyangi/daily?domain=saju&profileId=p'),{DB:db,APP_ENV:'local'},()=>{});assert.equal(privateResult.status,401);
});

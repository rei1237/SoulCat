import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support/database';
import {createOrder,grantPaidOrder} from '../server/payments/orders';
import {applyPayment,reconcilePayment} from '../server/payments/reconcile';
import {checkoutChannel,verifyPayment} from '../server/payments/portone';
import {reserveCost,budgetConfig,BudgetedGemini,productBudgetReady,kstDay} from '../server/providers/budget';
import {GeminiProvider} from '../server/providers/gemini';
import {safeReturnPath} from '../src/lib/return-path';
import {saveTicket,readTicket,confirmCheckout,launchCheckout,CheckoutOrder} from '../src/lib/checkout';
import {prepareBook,runBookStep,bookStatus,retryBook,deliverOutbox} from '../server/fortune/books';
import {createChart} from '../server/fortune/charts';
import {MockChapterProvider} from '../server/providers/chapter';
import {FortuneError,FortuneLLMRequest} from '../server/fortune/shared/contracts';
import {handleApi} from '../server/api';
import {createHmac} from 'node:crypto';
const config={PORTONE_STORE_ID:'fixture-store',PORTONE_CARD_CHANNEL_KEY:'fixture-card',PORTONE_KAKAO_CHANNEL_KEY:'fixture-kakao',PORTONE_KAKAO_TYPE:'kakaopay',PORTONE_API_SECRET:'fixture',PORTONE_WEBHOOK_SECRET:'fixture',PAYMENTS_ENABLED:'true'};
async function fixture(){
  const {db,sqlite}=database();
  sqlite.prepare('INSERT INTO users VALUES (?,?)').run('alice',0);
  sqlite.prepare('INSERT INTO profiles VALUES (?,?,?,?,?)').run('p','alice','saju',JSON.stringify({personA:{birthDate:'1997-02-10',birthTime:'14:30',gender:'female',calendarType:'solar'},question:'일'}),0);
  await createChart(db,'alice','p',{});
  const order=await createOrder(db,'alice','saju_mackerel','p','fixture-order-key',{storeId:'fixture-store',channelKey:'fixture-card',method:'CARD',returnPath:'/fortune/?profile=p'});
  const pg={id:order.payment_id,status:'PAID',amount:{total:1000,paid:1000,cancelled:0},currency:'KRW',storeId:'fixture-store',channel:{key:'fixture-card'}};
  return {db,sqlite,order,pg};
}
test('live checkout reuses one pending order across independent tabs',async()=>{
  const {db,sqlite,order}=await fixture();
  const second=await createOrder(db,'alice','saju_mackerel','p','another-random-key',{storeId:'fixture-store',channelKey:'fixture-card',method:'CARD',returnPath:'/library/'});
  assert.equal(second.id,order.id);assert.equal(sqlite.prepare('SELECT count(*) n FROM orders').get()!.n,1);
  await assert.rejects(createOrder(db,'bob','saju_mackerel','p','another-random-key'),/PROFILE_NOT_FOUND/);
});
test('paid checks bind to original channel even if current channel rotates',async()=>{
  const {order,pg}=await fixture();
  assert.doesNotThrow(()=>verifyPayment(pg,order,{PORTONE_STORE_ID:'rotated',PORTONE_CHANNEL_KEY:'rotated'}));
  for(const patch of [{amount:{total:1000}},{amount:{total:1000,paid:999}},{channel:{key:'fixture-kakao'}},{currency:'USD'},{storeId:'other'}])assert.throws(()=>verifyPayment({...pg,...patch},order,config));
  assert.equal(checkoutChannel(config,'CARD'),'fixture-card');assert.equal(checkoutChannel(config,'KAKAOPAY'),'fixture-kakao');
  assert.throws(()=>checkoutChannel({...config,PORTONE_KAKAO_TYPE:''},'KAKAOPAY'));
  assert.throws(()=>checkoutChannel({...config,PORTONE_KAKAO_CHANNEL_KEY:'fixture-card'},'CARD'));
});
test('partial/full cancellation revokes book and resists a stale paid event',async()=>{
  for(const amount of [500,1000]){
    const {db,sqlite,order,pg}=await fixture();
    await applyPayment(db,order,pg,config);await applyPayment(db,order,pg,config);
    const request=await prepareBook(db,'alice',order.product_id,'p',{});
    let finish!:(v:unknown)=>void;
    const task=runBookStep(db,request.id,{generateChapter:async input=>{const data=await new MockChapterProvider().generateChapter(input);return new Promise(resolve=>{finish=()=>resolve(data);});}});
    while(!finish)await new Promise(resolve=>setTimeout(resolve,1));
    const cancelled={...pg,status:amount===1000?'CANCELLED':'PARTIAL_CANCELLED',amount:{total:1000,paid:1000-amount,cancelled:amount}};
    await applyPayment(db,order,cancelled,config);finish(null);await task;
    await applyPayment(db,order,pg,config);
    assert.equal(sqlite.prepare('SELECT status FROM orders').get()!.status,'REFUNDED');
    assert.equal(sqlite.prepare('SELECT status FROM entitlements').get()!.status,'REVOKED');
    assert.equal(sqlite.prepare('SELECT count(*) n FROM fortune_outbox').get()!.n,0);
    assert.equal(sqlite.prepare("SELECT count(*) n FROM fortune_chapters WHERE status='completed'").get()!.n,0);
    await assert.rejects(bookStatus(db,'alice',request.id));
  }
});
test('failed lookup does not grant and concurrent verification is rate limited',async()=>{
  const {db,sqlite,order,pg}=await fixture();let calls=0;
  const transport=async()=>{calls++;return Response.json(pg);};
  const values=await Promise.allSettled([reconcilePayment(db,order,config,transport),reconcilePayment(db,order,config,transport)]);
  assert.equal(calls,1);assert.equal(values.filter(v=>v.status==='rejected').length,1);
  assert.equal(sqlite.prepare('SELECT count(*) n FROM entitlements').get()!.n,1);
});
test('untrusted webhook and unauthenticated verification cannot grant',async()=>{
  const {db,sqlite,order}=await fixture();
  for(const path of ['payments/webhook','payments/verify']){
    const r=await handleApi(new Request('https://staging.code-destiny.com/api/yeongnyangi/'+path,{method:'POST',headers:{origin:'https://staging.code-destiny.com','content-type':'application/json'},body:JSON.stringify({orderId:order.id,paymentId:order.payment_id,data:{paymentId:order.payment_id}})}),{...config,DB:db,APP_ENV:'staging'},()=>{});
    assert.equal(r.status,401);
  }
  assert.equal(sqlite.prepare('SELECT count(*) n FROM entitlements').get()!.n,0);
});
test('signed duplicate webhook grants and queues once even while checkout is disabled',async()=>{
  const {db,sqlite,order,pg}=await fixture();
  const secret=Buffer.from('webhook-fixture-only').toString('base64'),id='event-fixture',timestamp=String(Math.floor(Date.now()/1000));
  const body=JSON.stringify({type:'Transaction.Paid',data:{paymentId:order.payment_id}});
  const signature=createHmac('sha256',Buffer.from(secret,'base64')).update(`${id}.${timestamp}.${body}`).digest('base64');
  const original=globalThis.fetch;let lookups=0;
  globalThis.fetch=async input=>{assert.ok(String(input).startsWith('https://api.portone.io/payments/'));lookups++;return Response.json(pg);};
  try{
    for(let i=0;i<2;i++){
      const r=await handleApi(new Request('https://staging.code-destiny.com/api/yeongnyangi/payments/webhook',{method:'POST',headers:{'content-type':'application/json','webhook-id':id,'webhook-timestamp':timestamp,'webhook-signature':`v1,${signature}`},body}),{...config,PORTONE_WEBHOOK_SECRET:secret,PAYMENTS_ENABLED:'false',DB:db,APP_ENV:'staging'},()=>{});
      assert.equal(r.status,200,await r.text());
    }
    assert.equal(lookups,1);assert.equal(sqlite.prepare('SELECT count(*) n FROM entitlements').get()!.n,1);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM fortune_outbox').get()!.n,1);
  }finally{globalThis.fetch=original;}
});
test('safe return paths discard raw personal data and encoded path escapes',()=>{
  for(const path of ['//evil.test','/\\evil.test','/%2ffortune/','/fortune/%2e%2e/','/api/me','https://evil.test','/fortune/../room/'])assert.equal(safeReturnPath(path),'/fortune/');
  assert.equal(safeReturnPath('/library/?profile=p&birthDate=1990-01-01&question=private&token=secret'),'/library/?profile=p');
  assert.equal(safeReturnPath('/fortune/?profile=p&profile=q'),'/fortune/');
});
class MemoryStorage implements Storage { data=new Map<string,string>(); get length(){return this.data.size;} clear(){this.data.clear();} key(n:number){return [...this.data.keys()][n]??null;} getItem(k:string){return this.data.get(k)??null;} setItem(k:string,v:string){this.data.set(k,v);} removeItem(k:string){this.data.delete(k);} }
const checkout={orderId:'order',paymentId:'payment',productId:'saju_mackerel',profileId:'profile',returnPath:'/fortune/?profile=profile',payment:{}} as CheckoutOrder;
test('localStorage ticket identity, expiry, storage failure and duplicate return',async()=>{
  const storage=new MemoryStorage();saveTicket(storage,checkout,100);
  assert.equal(readTicket(storage,'payment','other',101),null);assert.ok(readTicket(storage,'payment','order',101));
  assert.equal(readTicket(storage,'payment','order',86400101),null);assert.equal(storage.length,0);
  assert.throws(()=>saveTicket({...storage,setItem(){throw new Error();}} as unknown as Storage,checkout));
  const t=saveTicket(storage,checkout);let calls=0;
  const verify=async()=>{calls++;return {status:'PAID',requestId:'request'};};
  await Promise.all([confirmCheckout(t,storage,verify),confirmCheckout(t,storage,verify)]);
  assert.equal(calls,1);assert.equal(storage.length,0);
});
const budget={LLM_COST_MODE:'test',LLM_TEST_BUDGET_KRW:'1000',APP_ENV:'staging',GEMINI_MODEL:'fixture-model',GEMINI_PRICING_MODEL:'fixture-model',LLM_REQUEST_BUDGET_KRW:'1000',LLM_DAILY_BUDGET_KRW:'1000',LLM_TIMEOUT_MS:'60000',LLM_MAX_RETRIES:'2',LLM_MAX_INPUT_TOKENS:'10000',LLM_MAX_OUTPUT_TOKENS:'4096',GEMINI_INPUT_USD_PER_MILLION:'1',GEMINI_OUTPUT_USD_PER_MILLION:'2',LLM_USD_KRW_CEILING:'1500',LLM_PRICING_VALID_UNTIL:'2099-01-01'};
async function paidRequest(){const f=await fixture();await grantPaidOrder(f.db,f.order,f.pg,config);const r=await prepareBook(f.db,'alice',f.order.product_id,'p',{});return {...f,requestId:r.id};}
test('atomic daily and lifetime budgets, unknown reservations and KST rollover',async()=>{
  const {db,sqlite,requestId}=await paidRequest();
  const r=await Promise.allSettled([reserveCost(db,requestId,600,1000,1000,0),reserveCost(db,requestId,600,1000,1000,0)]);
  assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
  await assert.rejects(reserveCost(db,requestId,500,1000,1000,86400000),/LLM_REQUEST_BUDGET/);
  assert.equal(sqlite.prepare('SELECT sum(reserved) n FROM llm_reservations').get()!.n,600);
  assert.notEqual(kstDay(Date.parse('2026-09-13T14:59:59Z')),kstDay(Date.parse('2026-09-13T15:00:00Z')));
});
test('cost config and product validation fail closed',()=>{
  assert.doesNotThrow(()=>budgetConfig(budget));
  for(const patch of [{LLM_DAILY_BUDGET_KRW:'1001'},{LLM_PRICING_VALID_UNTIL:'yesterday'},{GEMINI_PRICING_MODEL:'other'},{LLM_MAX_RETRIES:'3'},{APP_ENV:'local'}])assert.throws(()=>budgetConfig({...budget,...patch}));
  assert.throws(()=>productBudgetReady(budget,'saju_mackerel',5));
});
test('test budget is cumulative across days, production only meters without a customer cap',async()=>{
  const {db,requestId}=await paidRequest();
  await reserveCost(db,requestId,600,1000,1000,0,1000);
  await assert.rejects(reserveCost(db,requestId,500,1000,1000,86400000,1000),/LLM_TEST_BUDGET/);
  await assert.doesNotReject(reserveCost(db,requestId,2000,1000,1000,86400000,null,true));
  assert.doesNotThrow(()=>budgetConfig({...budget,APP_ENV:'production',LLM_COST_MODE:'metered',LLM_TEST_BUDGET_KRW:undefined,LLM_DAILY_BUDGET_KRW:undefined}));
});
test('card and Kakao Promise and redirect share the same minimal recovery ticket',async()=>{
  for(const method of ['CARD','EASY_PAY'] as const){
    const storage=new MemoryStorage();let calls=0;
    const order={...checkout,payment:{storeId:'fixture',channelKey:method==='CARD'?'card':'kakao',paymentId:'payment',orderName:'fixture',totalAmount:1000,currency:'CURRENCY_KRW',payMethod:method}} as CheckoutOrder;
    const verified=await launchCheckout(order,{fullName:'fixture',phoneNumber:'000',email:'fixture@example.test'},storage,async input=>{
      assert.equal(input.channelKey,method==='CARD'?'card':'kakao');
      assert.ok(readTicket(storage,'payment','order'));
      assert.ok(![...storage.data.values()].join('').includes('example.test'));
      return {paymentId:'payment',transactionType:'PAYMENT',txId:'fixture'};
    },async()=>{calls++;return {status:'PAID',requestId:'request'};});
    assert.equal(verified.status,'PAID');assert.equal(calls,1);assert.equal(storage.length,0);
    await launchCheckout(order,{fullName:'fixture',phoneNumber:'000',email:'fixture@example.test'},storage,async()=>undefined);
    assert.ok(readTicket(storage,'payment','order'));
  }
});
test('Gemini successful usage settles; timeout remains reserved without automatic retry',async()=>{
  const prompt={system:'system',domainRules:'facts',calculatedData:{facts:[]},userQuestion:'question',outputSchema:{},sectionTitles:[],promptVersion:'test'} as unknown as FortuneLLMRequest;
  for(const timeout of [false,true]){
    const {db,sqlite,requestId}=await paidRequest();let generations=0;
    const provider=new GeminiProvider('fixture','fixture-model',async function(this:unknown,url){
      assert.equal(this,globalThis,'Workers native fetch requires its global receiver');
      if(String(url).endsWith('countTokens'))return Response.json({totalTokens:100});
      generations++;if(timeout)throw new DOMException('timeout','TimeoutError');
      return Response.json({usageMetadata:{promptTokenCount:100,totalTokenCount:130},candidates:[{finishReason:'STOP',content:{parts:[{text:'{}'}]}}]});
    });
    const wrapped=new BudgetedGemini(db,requestId,budget,provider);
    if(timeout)await assert.rejects(wrapped.generate(prompt),/LLM_TIMEOUT/);else await wrapped.generate(prompt);
    assert.equal(generations,1);
    assert.equal(sqlite.prepare('SELECT state FROM llm_reservations').get()!.state,timeout?'RESERVED':'SETTLED');
  }
});
test('daily cap keeps entitlement, delays outbox and never hot-loops',async()=>{
  const {db,sqlite,requestId}=await paidRequest();
  await runBookStep(db,requestId,{async generateChapter(){throw new FortuneError('LLM_DAILY_BUDGET',503);}});
  let sends=0;await deliverOutbox(db,{async send(){sends++;}});
  assert.equal(sends,0);assert.equal(sqlite.prepare('SELECT status FROM entitlements').get()!.status,'ACTIVE');
  assert.equal(sqlite.prepare('SELECT status FROM fortune_requests').get()!.status,'PENDING');
});
test('timeout stays quarantined until explicit retry, then completes same entitlement',async()=>{
  const {db,sqlite,requestId}=await paidRequest();
  await runBookStep(db,requestId,{async generateChapter(){throw new FortuneError('LLM_TIMEOUT');}});
  let calls=0;await runBookStep(db,requestId,{async generateChapter(){calls++;throw new Error();}});assert.equal(calls,0);
  await retryBook(db,'alice',requestId);
  for(let i=0;i<6;i++)await runBookStep(db,requestId,new MockChapterProvider());
  assert.equal((await bookStatus(db,'alice',requestId))!.status,'SUCCEEDED');
  assert.equal(sqlite.prepare('SELECT count(*) n FROM entitlements').get()!.n,1);
});

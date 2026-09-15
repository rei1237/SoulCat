import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support/database';
import {createOrder,grantProofOrder} from '../server/payments/orders';
import {reserveCost,budgetConfig,BudgetedGemini,productBudgetReady,kstDay} from '../server/providers/budget';
import {GeminiProvider} from '../server/providers/gemini';
import {safeReturnPath} from '../src/lib/return-path';
import {prepareBook,runBookStep,bookStatus,retryBook,deliverOutbox} from '../server/fortune/books';
import {createChart} from '../server/fortune/charts';
import {MockChapterProvider} from '../server/providers/chapter';
import {FortuneError,FortuneLLMRequest} from '../server/fortune/shared/contracts';
async function fixture(){
  const {db,sqlite}=database();
  sqlite.prepare('INSERT INTO users VALUES (?,?)').run('alice',0);
  sqlite.prepare('INSERT INTO profiles VALUES (?,?,?,?,?)').run('p','alice','saju',JSON.stringify({personA:{birthDate:'1997-02-10',birthTime:'14:30',gender:'female',calendarType:'solar'},question:'일'}),0);
  await createChart(db,'alice','p',{});
  const order=await createOrder(db,'alice','saju_mackerel','p','fixture-order-key');
  return {db,sqlite,order};
}
test('safe return paths discard raw personal data and encoded path escapes',()=>{
  for(const path of ['//evil.test','/\\evil.test','/%2ffortune/','/yeongnyangi/fortune/%2e%2e/','/api/me','https://evil.test','/yeongnyangi/fortune/../room/'])assert.equal(safeReturnPath(path),'/yeongnyangi/fortune/');
  assert.equal(safeReturnPath('/yeongnyangi/library/?profile=p&birthDate=1990-01-01&question=private&token=secret'),'/yeongnyangi/library/?profile=p');
  assert.equal(safeReturnPath('/yeongnyangi/fortune/?profile=p&profile=q'),'/yeongnyangi/fortune/');
});
const budget={LLM_COST_MODE:'test',LLM_TEST_BUDGET_KRW:'1000',APP_ENV:'staging',GEMINI_MODEL:'fixture-model',GEMINI_PRICING_MODEL:'fixture-model',LLM_REQUEST_BUDGET_KRW:'1000',LLM_DAILY_BUDGET_KRW:'1000',LLM_TIMEOUT_MS:'60000',LLM_MAX_RETRIES:'2',LLM_MAX_INPUT_TOKENS:'10000',LLM_MAX_OUTPUT_TOKENS:'4096',GEMINI_INPUT_USD_PER_MILLION:'1',GEMINI_OUTPUT_USD_PER_MILLION:'2',LLM_USD_KRW_CEILING:'1500',LLM_PRICING_VALID_UNTIL:'2099-01-01'};
async function paidRequest(){const f=await fixture();await grantProofOrder(f.db,f.order,'fixture-'+f.order.id,f.order.amount);const r=await prepareBook(f.db,'alice',f.order.product_id,'p',{});return {...f,requestId:r.id};}
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
    const validationUser='codedestiny:0123456789abcdef01234567';
    sqlite.prepare("INSERT INTO users(id,created_at) VALUES (?,0)").run(validationUser);
    sqlite.prepare("UPDATE orders SET user_id=?").run(validationUser);
    const wrapped=new BudgetedGemini(db,requestId,{...budget,STAGING_TEST_USER_IDS:validationUser,STAGING_TEST_PRODUCT_IDS:'saju_mackerel',STAGING_PAYMENT_RUN:'soulcat-login-payment-20260913'},provider);
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

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database,profile} from './support/database';
import {checkoutUrl,listUnconsumedProofs,consumeProof} from '../server/payments/cd-entitlement';
import {createOrder,grantProofOrder} from '../server/payments/orders';
import {getProduct,products} from '../server/payments/catalog';
import {createChart} from '../server/fortune/charts';
import {validationRun} from '../server/providers/budget';
import {handleApi} from '../server/api';

const origin='https://staging.code-destiny.com';
const user='codedestiny:0123456789abcdef01234567';
const cookie={cookie:'fortune_auth_token=fixture'};
const authEnv={APP_ENV:'staging',PUBLIC_ORIGIN:origin};
function cdStub(proofs:unknown[],consume:(body:{paymentId:string;requestId:string})=>Response=()=>Response.json({ok:true,idempotent:false})){
  const calls:{url:string;method:string;body?:{paymentId:string;requestId:string}}[]=[];
  return {calls,AUTH_SERVICE:{async fetch(req:Request){
    const url=new URL(req.url);
    if(url.pathname==='/api/auth/me')return Response.json({authenticated:true,user:{id:user.slice(12)}});
    assert.equal(url.pathname,'/api/yeongnyangi-entitlement');
    assert.equal(req.headers.get('cookie'),'fortune_auth_token=fixture');
    if(req.method==='POST'){const body=await req.json() as {paymentId:string;requestId:string};calls.push({url:req.url,method:'POST',body});return consume(body);}
    calls.push({url:req.url,method:'GET'});
    return Response.json({ok:true,featureKey:url.searchParams.get('featureKey'),proofs});
  }}};
}

test('every catalog product maps to a Code Destiny direct-only feature key and is enabled',()=>{
  for(const p of products){assert.match(p.cdFeatureKey,/^yeongnyangi-[a-z0-9-]+$/);assert.equal(p.enabled,true);}
  assert.equal(getProduct('saju_mackerel').cdFeatureKey,'yeongnyangi-saju-mackerel');
  assert.equal(getProduct('fusion_all').cdFeatureKey,'yeongnyangi-fusion-all');
  assert.equal(checkoutUrl('yeongnyangi-saju-mackerel','/yeongnyangi/fortune/?profile=p'),'/checkout/?featureKey=yeongnyangi-saju-mackerel&returnTo=%2Fyeongnyangi%2Ffortune%2F%3Fprofile%3Dp');
});
test('proof lookup forwards the session cookie and counts only unconsumed proofs of the same key',async()=>{
  const req=new Request(origin+'/api/yeongnyangi/orders',{headers:cookie});
  const stub=cdStub([{id:'mu-1',amountKRW:1000,featureKey:'yeongnyangi-saju-mackerel'},{id:'mu-2',amountKRW:1000,featureKey:'yeongnyangi-saju-mackerel',consumedBy:'other'},{id:'mu-3',amountKRW:1000,featureKey:'yeongnyangi-saju-salmon'}]);
  const proofs=await listUnconsumedProofs(req,{...authEnv,...stub},'yeongnyangi-saju-mackerel');
  assert.deepEqual(proofs.map(p=>p.id),['mu-1']);
  await assert.rejects(listUnconsumedProofs(new Request(origin+'/api/yeongnyangi/orders'),{...authEnv,...stub},'yeongnyangi-saju-mackerel'),/SESSION_REQUIRED/);
  await assert.rejects(listUnconsumedProofs(req,{...authEnv,AUTH_SERVICE:{async fetch(){return new Response('down',{status:502});}}},'yeongnyangi-saju-mackerel'),/PAYMENT_PROOF_UNAVAILABLE/);
  await assert.rejects(listUnconsumedProofs(req,{...authEnv},'yeongnyangi-saju-mackerel'),/PAYMENT_PROOF_UNAVAILABLE/);
  assert.equal(await consumeProof(req,{...authEnv,...cdStub([],()=>Response.json({code:'ALREADY_CONSUMED'},{status:409}))},'mu-1','order-1'),false);
  assert.equal(await consumeProof(req,{...authEnv,...stub},'mu-1','order-1'),true);
  assert.deepEqual(stub.calls.at(-1)?.body,{paymentId:'mu-1',requestId:'order-1'});
});
test('a Code Destiny proof grants order, payment and entitlement atomically and only for the exact amount',async()=>{
  const {db,sqlite}=database();
  sqlite.prepare('INSERT INTO users VALUES (?,0)').run(user);
  sqlite.prepare('INSERT INTO profiles VALUES (?,?,?,?,0)').run('p',user,'saju','{}');
  const order=await createOrder(db,user,'saju_mackerel','p','unique-cd-proof-0001');
  assert.equal(order.status,'PENDING');
  await assert.rejects(grantProofOrder(db,order,'mu-1',3000),/PAYMENT_AMOUNT_MISMATCH/);
  await assert.rejects(grantProofOrder(db,order,'bad id',1000),/PAYMENT_PROOF_INVALID/);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM entitlements').get()!.n,0);
  await grantProofOrder(db,order,'mu-1',1000);
  assert.equal(sqlite.prepare('SELECT status FROM orders WHERE id=?').get(order.id)!.status,'PAID');
  assert.equal(sqlite.prepare('SELECT id FROM payments WHERE order_id=?').get(order.id)!.id,'cd:mu-1');
  assert.equal(sqlite.prepare('SELECT status FROM entitlements WHERE order_id=?').get(order.id)!.status,'ACTIVE');
  const again=await createOrder(db,user,'saju_mackerel','p','unique-cd-proof-0002');
  assert.equal(again.id,order.id);
});
test('POST orders answers 402 with the CD checkout URL without a proof, and books the reading with one',async()=>{
  const {db,sqlite}=database();
  sqlite.prepare('INSERT INTO users VALUES (?,0)').run(user);
  sqlite.prepare('INSERT INTO profiles VALUES (?,?,?,?,0)').run('p',user,'saju',JSON.stringify({personA:profile,readingMode:'personal',question:'일'}));
  await createChart(db,user,'p',{});
  const sent:string[]=[];
  const base={DB:db,...authEnv,LLM_PROVIDER:'gemini',ALLOW_LIVE_LLM:'true',GEMINI_API_KEY:'fixture',BOOK_QUEUE:{async send(m:{requestId:string}){sent.push(m.requestId);}},
    STAGING_PAYMENT_RUN:validationRun,STAGING_TEST_PRODUCT_IDS:'saju_mackerel',LLM_STAGING_VALIDATION_MANIFEST:'destiny-book-v4',LLM_COST_MODE:'test',LLM_TEST_BUDGET_KRW:'1000',LLM_DAILY_BUDGET_KRW:'1000',LLM_TIMEOUT_MS:'60000',LLM_MAX_RETRIES:'2',LLM_MAX_INPUT_TOKENS:'32000',LLM_MAX_OUTPUT_TOKENS:'4096',GEMINI_MODEL:'fixture',GEMINI_PRICING_MODEL:'fixture',GEMINI_INPUT_USD_PER_MILLION:'0.3',GEMINI_OUTPUT_USD_PER_MILLION:'2.5',LLM_USD_KRW_CEILING:'2000',LLM_PRICING_VALID_UNTIL:new Date(Date.now()+86400000).toISOString()};
  const post=(body:object)=>new Request(origin+'/api/yeongnyangi/orders',{method:'POST',headers:{...cookie,origin,'content-type':'application/json'},body:JSON.stringify(body)});
  const none=cdStub([]);
  const denied=await handleApi(post({productId:'saju_mackerel',profileId:'p',idempotencyKey:'unique-cd-order-0001'}),{...base,...none} as never,()=>{});
  assert.equal(denied.status,402);
  const body=await denied.json() as {code:string;checkoutUrl:string;featureKey:string;amountKRW:number;message:string};
  assert.equal(body.code,'PAYMENT_REQUIRED');
  assert.equal(body.featureKey,'yeongnyangi-saju-mackerel');
  assert.equal(body.amountKRW,1000);
  assert.equal(body.checkoutUrl,'/checkout/?featureKey=yeongnyangi-saju-mackerel&returnTo='+encodeURIComponent('/yeongnyangi/fortune/?domain=saju&fish=mackerel&profile=p'));
  assert.match(body.message,/단건 결제/);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM orders').get()!.n,0);
  // 금액이 다른 증빙은 증빙이 아니다.
  const wrong=await handleApi(post({productId:'saju_mackerel',profileId:'p',idempotencyKey:'unique-cd-order-0002'}),{...base,...cdStub([{id:'mu-9',amountKRW:3000,featureKey:'yeongnyangi-saju-mackerel'}])} as never,()=>{});
  assert.equal(wrong.status,402);
  const stub=cdStub([{id:'mu-1',amountKRW:1000,featureKey:'yeongnyangi-saju-mackerel'}]);
  const paid=await handleApi(post({productId:'saju_mackerel',profileId:'p',idempotencyKey:'unique-cd-order-0003'}),{...base,...stub} as never,()=>{});
  assert.equal(paid.status,200,JSON.stringify(await paid.clone().json()));
  const ok=await paid.json() as {status:string;requestId:string};
  assert.equal(ok.status,'PAID');
  assert.deepEqual(sent,[ok.requestId]);
  const order=sqlite.prepare('SELECT id,status FROM orders').get() as {id:string;status:string};
  assert.equal(order.status,'PAID');
  assert.equal(sqlite.prepare('SELECT id FROM payments WHERE order_id=?').get(order.id)!.id,'cd:mu-1');
  assert.deepEqual(stub.calls.filter(c=>c.method==='POST').map(c=>c.body),[{paymentId:'mu-1',requestId:order.id}]);
  // 증빙을 다른 요청이 먼저 썼으면 권리를 주지 않고 결제창으로 되돌린다.
  sqlite.prepare("UPDATE entitlements SET status='REVOKED'").run();
  sqlite.prepare("UPDATE orders SET status='REFUNDED'").run();
  const raced=await handleApi(post({productId:'saju_mackerel',profileId:'p',idempotencyKey:'unique-cd-order-0004'}),{...base,...cdStub([{id:'mu-2',amountKRW:1000,featureKey:'yeongnyangi-saju-mackerel'}],()=>Response.json({code:'ALREADY_CONSUMED'},{status:409}))} as never,()=>{});
  assert.equal(raced.status,402);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM entitlements WHERE status=?').get('ACTIVE')!.n,0);
});

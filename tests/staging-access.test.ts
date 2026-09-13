import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support/database';
import {createOrder} from '../server/payments/orders';
import {stagingProductEnabled, validationRun} from '../server/payments/staging-access';
import {handleApi} from '../server/api';
import {handleEdge,routeKind} from '../server/edge';
import {safeReturnPath} from '../src/lib/return-path';
import {productBudgetReady} from '../server/providers/budget';
import {getProduct} from '../server/payments/catalog';

const user='codedestiny:0123456789abcdef01234567';
const env={APP_ENV:'staging',PAYMENTS_ENABLED:'true',STAGING_PAYMENT_RUN:validationRun,STAGING_TEST_PRODUCT_IDS:'saju_mackerel',STAGING_TEST_USER_IDS:user};

test('the actual validation catalog satisfies the five chapter live budget gate',()=>{
  const live={...env,LLM_STAGING_VALIDATION_MANIFEST:'destiny-book-v4',LLM_COST_MODE:'test',LLM_TEST_BUDGET_KRW:'1000',LLM_DAILY_BUDGET_KRW:'1000',LLM_TIMEOUT_MS:'60000',LLM_MAX_RETRIES:'2',LLM_MAX_INPUT_TOKENS:'32000',LLM_MAX_OUTPUT_TOKENS:'4096',GEMINI_MODEL:'fixture',GEMINI_PRICING_MODEL:'fixture',GEMINI_INPUT_USD_PER_MILLION:'0.3',GEMINI_OUTPUT_USD_PER_MILLION:'2.5',LLM_USD_KRW_CEILING:'2000',LLM_PRICING_VALID_UNTIL:new Date(Date.now()+86400000).toISOString()};
  const product=getProduct('saju_mackerel');
  assert.equal(product.chapterCount,5);
  assert.doesNotThrow(()=>productBudgetReady(live,product.id,product.chapterCount));
  assert.throws(()=>productBudgetReady({...live,APP_ENV:'production'},product.id,product.chapterCount));
});
test('staging sale requires the approved account and exact product; production is always closed',()=>{
  assert.equal(stagingProductEnabled(env,user,'saju_mackerel'),true);
  for(const patch of [{APP_ENV:'production'},{PAYMENTS_ENABLED:'false'},{STAGING_PAYMENT_RUN:''},{STAGING_TEST_PRODUCT_IDS:'saju_mackerel,tarot_mackerel'},{STAGING_TEST_USER_IDS:'*'}]) assert.equal(stagingProductEnabled({...env,...patch},user,'saju_mackerel'),false);
  for(const id of [undefined,'attacker','codedestiny:abcdef0123456789abcdef01'])assert.equal(stagingProductEnabled(env,id,'saju_mackerel'),false);
  assert.equal(stagingProductEnabled(env,user,'saju_tuna'),false);
});
test('catalog visibility uses the same verified identity as order authorization',async()=>{
  for(const authenticated of [false,true]){
    const response=await handleApi(new Request('https://staging.code-destiny.com/api/yeongnyangi/products',{headers:authenticated?{cookie:'fortune_auth_token=fixture'}:{}}),{
      ...env,PUBLIC_ORIGIN:'https://staging.code-destiny.com',AUTH_SERVICE:{async fetch(){return Response.json({authenticated:true,user:{id:user.slice(12)}});}},
    },()=>{});
    assert.equal(response.status,200);
    const body=await response.json() as {products:{id:string;enabled:boolean}[]};
    assert.deepEqual(body.products.filter(p=>p.enabled).map(p=>p.id),authenticated?['saju_mackerel']:[]);
    assert.equal(response.headers.get('cache-control'),'private, no-store');
  }
});
test('two atomic payment slots cannot be expanded by another profile, account or refund',async()=>{
  const {db,sqlite}=database();
  sqlite.prepare('INSERT INTO users VALUES (?,0)').run(user);
  for(const id of ['p1','p2','p3'])sqlite.prepare('INSERT INTO profiles VALUES (?,?,?,?,0)').run(id,user,'saju','{}');
  const checkout={storeId:'fixture',channelKey:'fixture-card',method:'CARD',returnPath:'/yeongnyangi/fortune/',validationRun};
  const candidates=await Promise.allSettled(['p1','p2'].map(p=>createOrder(db,user,'saju_mackerel',p,'unique-validation-'+p,checkout)));
  assert.equal(candidates.filter(r=>r.status==='fulfilled').length,1);
  const card=candidates.find(r=>r.status==='fulfilled')!;
  if(card.status!=='fulfilled')throw new Error('missing order');
  sqlite.prepare("UPDATE orders SET status='REFUNDED' WHERE id=?").run(card.value.id);
  await assert.rejects(createOrder(db,user,'saju_mackerel','p3','unique-validation-third',checkout),/STAGING_PAYMENT_LIMIT/);
  await createOrder(db,user,'saju_mackerel','p3','unique-validation-kakao',{...checkout,method:'KAKAOPAY',channelKey:'fixture-kakao'});
  assert.equal(sqlite.prepare('SELECT SUM(amount) total FROM orders').get()!.total,2000);
});
test('namespaced home, metadata and old checkout URLs preserve the legacy application',async()=>{
  const origin='https://staging.code-destiny.com';
  const edge={APP_ENV:'staging',PUBLIC_ORIGIN:origin,SOULCAT_PAGES_ORIGIN:'https://1234abcd.soulcat.pages.dev'};
  for(const path of ['/yeongnyangi/','/yeongnyangi/fortune/','/yeongnyangi/terms/','/yeongnyangi/sitemap.xml','/yeongnyangi/robots.txt']){
    const r=await handleEdge(new Request(origin+path),edge,()=>{},async req=>{assert.equal((req as Request).url,edge.SOULCAT_PAGES_ORIGIN+path);return new Response('ok');});
    assert.equal(r.status,200);assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');
  }
  const r=await handleEdge(new Request(origin+'/_soulcat?orderId=a&paymentId=b'),edge,()=>{});
  assert.equal(r.headers.get('location'),origin+'/yeongnyangi/?orderId=a&paymentId=b');
  for(const path of ['/','/terms/','/fortune/daily/','/api/auth/me','/robots.txt','/sitemap.xml'])assert.equal(routeKind(path),'legacy');
  assert.equal(routeKind('/yeongnyangi/not-a-page/'),'missing');
  assert.equal(safeReturnPath('/room/#daily'),'/yeongnyangi/room/#daily');
  assert.equal(safeReturnPath('/fortune/?orderId=a&paymentId=b'),'/yeongnyangi/fortune/?orderId=a&paymentId=b');
});

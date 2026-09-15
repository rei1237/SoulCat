import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {DatabaseSync} from 'node:sqlite';
import {database} from './support/database';
import {handleApi} from '../server/api';

const origin='https://staging.code-destiny.com';
const cdId='0123456789abcdef01234567';
const TABLES=['users','sessions','profiles','chart_snapshots','chart_domain_contexts','orders','payments','order_chart_links','order_specs','entitlements','fortune_requests','fortune_results','fortune_books','fortune_chapters','fortune_outbox','fortune_reading_progress','fortune_shares','llm_reservations','daily_messages','anchovy_ledger','free_readings'];

function seedOwner(sqlite:DatabaseSync,user:string,k:string){
  const now=Date.now();
  const run=(sql:string,...v:unknown[])=>sqlite.prepare(sql).run(...(v as never[]));
  run('INSERT INTO users (id,created_at) VALUES (?,?)',user,now);
  run('INSERT INTO sessions VALUES (?,?,?)',`t${k}`,user,now);
  run('INSERT INTO profiles VALUES (?,?,?,?,?)',`p${k}`,user,'saju','{}',now);
  run('INSERT INTO chart_snapshots VALUES (?,?,?,?,?,?,?,?,?)',`c${k}`,`p${k}`,user,'saju','v','2026','{}','{}',now);
  run('INSERT INTO chart_domain_contexts VALUES (?,?,?)',`c${k}`,'saju','{}');
  run("INSERT INTO orders (id,user_id,profile_id,product_id,amount,currency,payment_id,idempotency_key,status,created_at) VALUES (?,?,?,?,1000,'KRW',?,?,'PAID',?)",`o${k}`,user,`p${k}`,'saju_mackerel',`cd:${k}`,`i${k}`,now);
  run("INSERT INTO payments VALUES (?,?,1000,'KRW','PAID',?)",`pay${k}`,`o${k}`,now);
  run('INSERT INTO order_chart_links VALUES (?,?,?)',`o${k}`,`c${k}`,'v');
  run('INSERT INTO order_specs VALUES (?,?)',`o${k}`,'{}');
  run("INSERT INTO entitlements VALUES (?,?,?,?,'ACTIVE',?)",`e${k}`,`o${k}`,user,'saju_mackerel',now);
  run("INSERT INTO fortune_requests (id,entitlement_id,user_id,profile_id,product_id,domain,question,status,created_at,updated_at,chart_id) VALUES (?,?,?,?,'saju_mackerel','saju','q','SUCCEEDED',?,?,?)",`r${k}`,`e${k}`,user,`p${k}`,now,now,`c${k}`);
  run("INSERT INTO fortune_results VALUES (?,'{}','mock','mock','v',?)",`r${k}`,now);
  run("INSERT INTO fortune_books (request_id,tier,manifest_json,analysis_json,created_at) VALUES (?,'single','{}','{}',?)",`r${k}`,now);
  run('INSERT INTO fortune_chapters (request_id,chapter_id,ordinal) VALUES (?,?,1)',`r${k}`,'self');
  run('INSERT INTO fortune_outbox (request_id,created_at) VALUES (?,?)',`r${k}`,now);
  run('INSERT INTO fortune_reading_progress (request_id,updated_at) VALUES (?,?)',`r${k}`,now);
  run("INSERT INTO fortune_shares (id,request_id,user_id,summary_json,created_at) VALUES (?,?,?,'{}',?)",`s${k}`,`r${k}`,user,now);
  run("INSERT INTO llm_reservations (id,request_id,day,reserved,created_at) VALUES (?,?,'2026-09-15',10,?)",`l${k}`,`r${k}`,now);
  run("INSERT INTO daily_messages VALUES (?,'a','saju','2026-09-15','v','{}')",user);
  run("INSERT INTO anchovy_ledger VALUES (?,?,'2026-09-15','attendance',1,?)",`a${k}`,user,now);
  run("INSERT INTO free_readings (user_id,day,category,input_json,claim,lease_until) VALUES (?,'2026-09-15','basic','{}','x',0)",user);
}
const counts=(sqlite:DatabaseSync)=>Object.fromEntries(TABLES.map(t=>[t,Number((sqlite.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as {n:number}).n)]));
const cdStub={AUTH_SERVICE:{async fetch(req:Request){
  assert.equal(new URL(req.url).pathname,'/api/auth/me');
  return Response.json({authenticated:true,user:{id:cdId}});
}}};
const env=(db:unknown)=>({DB:db,APP_ENV:'staging',PUBLIC_ORIGIN:origin,...cdStub}) as never;
const del=(headers:Record<string,string>)=>new Request(origin+'/api/yeongnyangi/account',{method:'DELETE',headers});

test('DELETE /api/yeongnyangi/account removes every row the verified user owns and nothing else',async()=>{
  const {db,sqlite}=database();
  seedOwner(sqlite,`codedestiny:${cdId}`,'A');
  seedOwner(sqlite,'codedestiny:ffffffffffffffffffffffff','B');
  const response=await handleApi(del({origin,cookie:'fortune_auth_token=t'}),env(db),()=>{});
  assert.equal(response.status,200);
  assert.equal(((await response.json()) as {ok:boolean}).ok,true);
  assert.deepEqual(counts(sqlite),Object.fromEntries(TABLES.map(t=>[t,1])));
  assert.equal(sqlite.prepare('SELECT id FROM users').get()!.id,'codedestiny:ffffffffffffffffffffffff');
  // 이미 지워진 계정 재호출(CD 재시도)도 성공한다.
  assert.equal((await handleApi(del({origin,cookie:'fortune_auth_token=t'}),env(db),()=>{})).status,200);
});

test('account deletion refuses a foreign origin or a missing session before touching data',async()=>{
  const {db,sqlite}=database();
  seedOwner(sqlite,`codedestiny:${cdId}`,'A');
  assert.equal((await handleApi(del({origin:'https://evil.example',cookie:'fortune_auth_token=t'}),env(db),()=>{})).status,403);
  assert.equal((await handleApi(del({origin}),env(db),()=>{})).status,401);
  assert.equal(counts(sqlite).users,1);
});

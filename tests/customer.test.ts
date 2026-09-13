import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customerFields,resolveCustomer} from '../server/payments/customer';
import {handleApi} from '../server/api';
import {database} from './support/database';
const saved={fullName:'영냥',phoneNumber:'+82 10-1234-5678',email:'cat@example.test'};
test('account customer values win; only missing valid fields are supplemented',()=>{
 assert.deepEqual(customerFields(saved),[]);
 assert.deepEqual(customerFields({fullName:'영냥',email:'invalid'}),['phoneNumber','email']);
 assert.deepEqual(customerFields({}),['fullName','phoneNumber','email']);
 assert.equal(resolveCustomer(saved,{fullName:'attacker',phoneNumber:'01000000000'}).fullName,'영냥');
 assert.equal(resolveCustomer(saved,{}).phoneNumber,'01012345678');
 assert.equal(resolveCustomer({...saved,phoneNumber:''},{phoneNumber:'010-9876-5432'}).phoneNumber,'01098765432');
 for(const bad of ['','abc','123'])assert.throws(()=>resolveCustomer({...saved,phoneNumber:bad},{}),/CUSTOMER_REQUIRED/);
 assert.throws(()=>resolveCustomer({...saved,email:'invalid'},{}),/CUSTOMER_REQUIRED/);
});
test('session exposes only display name; checkout readiness never exposes account PII',async()=>{
 const {db}=database();
 for(const account of [saved,{fullName:'영냥'},{}]){
  const env={DB:db,APP_ENV:'staging',PUBLIC_ORIGIN:'https://staging.code-destiny.com',AUTH_SERVICE:{async fetch(){return Response.json({authenticated:true,user:{id:'0123456789abcdef01234567',name:account.fullName,...account}});}}};
  const req=(path:string,method='GET')=>new Request('https://staging.code-destiny.com/api/yeongnyangi/'+path,{method,headers:{cookie:'fortune_auth_token=fixture',origin:'https://staging.code-destiny.com','content-type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
  const session=await handleApi(req('session','POST'),env,()=>{});assert.equal(session.status,200);const body=await session.json();assert.deepEqual(Object.keys(body).sort(),['displayName','userId']);
  const checkout=await handleApi(req('checkout/customer'),env,()=>{});assert.equal(checkout.status,200);assert.deepEqual(await checkout.json(),{missingFields:customerFields(account)});assert.equal(checkout.headers.get('cache-control'),'private, no-store');
 }
});
test('auth outage is not treated as missing customer information',async()=>{
 const {db}=database();const env={DB:db,APP_ENV:'staging',PUBLIC_ORIGIN:'https://staging.code-destiny.com',AUTH_SERVICE:{async fetch(){return Response.json({authenticated:true,source:'token',user:{id:'0123456789abcdef01234567'}});}}};
 const r=await handleApi(new Request('https://staging.code-destiny.com/api/yeongnyangi/checkout/customer',{headers:{cookie:'fortune_auth_token=fixture'}}),env,()=>{});assert.equal(r.status,503);assert.equal((await r.json() as any).code,'AUTH_UNAVAILABLE');
});

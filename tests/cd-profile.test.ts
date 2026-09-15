import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support/database';
import {prefillFromCdProfile,currentCdBirthPrefill} from '../server/cd-profile';
import {handleApi} from '../server/api';

const origin='https://staging.code-destiny.com';
const authEnv={APP_ENV:'staging',PUBLIC_ORIGIN:origin};
const card={name:'연이',gender:'F',birth:{year:1997,month:2,day:10,hour:14,minute:30,calType:'solar'},location:{label:'부산광역시',tz:'Asia/Seoul',lng:129.0756,lat:35.1796}};
function cdStub(profileBody:unknown,status=200){
  const seen:string[]=[];
  return {seen,AUTH_SERVICE:{async fetch(req:Request){
    const url=new URL(req.url);seen.push(`${url.pathname}|${req.headers.get('cookie')}`);
    if(url.pathname==='/api/auth/me')return Response.json({authenticated:true,user:{id:'0123456789abcdef01234567'}});
    assert.equal(url.pathname,'/api/profile/current');
    return Response.json(profileBody,{status});
  }}};
}

test('a Code Destiny card maps only verifiable birth fields into the SoulCat form shape',()=>{
  assert.deepEqual(prefillFromCdProfile(card),{birthDate:'1997-02-10',calendarType:'solar',leapMonth:false,birthTime:'14:30',gender:'female',birthPlace:{name:'부산광역시',latitude:35.1796,longitude:129.0756,timezone:'Asia/Seoul'}});
  // CD 기본값(00:00·빈 label 서울 좌표·OTHER)은 사용자가 고른 값과 구분되지 않으니 비운다.
  assert.deepEqual(prefillFromCdProfile({...card,gender:'OTHER',birth:{...card.birth,hour:0,minute:0,calType:'lunar_leap'},location:{label:'',tz:'Asia/Seoul',lng:127,lat:37.5}}),{birthDate:'1997-02-10',calendarType:'lunar',leapMonth:true});
  assert.equal(prefillFromCdProfile({...card,location:{...card.location,tz:'Not/AZone'}})!.birthPlace,undefined);
  for(const birth of [{...card.birth,month:2,day:30},{...card.birth,year:1900},{year:'1997',month:2,day:10},undefined])assert.equal(prefillFromCdProfile({...card,birth}),null);
  assert.equal(prefillFromCdProfile(null),null);
});
test('the profile lookup forwards only auth cookies and treats every failure as no prefill',async()=>{
  const req=new Request(origin+'/api/yeongnyangi/cd-profile',{headers:{cookie:'other=secret; fortune_auth_token=t; fortune_auth_refresh=r'}});
  const ok=cdStub({ok:true,profile:card});
  assert.equal((await currentCdBirthPrefill(req,{...authEnv,...ok}))!.birthDate,'1997-02-10');
  assert.deepEqual(ok.seen,['/api/profile/current|fortune_auth_token=t; fortune_auth_refresh=r']);
  for(const stub of [cdStub({ok:false,degraded:true}),cdStub({ok:true,profile:null}),cdStub({ok:true,profile:card},502),{AUTH_SERVICE:{async fetch():Promise<Response>{throw new Error('down');}}}])
    assert.equal(await currentCdBirthPrefill(req,{...authEnv,...stub}),null);
  assert.equal(await currentCdBirthPrefill(new Request('https://code-destiny.com/api/yeongnyangi/cd-profile',{headers:{cookie:'fortune_auth_token=t'}}),{...authEnv,...ok}),null);
  assert.equal(await currentCdBirthPrefill(new Request(origin+'/api/yeongnyangi/cd-profile'),{...authEnv,...ok}),null);
});
test('GET /api/yeongnyangi/cd-profile answers the verified user with the mapped prefill',async()=>{
  const {db}=database();
  const stub=cdStub({ok:true,profile:card});
  const response=await handleApi(new Request(origin+'/api/yeongnyangi/cd-profile',{headers:{cookie:'fortune_auth_token=t'}}),{DB:db,...authEnv,...stub} as never,()=>{});
  assert.equal(response.status,200);
  assert.equal(((await response.json()) as {profile:{gender:string}}).profile.gender,'female');
  assert.deepEqual(stub.seen.map(s=>s.split('|')[0]),['/api/auth/me','/api/profile/current']);
});

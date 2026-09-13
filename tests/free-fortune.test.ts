import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database,seed,profile} from './support/database';
import {attend,unlockToday,attendanceStatus,kstDay} from '../server/fortune/free/attendance';
import {freeReading} from '../server/fortune/free/readings';
import {freeCategories} from '../src/data/free-fortune';
import {searchPlaces} from '../server/fortune/free/places';
import {validateInput} from '../server/fortune/shared/input';
import {chartInput} from '../server/fortune/shared/time';
import {koreanCivilProfile} from '../server/fortune/shared/korean-time';
import {calculateScreenSaju} from '../server/fortune/saju/runtime';
import {buildSukuyoFromMoonLongitude} from '../server/vendor/code-destiny/worker/lib/sukuyo-coordinate.js';
import {explanationFacts} from '../server/fortune/shared/privacy';
import {domains} from '../server/fortune';
const now=new Date('2026-09-13T03:00:00Z');
test('attendance and debit are account/day idempotent under concurrent callers and accumulate',async()=>{
 const {db,sqlite}=database();seed(sqlite);
 await assert.rejects(()=>unlockToday(db,'alice',now),/ANCHOVY_REQUIRED/);
 const earned=await Promise.all(Array.from({length:20},()=>attend(db,'alice',now)));
 assert.equal(earned.filter(x=>x.awarded).length,1);
 const opened=await Promise.all(Array.from({length:20},()=>unlockToday(db,'alice',now)));
 assert.equal(opened.filter(x=>x.newlyUnlocked).length,1);assert.equal((await attendanceStatus(db,'alice',now)).balance,0);
 assert.equal((await attendanceStatus(db,'bob',now)).unlocked,false);
 for(const day of [14,15,16])await attend(db,'alice',new Date(`2026-09-${day}T03:00Z`));
 assert.equal((await attendanceStatus(db,'alice',new Date('2026-09-16T03:00Z'))).balance,3);
 assert.notEqual(kstDay(new Date('2026-09-13T14:59:59Z')),kstDay(new Date('2026-09-13T15:00:00Z')));
});
test('all sixteen categories use existing calculations or explicit symbolic guidance, never providers',async()=>{
 const {db,sqlite}=database();seed(sqlite);await attend(db,'alice',now);await unlockToday(db,'alice',now);
 const original=globalThis.fetch;globalThis.fetch=async(input,init)=>{const url=String(input instanceof Request?input.url:input);if(/^http:\/\/127\.0\.0\.1:\d+\//.test(url)&&!url.includes('/api/'))return original(input,init);throw Error('EXTERNAL_OR_LLM_REQUEST_FORBIDDEN');};
 try{for(const c of freeCategories){const a=await freeReading(db,'alice',c.id,{profileId:'p',draft:{question:'오늘의 선택을 어떻게 정리할까?'}},{},now);
 assert.ok(a.paragraphs.length>=4&&a.paragraphs.length<=6,c.id);assert.ok(a.basis.length>0);assert.match(a.prompt,/영냥이/);assert.doesNotMatch(JSON.stringify(a),/undefined|NaN/);
 if(['comprehensive','basic','saju','dangsaju','tarot','astrology','vedic','ziwei','sukuyo'].includes(c.id))assert.ok(a.charts?.length,c.id+' chart');
 if(c.id==='comprehensive')assert.equal(a.charts?.length,4,'comprehensive keeps four separate charts');
 if(['saju','tarot','astrology','vedic','ziwei','sukuyo'].includes(c.id))assert.match(a.prompt,/\[운세별 전문 지침\]/,c.id+' domain prompt');
 const b=await freeReading(db,'alice',c.id,{profileId:'wrong',draft:{question:'다른 질문'}},{},now);assert.deepEqual(a,b,c.id);
 }}finally{globalThis.fetch=original;}
 assert.equal((await attendanceStatus(db,'alice',now)).balance,0);
 await assert.rejects(()=>freeReading(db,'bob','saju',{profileId:'p'},{},now),/DAILY_PASS_REQUIRED/);
 await attend(db,'bob',now);await unlockToday(db,'bob',now);await assert.rejects(()=>freeReading(db,'bob','saju',{profileId:'p'},{},now),/PROFILE_NOT_FOUND/);
});
test('failed calculation retries frozen input and card draw without another debit',async()=>{
 const {db,sqlite}=database();seed(sqlite);await attend(db,'alice',now);await unlockToday(db,'alice',now);
 const before=await freeReading(db,'alice','tarot',{draft:{question:'첫 질문'}},{},now);
 const snapshot=sqlite.prepare('SELECT input_json FROM free_readings').get() as {input_json:string};
 sqlite.prepare('UPDATE free_readings SET result_json=NULL,lease_until=0').run();
 assert.deepEqual(await freeReading(db,'alice','tarot',{draft:{question:'바꾼 질문'}},{},now),before);
 assert.equal((sqlite.prepare('SELECT input_json FROM free_readings').get() as {input_json:string}).input_json,snapshot.input_json);
});
test('place search never defaults on failure, preserves candidates, caches and globally throttles',async()=>{
 const {db}=database();let calls=0;
 const fetcher=async()=>{calls++;return Response.json([{display_name:'London, England, United Kingdom',lat:'51.5074',lon:'-0.1278'},{display_name:'London, Ontario, Canada',lat:'42.98',lon:'-81.24'}]);};
 const places=await searchPlaces(db,'London UK','https://example.test/search',fetcher);
 assert.equal(places.length,2);assert.equal(places[0].timezone,'Europe/London');assert.equal(places[1].timezone,'America/Toronto');
 assert.deepEqual(await searchPlaces(db,'London UK','https://example.test/search',fetcher),places);assert.equal(calls,1);
 await assert.rejects(()=>searchPlaces(db,'another city','https://example.test/search',fetcher),/PLACE_SEARCH_BUSY/);
 await db.prepare('UPDATE place_search_gate SET next_at=0').run();
 await assert.rejects(()=>searchPlaces(db,'no-result-city','https://example.test/search',async()=>new Response('',{status:503})),/PLACE_SEARCH_UNAVAILABLE/);
});
test('calendar inputs reject rollover, preserve lunar provenance and protect residence in prompts',()=>{
 assert.throws(()=>validateInput({personA:{...profile,birthDate:'2023-02-29'}},'saju'),/INVALID_BIRTH_DATE/);
 const result=validateInput({personA:{...profile,birthDate:'2024-01-01',calendarType:'lunar',residence:{...profile.birthPlace,name:'private-city'}}},'saju').personA!;
 assert.equal(result.birthDate,'2024-02-10');assert.equal(result.originalCalendar!.date,'2024-01-01');
 assert.doesNotMatch(JSON.stringify(explanationFacts(result)),/private-city|2024-01-01/);
});
test('historic Korean clocks convert once, DST gaps and overlaps reject, residence does not shift birth',()=>{
 assert.equal(chartInput({...profile,birthDate:'1988-07-01'}).timezone,10);
 const summer=koreanCivilProfile({...profile,birthDate:'1988-07-01',birthTime:'01:30'});assert.equal(summer.profile.birthTime,'00:30');assert.equal(summer.adjustmentMinutes,-60);
 const historical=koreanCivilProfile({...profile,birthDate:'1960-12-01',birthTime:'23:50'});assert.equal(historical.profile.birthDate,'1960-12-02');assert.equal(historical.profile.birthTime,'00:20');
 for(const [date,time] of [['2024-03-10','02:30'],['2024-11-03','01:30']])assert.throws(()=>chartInput({...profile,birthDate:date,birthTime:time,birthPlace:{latitude:40.7,longitude:-74,timezone:'America/New_York'}}),/AMBIGUOUS/);
 const a=calculateScreenSaju(profile,now),b=calculateScreenSaju({...profile,residence:{latitude:40.7,longitude:-74,timezone:'America/New_York'}},now);assert.deepEqual(a,b);
 assert.ok(Math.abs(a.calculationMeta.hourCorrectionMinutes-(126.978-135)*4)<1e-9);
});
test('all 27 mansion boundaries wrap continuously without date exceptions',()=>{
 for(let i=0;i<27;i++){const boundary=i*360/27;const before=buildSukuyoFromMoonLongitude(boundary-1e-7)!,after=buildSukuyoFromMoonLongitude(boundary+1e-7)!;assert.equal((after.index-before.index+27)%27,1);}
 assert.deepEqual(buildSukuyoFromMoonLongitude(0),buildSukuyoFromMoonLongitude(360));
 const source=fs.readFileSync('server/fortune/free/readings.ts','utf8');assert.doesNotMatch(source,/createProvider|\.generate\(/);
});
test('civil night-Zi boundary stays distinct from longitude hour correction',()=>{
 const at=(date:string,time:string)=>calculateScreenSaju({...profile,birthDate:date,birthTime:time},now);
 const before=at('1997-02-10','22:59'),night=at('1997-02-10','23:00'),next=at('1997-02-11','00:00');
 assert.notEqual(before.dayPillar,night.dayPillar);assert.equal(night.dayPillar,next.dayPillar);
 assert.equal(night.calculationMeta.nightZiPolicy,'shift-day');
});
test('same instant in Seoul and New York has the same geocentric mansion',async()=>{
 const calculate=(personA:typeof profile)=>domains.sukuyo.calculate(domains.sukuyo.validateInput({personA,readingMode:'personal',question:''}));
 const a=await calculate({...profile,birthTime:'14:30'});
 const b=await calculate({...profile,birthTime:'00:30',birthPlace:{latitude:40.7,longitude:-74,timezone:'America/New_York'}});
 const av=a.facts.find(f=>f.label==='personA')!.value as {index:number;moonSiderealLongitude:number},bv=b.facts.find(f=>f.label==='personA')!.value as typeof av;
 assert.equal(av.index,bv.index);assert.ok(Math.abs(av.moonSiderealLongitude-bv.moonSiderealLongitude)<1e-7);
});

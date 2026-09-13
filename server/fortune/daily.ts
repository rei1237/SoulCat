import { Database } from '../db/types';
import { domains } from './index';
import { chartView } from './charts';
import { DomainId, FortuneError } from './shared/contracts';
export const DAILY_VERSION='room-daily-v1';
export const kstDay=(now=new Date())=>new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
const advice:Record<DomainId,string[]>={
 saju:['오늘 할 일을 늘리기보다 하나를 끝내봐. 시작하는 힘도, 마무리할 자리가 있어야 빛난다냥.','누가 옳은지보다 무엇을 지킬지 정해봐. 네 기준을 한 문장으로 적어보라냥.'],
 ziwei:['일·관계·휴식 중 비어 있는 자리를 살펴봐. 한 곳에 힘을 다 쓰면 다른 방이 조용해진다냥.','도움이 필요하면 구체적으로 부탁해봐. 귀인은 네 마음을 읽는 초능력자가 아니라냥.'],
 sukuyo:['친해지고 싶은 마음과 편안한 거리는 다를 수 있어. 오늘은 상대의 속도도 물어보라냥.','답장이 늦다는 사실에 여러 뜻을 붙이지 마. 확인할 수 있는 말부터 건네보라냥.'],
 vedic:['앞서갈 때와 회복할 때를 구별해봐. 오늘의 에너지를 다 쓰는 게 실력은 아니라냥.','큰 결론을 내리기 전에 반복되는 습관부터 살펴봐. 작은 기록이 네 리듬을 알려준다냥.'],
 astrology:['감정과 행동 사이에 잠깐의 틈을 둬봐. 지금 느낀 것이 내일의 선택까지 정할 필요는 없다냥.','다른 사람이 보는 모습과 네가 원하는 모습, 오늘은 그 차이를 적어보라냥.'],
 tarot:['카드는 결정을 대신하지 않아. 오늘 선택의 득과 실을 하나씩 적고 네가 고르라냥.','답을 재촉하기보다 질문을 좁혀봐. 내가 지금 바꿀 수 있는 행동부터 찾으라냥.']};
export function generalDaily(domain:DomainId,now=new Date()) {const day=kstDay(now);return {domain,day,version:DAILY_VERSION,kind:'general',text:advice[domain][Math.floor(Date.parse(day)/86400000)%2],basis:null,notice:'출생정보로 계산한 개인 운세가 아닌 일반 조언이에요.'};}
export async function dailyMessage(db:Database,userId:string,profileId:string,domain:DomainId,env:Record<string,string>,now=new Date()) {
 const base=generalDaily(domain,now),key=profileId||'general';
 const profile=profileId?await db.prepare('SELECT input_json FROM profiles WHERE id=? AND user_id=?').bind(profileId,userId).first<{input_json:string}>():null;
 if(profileId&&!profile)throw new FortuneError('PROFILE_NOT_FOUND',404);
 const cached=await db.prepare('SELECT content_json FROM daily_messages WHERE user_id=? AND profile_key=? AND domain=? AND day=? AND version=?').bind(userId,key,domain,base.day,DAILY_VERSION).first<{content_json:string}>();
 if(cached)return JSON.parse(cached.content_json);
 let result:object=base;
 if(profile||domain==='tarot')try {
   const raw=profile?JSON.parse(profile.input_json):{};
   const input=domains[domain].validateInput({...raw,personB:undefined,readingMode:'personal',question:'오늘 내가 살펴볼 선택은?',topicId:'general'});
   const facts=await domains[domain].calculate(input,{...env,AS_OF:base.day+'T03:00:00.000Z'});
   const chart=chartView(facts);
   const group=domain==='saju'?chart.groups.find(g=>g.label==='일주')||chart.groups[0]:domain==='vedic'?chart.groups.find(g=>g.label.includes('라그나'))||chart.groups[0]:chart.groups[0];
   const item=group?.items.find(i=>i.value&&i.value!=='미상'&&i.value.length<100);
   const text=item?`${group.label}의 ${item.label}은 ‘${item.value}’로 확인됐어. ${base.text}`:base.text;
   result={...base,text,kind:domain==='tarot'?'daily-card':'personal-reference',basis:group?[group]:[],notice:domain==='tarot'?'오늘의 카드는 하루 동안 유지돼요. 미래를 확정하는 예언이 아닌 선택을 위한 상징이에요.':'선택한 본인 프로필의 계산 정보와 함께 읽는 편집 조언이에요. 오늘의 사건을 예측하는 해설은 아니에요.'};
 }catch {result={...base,notice:'이 분야의 계산 정보가 부족해 일반 조언을 보여드려요.'};}
 await db.prepare('INSERT INTO daily_messages(user_id,profile_key,domain,day,version,content_json) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(userId,key,domain,base.day,DAILY_VERSION,JSON.stringify(result)).run();
 return JSON.parse((await db.prepare('SELECT content_json FROM daily_messages WHERE user_id=? AND profile_key=? AND domain=? AND day=? AND version=?').bind(userId,key,domain,base.day,DAILY_VERSION).first<{content_json:string}>())!.content_json);
}

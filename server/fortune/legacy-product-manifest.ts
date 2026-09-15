import {Product,systemNames} from '../payments/catalog';
import {chapterManifest,ChapterSpec,Theme} from './book-contracts';
import {DomainId,FishId} from './shared/contracts';
const topics=['핵심 기질','감정의 리듬','욕구와 동기','강점의 활용','약점의 관리','반복되는 선택','사랑의 접근','관계의 거리','갈등의 해결','주변의 도움','일의 방식','역할과 책임','자원의 관리','지출의 습관','변화에 대한 반응','휴식과 회복','불확실성 다루기','기회의 판단','행동의 우선순위','지속 가능한 전략'];
const comparisons=['같은 방향의 신호','다른 방향의 신호','자료가 부족한 영역','타고난 성향과 현재 선택','관계에서의 기대','감정과 행동의 간격','일과 생활의 균형','자원과 위험의 구분','변화의 수용','해석의 한계','동의가 필요한 부분','상황에 따라 달라지는 결론','내가 확인할 생활 사례','과도한 확신을 줄이는 기준','주변 도움을 구할 지점','단기 선택과 장기 방향','우선순위를 바꿀 조건','피해야 할 단순화','가능한 두 가지 경로','선택의 최종 기준'];
const tarotTopics=['질문의 범위','현재 카드의 상징','진행 카드의 흐름','선택 카드의 단서','정방향과 역방향','카드 간 연결','감정의 이름','관계의 경계','일과 역할','돈을 대하는 태도','내가 통제할 부분','불확실한 부분','변화를 확인할 기준','다음 행동'];
const angles=['핵심 의미','다른 가능성','생활 속 관찰','반복 패턴','실행 기준'];
function theme(i:number):Theme{return (['self','self','self','self','action','self','love','relations','relations','relations','career','career','wealth','wealth','action','self','action','action','action','action'] as Theme[])[i%20];}
export function productManifest(p:Product,topicId='general'):ChapterSpec[]{
 let rows:{title:string;part:string;theme:Theme;systems:DomainId[]}[]=[];
 const add=(titles:string[],part:string,systems:DomainId[],cross=false)=>titles.forEach((title,i)=>rows.push({title,part,systems,theme:cross?'cross':theme(i)}));
 if(p.readingKind==='single'){
  if(p.domain==='tarot')add(angles.flatMap(a=>tarotTopics.map(t=>`${t} · ${a}`)).slice(0,p.chapterCount),'카드와 나의 선택',['tarot']);
  else rows=chapterManifest(p.fishId as FishId).map((c,i)=>({...c,systems:p.systems,...(c.theme==='cross'?{title:`${systemNames[p.domain]} · ${comparisons[i%comparisons.length]}`,part:'한 체계 안의 심층 검토',theme:'action' as Theme}:{})}));
 }else if(p.readingKind==='pair'){
  p.systems.forEach(d=>add(topics.map(t=>`${systemNames[d]} · ${t}`),`${systemNames[d]}의 관점`,[d]));
  add(comparisons,'공통점과 차이',p.systems,true);add(topics.map(t=>`${t} · 두 관점을 적용하는 행동`),'실행 전략',p.systems);
 }else{
  p.systems.forEach(d=>add(topics.slice(0,10).map(t=>`${systemNames[d]} · ${t}`),`${systemNames[d]}의 관점`,[d]));
  const pairs:DomainId[][]=[['saju','ziwei'],['sukuyo','vedic'],['astrology','tarot']];
  pairs.forEach(pair=>add(comparisons.slice(0,10).map(t=>`${pair.map(d=>systemNames[d]).join('·')} · ${t}`),'조합별 비교',pair,true));
  add(comparisons.slice(10).map(t=>`전체 통합 · ${t}`),'여섯 관점의 결론',p.systems,true);add(topics.map(t=>`통합 실행 · ${t}`),'나의 실행 계획',p.systems);
 }
 const topicName=({love:'연애',luck:'운의 흐름',work:'일과 적성',money:'재물',year:'올해 운세',relationship:'관계',healing:'회복',self:'나의 이해'} as Record<string,string>)[topicId];
 return rows.map((r,i)=>({...r,title:topicName?`${topicName} · ${r.title}`:r.title,id:`${p.fishId}-${String(i+1).padStart(2,'0')}`,ordinal:i,focus:`${topicId}: ${r.title}`,periodScope:r.systems.includes('tarot')?'타로는 질문 당시 상징, 다른 체계는 제공된 계산 기간만 사용':'제공된 계산 기간만 사용'}));
}

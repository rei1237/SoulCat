"use client";
import {useRef,useState} from 'react';
import {Search,MapPin} from 'lucide-react';
import type {Place} from '../../server/fortune/shared/contracts';

export function readBirthFields(data:FormData,prefix='a') {
 const part=(key:string)=>String(data.get(prefix+key)||'');
 const place=(key:string)=>{const raw=part(key);return raw?JSON.parse(raw) as Place:undefined;};
 const birthPlace=place('place'),residence=place('residence');
 if(!birthPlace)throw new Error('태어난 장소를 검색하고 결과에서 선택해 주세요.');
 if(part('residenceQuery')&&!residence)throw new Error('거주지를 검색 결과에서 선택하거나 입력을 비워 주세요.');
 return {birthDate:part('date'),birthTime:part('time')||undefined,calendarType:part('calendar')||'solar',leapMonth:part('leap')==='on',gender:part('gender')||undefined,birthPlace,residence};
}
export function PlaceSearch({name,label,required=false}:{name:string;label:string;required?:boolean}) {
 const [query,setQuery]=useState(''),[place,setPlace]=useState<Place|null>(null),[places,setPlaces]=useState<Place[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const version=useRef(0),lock=useRef(false);
 async function search(){if(lock.current)return;lock.current=true;setBusy(true);setError('');const v=version.current;
 try{const r=await fetch('/api/yeongnyangi/places?q='+encodeURIComponent(query),{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.message||'장소 검색을 마치지 못했어요. 다시 검색해 주세요.');if(v===version.current){setPlaces(d.places);if(!d.places.length)setError('찾는 장소가 없어요. 도시·구 이름이나 영문 지명으로 다시 검색해 주세요.');}}
 catch(e){if(v===version.current)setError((e as Error).message);}finally{setBusy(false);lock.current=false;}}
 return <div className="birth-place"><label htmlFor={name+'-query'}>{label}{!required?' (선택)':''}</label><div className="place-search-row"><input id={name+'-query'} name={name+'Query'} value={query} placeholder="도시·구 이름으로 검색" maxLength={120} onChange={e=>{version.current++;setQuery(e.target.value);setPlace(null);setPlaces([]);setError('');e.target.setCustomValidity('');}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search();}}} required={required} onInvalid={e=>{if(!place)e.currentTarget.setCustomValidity('장소를 검색하고 결과에서 선택해 주세요.');}}/><button type="button" onClick={search} disabled={busy||query.trim().length<2} aria-label={`${label} 검색`}><Search size={18}/>{busy?'검색 중':'검색'}</button></div>
 <input type="hidden" name={name} value={place?JSON.stringify(place):''}/>
 {places.length>0&&!place&&<ul className="place-options" aria-label={`${label} 검색 결과`}>{places.map((p,i)=><li key={i}><button type="button" onClick={()=>{setPlace(p);setQuery(p.name||query);setPlaces([]);document.getElementById(name+'-query')?.setAttribute('aria-invalid','false');}}><MapPin size={16}/><span>{p.name}<small>{p.timezone}</small></span></button></li>)}</ul>}
 {place&&<p className="place-confirmed"><MapPin size={15}/>{place.name}<small>{place.timezone} · {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}</small></p>}
 {query&&!place&&!busy&&!error&&<small>검색 결과에서 장소를 선택해 줘.</small>}{error&&<p className="field-error" role="alert">{error}</p>}
 </div>;
}
export default function BirthFields({prefix='a',title='출생 정보',timeRequired=false}:{prefix?:string;title?:string;timeRequired?:boolean}) {
 const [date,setDate]=useState(['','','']),[time,setTime]=useState(['','']),[unknown,setUnknown]=useState(false),[calendar,setCalendar]=useState('solar');
 function digits(value:string,max:number){return value.replace(/\D/g,'').slice(0,max);}
 return <fieldset className="birth-fields"><legend>{title}</legend><div className="birth-guide"><img src="/_soulcat/assets/expression-calm.webp" width="64" height="64" alt=""/><p>작은 단서도 놓치지 않을게.<br/><span>태어난 날짜와 장소부터 알려줘.</span></p></div>
 <label>달력 기준<select name={prefix+'calendar'} value={calendar} onChange={e=>setCalendar(e.target.value)}><option value="solar">양력</option><option value="lunar">음력</option></select></label>
 {calendar==='lunar'&&<label className="birth-check"><input type="checkbox" name={prefix+'leap'}/>윤달에 태어났어요</label>}
 <div className="birth-date-row" role="group" aria-label="생년월일">{['연도','월','일'].map((label,i)=><label key={label}>{label}<input aria-label={`출생 ${label}`} type="text" inputMode="numeric" pattern={i===0?'[0-9]{4}':'[0-9]{1,2}'} placeholder={['1997','02','10'][i]} maxLength={i===0?4:2} required value={date[i]} onPaste={e=>{const nums=e.clipboardData.getData('text').replace(/\D/g,'');if(nums.length===8){e.preventDefault();setDate([nums.slice(0,4),nums.slice(4,6),nums.slice(6,8)]);}}} onChange={e=>setDate(date.map((v,j)=>j===i?digits(e.target.value,i===0?4:2):v))}/></label>)}</div>
 <input type="hidden" name={prefix+'date'} value={date.every(Boolean)?`${date[0]}-${date[1].padStart(2,'0')}-${date[2].padStart(2,'0')}`:''}/>
 <div className="birth-time-row" role="group" aria-label="출생시간">{['시 (0~23)','분'].map((label,i)=><label key={label}>{label}<input aria-label={`출생 ${i?'분':'시'}`} type="text" inputMode="numeric" pattern="[0-9]{1,2}" placeholder={i?'30':'14'} maxLength={2} required={!unknown} disabled={unknown} value={time[i]} onChange={e=>setTime(time.map((v,j)=>j===i?digits(e.target.value,2):v))}/></label>)}<label>성별<select name={prefix+'gender'} defaultValue="" required><option value="" disabled>선택</option><option value="female">여성</option><option value="male">남성</option></select></label></div>
 <input type="hidden" name={prefix+'time'} value={!unknown&&time.every(Boolean)?time.map(x=>x.padStart(2,'0')).join(':'):''}/>
 {!timeRequired&&<label className="birth-check"><input type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)}/>출생시간을 몰라요</label>}
 <PlaceSearch name={prefix+'place'} label="태어난 장소" required/><PlaceSearch name={prefix+'residence'} label="지금 사는 장소"/>
 <p className="birth-note">출생지로 시간을 보정해요. 거주지는 출생 차트에 대신 넣지 않아요. 상세 주소 대신 도시·구까지만 알려줘.<br/><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">장소 자료 © OpenStreetMap 기여자</a> · 시간대 경계에 가까우면 선택된 시간대도 확인해 주세요.</p>
 </fieldset>;
}

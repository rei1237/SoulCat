'use client';
import {useEffect,useState} from 'react';
import type {BirthPrefill} from '../../server/cd-profile';
// 코드 데스티니 대표 프로필 프리필은 페이지당 한 번만 묻는다. 로그인 전·연결 실패는 조용히 null(직접 입력).
let pending:Promise<BirthPrefill|null>|undefined;
function load(){
 if(!pending)pending=fetch('/api/yeongnyangi/cd-profile',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>(d?.profile as BirthPrefill|null)??null).catch(()=>null);
 return pending;
}
export function useCdBirthPrefill(enabled:boolean){
 const [prefill,setPrefill]=useState<BirthPrefill|null>(null);
 useEffect(()=>{if(!enabled)return;let active=true;void load().then(p=>{if(active)setPrefill(p);});return()=>{active=false;};},[enabled]);
 return prefill;
}

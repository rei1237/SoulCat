'use client';
import {useEffect,useSyncExternalStore} from 'react';
const empty={status:0,displayName:'',userId:''};
let current=empty,pending:Promise<Response>|undefined,last:Response|undefined,checked=0;
const listeners=new Set<()=>void>();
export function sessionFetch(force=false):Promise<Response>{
 if(!force&&last&&Date.now()-checked<15000)return Promise.resolve(last.clone());
 if(!pending)pending=fetch('/api/yeongnyangi/session',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'}).then(async response=>{const body=await response.clone().json();last=response.clone();checked=Date.now();current={status:response.status,displayName:response.ok?body.displayName||'':'',userId:response.ok?body.userId||'':''};listeners.forEach(fn=>fn());return response;}).catch(error=>{current={...empty,status:503};listeners.forEach(fn=>fn());throw error;}).finally(()=>{pending=undefined;});
 return pending.then(r=>r.clone());
}
export function useSession(){const session=useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>current,()=>empty);useEffect(()=>{void sessionFetch().catch(()=>{});const refresh=()=>{void sessionFetch(true).catch(()=>{});};window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);return {...session,refresh:()=>sessionFetch(true).catch(()=>{})};}

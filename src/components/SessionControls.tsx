'use client';
import {useState,useRef,useEffect} from 'react';
import {socialLoginHref} from '../lib/service-links';
import {useSession} from '../lib/session';
export default function SessionControls({compact=false,onLogin}:{compact?:boolean;onLogin?:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [returnTo,setReturnTo]=useState('/yeongnyangi/');
 useEffect(()=>{setReturnTo(window.location.pathname+window.location.search+window.location.hash);},[]);
 const {status,displayName,refresh}=useSession();const [open,setOpen]=useState(false),[error,setError]=useState('');
 async function logout(){try{const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'});if(!response.ok)throw Error();window.location.assign('/yeongnyangi/');}catch{setError('로그아웃하지 못했어요. 다시 시도해 주세요.');}}
 return <div className={'session-controls '+(compact?'session-compact':'')} data-session-status={status}>
 {status===0?<span role="status">로그인 확인 중</span>:status===200?<><button className="session-account" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}><img src="/_soulcat/assets/hero-480.webp" alt="" width="32" height="32"/>{displayName?displayName+'님 · ':''}로그인됨</button>{open&&<nav className="session-menu" aria-label="내 계정"><a href="/yeongnyangi/library/">나의 보관함</a><button type="button" onClick={logout}>로그아웃</button></nav>}</>:status===401?<button type="button" onClick={()=>onLogin?onLogin():dialog.current?.showModal()}>로그인</button>:<><span role="status">확인하지 못했어요</span><button type="button" onClick={()=>void refresh()}>다시 확인</button></>}{error&&<p role="alert">{error}</p>}<dialog ref={dialog} className="session-login-dialog" aria-label="영냥이 로그인"><button type="button" onClick={()=>dialog.current?.close()}>닫기</button><h2>영냥이와 이야기 이어가기</h2><p>로그인 후 지금 화면으로 돌아와요.</p>{(['google','naver','kakao'] as const).map(provider=><a key={provider} className={'social-auth-button social-auth-button--'+provider} href={socialLoginHref(provider,returnTo)}>{provider==='google'?'Google':provider==='naver'?'네이버':'카카오'}로 로그인</a>)}</dialog></div>;
}

"use client";
import {useEffect,useState} from 'react';
import {loginHref} from '../lib/service-links';
export default function SessionControls() {
  const [status,setStatus]=useState(0);
  const [message,setMessage]=useState('로그인 상태를 확인하고 있어요.');
  const [returnTo,setReturnTo]=useState('/yeongnyangi/');
  useEffect(()=>{
    let active=true;
    setReturnTo(window.location.pathname+window.location.search+window.location.hash);
    fetch('/api/yeongnyangi/session',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'})
      .then(response=>{if(active){setStatus(response.status);setMessage(response.ok?'Code Destiny 계정으로 로그인되어 있어요.':response.status===401?'로그인하면 상담을 보관하고 다시 볼 수 있어요.':'로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');}})
      .catch(()=>{if(active)setMessage('연결을 확인한 뒤 다시 시도해 주세요.');});
    return()=>{active=false;};
  },[]);
  async function logout(){
    try {
      const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'});
      if(!response.ok)throw new Error();
      window.location.assign('/yeongnyangi/');
    }catch{setMessage('로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.');}
  }
  return <div className="session-controls" data-session-status={status}>
    <p role="status">{message}</p>
    {status===200?<><a href="/yeongnyangi/library/">나의 보관함</a> · <button type="button" onClick={logout}>로그아웃</button></>:<a href={loginHref(returnTo)}>로그인하고 이어가기</a>}
  </div>;
}

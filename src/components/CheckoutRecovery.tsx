'use client';
import {useEffect,useState} from 'react';
// 결제 복귀는 Code Destiny /checkout/ 이 returnTo 로 처리한다. 여기서는 보관된 상담 안내만 남긴다.
export default function CheckoutRecovery(){
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(!['/yeongnyangi/','/yeongnyangi/room/','/yeongnyangi/library/'].includes(url.pathname))return;
    if(url.searchParams.has('request'))setNotice('상담이 보관되었어요. 결과 보기를 눌러 이어서 확인해 주세요.');
  },[]);
  if(!notice)return null;
  return <aside className="checkout-recovery" aria-live="polite"><p>{notice}</p><a href="/yeongnyangi/library/">보관함으로 이동</a> {typeof window!=="undefined" && new URLSearchParams(window.location.search).get("request") && <a href={"/yeongnyangi/fortune/?request="+encodeURIComponent(new URLSearchParams(window.location.search).get("request")!)}>결과 보기</a>}</aside>;
}

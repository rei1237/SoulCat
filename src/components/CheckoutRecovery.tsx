'use client';
import {useEffect,useState} from 'react';
import {confirmCheckout,readTicket,ApiError,ticketPrefix} from '../lib/checkout';
import {safeReturnPath} from '../lib/return-path';
import {loginHref} from '../lib/service-links';
export default function CheckoutRecovery(){
  const [notice,setNotice]=useState(''),[login,setLogin]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(!['/yeongnyangi/fortune/','/yeongnyangi/room/','/yeongnyangi/library/'].includes(url.pathname))return;
    if(url.pathname!=='/yeongnyangi/fortune/'&&url.searchParams.has('request')){setNotice('상담이 보관되었어요. 결과 보기를 눌러 이어서 확인해 주세요.');return;}
    if(!url.searchParams.has('paymentId'))return;
    let ticket;
    try{ticket=readTicket(localStorage,url.searchParams.get('paymentId')||'',url.searchParams.get('orderId')||'');}catch{ticket=null;}
    if(!ticket||url.searchParams.getAll('paymentId').length!==1||url.searchParams.getAll('orderId').length!==1){setNotice('복귀 정보를 확인하지 못했어요. 보관함에서 결제 내역을 확인해 주세요.');return;}
    setNotice('결제 내역을 확인하고 있어요. 다시 결제하지 마세요.');
    confirmCheckout(ticket,localStorage).then(data=>{
      if(data.status==='PAID'&&data.requestId){
        const target=new URL(safeReturnPath(data.returnPath||ticket.returnPath),url.origin);
        target.searchParams.delete('paymentId');target.searchParams.delete('orderId');
        target.searchParams.set('request',data.requestId);
        // Room/library keep their route and offer the saved consultation below.
        window.location.replace(target.href);
      }else{
        if(url.searchParams.has('code'))localStorage.removeItem(ticketPrefix+ticket.paymentId);
        setNotice('결제가 완료되지 않았어요. 보관함에서 상태를 확인할 수 있어요.');
      }
    }).catch(e=>{setNotice(e.message);if(e instanceof ApiError&&e.code==='SESSION_REQUIRED')setLogin(loginHref(url.pathname+url.search));});
  },[retry]);
  if(!notice)return null;
  return <aside className="checkout-recovery" aria-live="polite"><p>{notice}</p>{login?<a href={login}>로그인하고 이어가기</a>:<button type="button" onClick={()=>setRetry(n=>n+1)}>결제 상태 다시 확인</button>} <a href="/yeongnyangi/library/">보관함으로 이동</a> {typeof window!=="undefined" && new URLSearchParams(window.location.search).get("request") && <a href={"/yeongnyangi/fortune/?request="+encodeURIComponent(new URLSearchParams(window.location.search).get("request")!)}>결과 보기</a>}</aside>;
}

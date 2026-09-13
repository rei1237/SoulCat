"use client";
import {apiRequest,ApiError} from "../lib/checkout";
import {loginHref} from "../lib/service-links";
import { useEffect, useState } from "react";
import { fortuneSurfaces, FortuneDomainId } from "@/data/fortune";
import "./fortune.css";
export default function FortuneLibrary() {
  const [orders,setOrders]=useState<{id:string;payment_id:string;product_id:string;status:string}[]>([]);
  const [login,setLogin]=useState(false);
  const [checking,setChecking]=useState("");
  const [rows, setRows] = useState<
    { id: string; domain: FortuneDomainId; status: string;packageName:string;image:string;name:string }[]
  >([]);
  const [notice, setNotice] = useState("보관함을 확인하고 있어요.");
  useEffect(() => {
    apiRequest("orders").then(data=>setOrders(data.orders)).catch(e=>{if(e instanceof ApiError&&e.code==="SESSION_REQUIRED")setLogin(true);});
    fetch("/api/yeongnyangi/library", { credentials: "same-origin" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          setNotice(data.message);
          return;
        }
        setRows(data.results);
        setNotice(
          data.results.length
            ? ""
            : "아직 보관된 상담이 없어요. 궁금한 이야기부터 골라봐요.",
        );
      })
      .catch(() =>
        setNotice("보관함을 불러오지 못했어요. 잠시 후 다시 방문해 주세요."),
      );
  }, []);
  return (
    <main className="fortune-shell">
      <header className="fortune-header">
        <a href="/">Code Destiny 홈</a>
        <span>나의 보관함</span>
      </header>
      <div className="fortune-intro">
        <h1>다시 펼쳐보는 너의 이야기.</h1>
        <p role="status">{notice}</p>
      </div>
      {login && <a href={loginHref('/library/')}>로그인하고 보관함 보기</a>}
      {orders.filter(o=>['PENDING','PAID'].includes(o.status)).map(o=><p key={o.id}>주문 {o.id.slice(0,8)} · <button disabled={!!checking} onClick={async()=>{
        setChecking(o.id);try{const d=await apiRequest('payments/verify',{orderId:o.id,paymentId:o.payment_id});if(d.status==='PAID'&&d.requestId)window.location.assign('/fortune/?request='+encodeURIComponent(d.requestId));else setNotice('결제가 완료되지 않았어요. 잠시 후 다시 확인해 주세요.');}catch(e){setNotice((e as Error).message);}finally{setChecking('');}
      }}>{checking===o.id?'결제 확인 중':'결제 내역 확인하고 이어가기'}</button></p>)}
      {rows.map((r) => (
        <p key={r.id}>
          <a href={`/fortune/?domain=${r.domain}&request=${r.id}`}>
            <img src={r.image} width={60} height={50} style={{objectFit:"contain",verticalAlign:"middle"}} alt=""/> {r.packageName} · {r.name||fortuneSurfaces[r.domain]?.name} ·{" "}
            {r.status === "SUCCEEDED" ? "결과 보기" : "진행 상태 확인"}
          </a>
        </p>
      ))}
    </main>
  );
}

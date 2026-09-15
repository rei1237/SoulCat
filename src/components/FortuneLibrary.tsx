"use client";
import {apiRequest,ApiError} from "../lib/checkout";
import {loginHref} from "../lib/service-links";
import { useEffect, useState } from "react";
import { fortuneSurfaces, FortuneDomainId } from "@/data/fortune";
import "./fortune.css";
export default function FortuneLibrary() {
  const [httpStatus,setHttpStatus]=useState(0);
  const [login,setLogin]=useState(false);
  const [rows, setRows] = useState<
    { id: string; domain: FortuneDomainId; status: string;packageName:string;image:string;name:string }[]
  >([]);
  const [notice, setNotice] = useState("보관함을 확인하고 있어요.");
  useEffect(() => {
    apiRequest("session").catch(e=>{if(e instanceof ApiError&&e.code==="SESSION_REQUIRED")setLogin(true);});
    fetch("/api/yeongnyangi/library", { credentials: "same-origin" })
      .then(async (response) => {
        setHttpStatus(response.status);
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
    <main className="fortune-shell" data-library-status={httpStatus}>
      <header className="fortune-header">
        <a href="/yeongnyangi/">영냥이 홈</a>
        <span>나의 보관함</span>
      </header>
      <div className="fortune-intro">
        <h1>다시 펼쳐보는 너의 이야기.</h1>
        <p role="status">{notice}</p>
      </div>
      {login && <a href={loginHref('/yeongnyangi/library/')}>로그인하고 보관함 보기</a>}
      {rows.map((r) => (
        <p key={r.id}>
          <a href={`/yeongnyangi/fortune/?domain=${r.domain}&request=${r.id}`}>
            <img src={r.image} width={60} height={50} style={{objectFit:"contain",verticalAlign:"middle"}} alt=""/> {r.packageName} · {r.name||fortuneSurfaces[r.domain]?.name} ·{" "}
            {r.status === "SUCCEEDED" ? "결과 보기" : "진행 상태 확인"}
          </a>
        </p>
      ))}
    </main>
  );
}

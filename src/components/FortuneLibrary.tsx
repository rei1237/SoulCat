"use client";
import { useEffect, useState } from "react";
import { fortuneSurfaces, FortuneDomainId } from "@/data/fortune";
import "./fortune.css";
export default function FortuneLibrary() {
  const [rows, setRows] = useState<
    { id: string; domain: FortuneDomainId; status: string }[]
  >([]);
  const [notice, setNotice] = useState("보관함을 확인하고 있어요.");
  useEffect(() => {
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
      {rows.map((r) => (
        <p key={r.id}>
          <a href={`/fortune/?domain=${r.domain}&request=${r.id}`}>
            {fortuneSurfaces[r.domain]?.name} ·{" "}
            {r.status === "SUCCEEDED" ? "결과 보기" : "진행 상태 확인"}
          </a>
        </p>
      ))}
    </main>
  );
}

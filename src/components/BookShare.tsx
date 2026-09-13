"use client";
import { useEffect, useState } from "react";
type Link = { shareId: string; url: string; nickname?: string; summary?:{headline:string} };
async function api(path: string, body?: object) {
  const response = await fetch("/api/yeongnyangi/" + path, {
    credentials: "same-origin",
    ...(body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || "공유를 준비하지 못했어요.");
  return data;
}
export default function BookShare({
  id,
  completed,
}: {
  id: string;
  completed: boolean;
}) {
  const [expanded, setExpanded] = useState(false),
    [nickname, setNickname] = useState(""),
    [variant, setVariant] = useState("summary"),
    [comment, setComment] = useState(true),
    [keywords, setKeywords] = useState(true),
    [preview, setPreview] = useState<Link | null>(null),
    [links, setLinks] = useState<Link[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [shareFile,setShareFile]=useState<File|null>(null);
  const chatText=preview?`영냥이한테 내 이야기를 물어봤어.\n${preview.summary?.headline||'너는 어떻게 읽혀?'}\n${typeof location==='undefined'?'':location.origin}${preview.url}`:'';
  useEffect(()=>{
    setShareFile(null);
    if(!preview)return;
    const abort=new AbortController();
    fetch(preview.url+'/og.png',{signal:abort.signal}).then(async r=>{
      if(!r.ok||!r.headers.get('content-type')?.startsWith('image/png'))return;
      const blob=await r.blob();
      if(!abort.signal.aborted)setShareFile(new File([blob],'영냥이-내이야기.png',{type:'image/png'}));
    }).catch(()=>{});
    return()=>abort.abort();
  },[preview]);
  async function shareImage(){
    if(!shareFile)return;
    try{
      if(navigator.canShare?.({files:[shareFile]}))await navigator.share({files:[shareFile],title:'영냥이가 읽은 내 이야기'});
      else setNotice('이 브라우저에서는 아래의 카드 저장을 이용한 뒤 카카오톡에 사진으로 첨부해 주세요.');
    }catch(e){setNotice(e instanceof Error&&e.name==='AbortError'?'공유를 취소했어요.':'이미지를 공유하지 못했어요. 카드 저장으로 다시 시도해 주세요.');}
  }
  async function refresh() {
    setLinks((await api("shares?id=" + encodeURIComponent(id))).shares);
  }
  useEffect(() => {
    if (expanded) void refresh().catch((e) => setNotice(e.message));
  }, [expanded, id]);
  async function create() {
    setBusy(true);
    try {
      const link = await api("shares", {
        requestId: id,
        nickname,
        variant,
        showComment: comment,
        showKeywords: keywords,
      });
      setPreview(link);
      await refresh();
      setNotice(
        "선택한 항목만 담은 카드예요. 출생정보와 전체 해설은 공개하지 않아요.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(link: Link) {
    try {
      await api("shares/revoke", { shareId: link.shareId });
      if (preview?.shareId === link.shareId) setPreview(null);
      await refresh();
      setNotice(
        "이 링크의 공유를 해제했어요. 이미 저장한 이미지는 회수되지 않아요.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <section className="book-sharing">
      <h2>기억하고 싶은 한 장</h2>
      <button onClick={() => setExpanded(!expanded)}>공유하기</button>
      {expanded && (
        <>
          <p>단톡방에 보여주고 싶은 내 이야기 한 장. 기본은 익명이야. 공개할 항목을 골라 봐.</p>
          <label>
            공개 별명
            <input
              maxLength={16}
              placeholder="익명으로 공유"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          <label>
            카드 주제
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
            >
              {Object.entries({
                summary: "대표 요약",
                wealth: "재물",
                love: "사랑",
                keywords: "키워드",
                comment: "영냥이의 한마디",
                helper: "귀인",
                relationship: "사랑에 빠지는 방식",
                timing: "시기",
              }).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={comment}
              onChange={(e) => setComment(e.target.checked)}
            />
            영냥이 한마디 공개
          </label>
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={keywords}
              onChange={(e) => setKeywords(e.target.checked)}
            />
            키워드 공개
          </label>
          <button disabled={!completed || busy} onClick={() => void create()}>
            공유 카드 미리보기
          </button>
          {!completed && <p>운명서가 완성되면 카드를 만들 수 있어.</p>}
          {preview && (
            <>
              <img
                width={1200}
                height={630}
                style={{ width: "100%", height: "auto" }}
                src={preview.url + "/og.png"}
                alt="공개할 운명 요약 카드"
              />
              <label>함께 보낼 문구<textarea className="share-copy" readOnly value={chatText} /></label>
              <div className="share-actions">
                <button onClick={async()=>{try{await navigator.clipboard.writeText(chatText);setNotice('문구와 링크를 복사했어요. 카카오톡 대화방에 붙여넣어 주세요.');}catch{setNotice('복사 권한을 사용할 수 없어요. 위 문구를 길게 눌러 복사해 주세요.');}}}>단톡방용 문구 복사</button>
                <button disabled={!shareFile} onClick={()=>void shareImage()}>카드 이미지 공유</button>
              </div>
              <p>공유 메뉴에서 카카오톡을 선택하거나, 복사한 문구를 원하는 대화방에 붙여넣어 줘. 전체 상담과 출생정보는 링크에 담지 않아.</p>
              <button
                onClick={async () => {
                  try {
                    const url = location.origin + preview.url;
                    if (navigator.share)
                      await navigator.share({
                        title: "영냥이가 본 나의 운명",
                        text: preview.summary?.headline||'영냥이가 읽은 내 이야기, 너는 어떻게 읽혀?',
                        url,
                      });
                    else {
                      await navigator.clipboard.writeText(url);
                      setNotice("링크를 복사했어요.");
                    }
                  } catch {
                    setNotice("공유를 마치지 않았어요.");
                  }
                }}
              >
                링크 공유하기
              </button>
              <a href={preview.url + "/og.png"} download="영냥이-운명카드.png">
                일반 카드 저장
              </a>
              <a
                href={preview.url + "/vertical.png"}
                download="영냥이-세로카드.png"
              >
                세로 카드 저장
              </a>
              <button onClick={() => void revoke(preview)}>공유 해제</button>
            </>
          )}
          {links.filter((l) => l.shareId !== preview?.shareId).length > 0 && (
            <details>
              <summary>기존 공유 링크 관리</summary>
              <ul>
                {links
                  .filter((l) => l.shareId !== preview?.shareId)
                  .map((link) => (
                    <li key={link.shareId}>
                      <a href={link.url}>{link.nickname}의 카드</a>
                      <button onClick={() => void revoke(link)}>
                        이 링크 해제
                      </button>
                    </li>
                  ))}
              </ul>
            </details>
          )}
          {notice && <p role="status">{notice}</p>}
        </>
      )}
    </section>
  );
}

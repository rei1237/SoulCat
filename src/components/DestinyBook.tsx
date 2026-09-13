"use client";
import { useEffect, useState, useRef } from "react";
import { Search, Share2, Check, BookOpen, ArrowDownToLine } from "lucide-react";
import ChartTabs from "./ChartTabs";
import "./fish-catalog.css";
import "./reader.css";
import BookShare from "./BookShare";
import type { ChartView } from "../../server/fortune/charts";
import type {
  ChapterBody,
  ChapterSpec,
} from "../../server/fortune/book-contracts";
export interface BookView {
  mock?:boolean;
  packageName?:string;
  id: string;
  locked?: { title: string; tier: string }[];
  timeline?: { year: number; label: string; source: string }[];
  signals?: { theme: string; agreement: number; confidence: string }[];
  tier: string;
  status: string;
  chart: ChartView;
  charts?: ChartView[];
  chapters: (ChapterSpec & { status: string })[];
  completed: number;
  total: number;
  retryable: boolean;
  summary: { summary: string; keywords: string[] } | null;
  progress: { lastChapter?: string; read: string[] };
}
async function api(path: string, body?: object) {
  const r = await fetch("/api/yeongnyangi/" + path, {
    credentials: "same-origin",
    ...(body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || "잠시 후 다시 시도해 주세요.");
  return d;
}
const labels: Record<string, string> = {
  self: "나",
  wealth: "돈",
  love: "사랑",
  career: "직업",
  relations: "관계",
  timing: "시기",
  cross: "운명",
  action: "실천",
};
const chapterCompanions: Record<string, {image:string; question:string}> = {
  self:{image:'thinking',question:'이 모습이 떠오르는 장면이 있어? 네 경험과 천천히 맞춰 봐.'},
  wealth:{image:'thinking',question:'돈을 쓰거나 일을 고를 때, 네 기준은 어디에 가까워?'},
  love:{image:'comfort',question:'마음이 움직였던 순간을 떠올려 봐. 상대의 마음까지 단정할 필요는 없어.'},
  relations:{image:'comfort',question:'편안한 관계와 자꾸 힘이 드는 관계, 어떤 차이가 있었어?'},
  action:{image:'encourage',question:'전부 바꾸려 하지 말고, 오늘 해볼 수 있는 것 하나부터.'},
};
export default function DestinyBook({ initial }: { initial: BookView }) {
  const expansion = useRef(0);
  const [book, setBook] = useState(initial),
    [open, setOpen] = useState(""),
    [body, setBody] = useState<ChapterBody | null>(null),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState(""),
    [matches, setMatches] = useState<string[] | null>(null),
    [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tocOpen,setTocOpen]=useState(false);
  useEffect(()=>{if(!open){const c=book.chapters.find(c=>c.id===book.progress.lastChapter&&c.status==='completed')||book.chapters.find(c=>c.status==='completed');if(c)void expand(c.id);}},[book.id,book.completed]);
  useEffect(() => {
    if (book.status === "SUCCEEDED") return;
    let ended = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const d = await api(`fortune/status?id=${encodeURIComponent(book.id)}`);
        if (!ended && d.book) setBook(d.book);
      } catch {
        if (!ended)
          setError(
            "연결을 확인하고 있어요. 구매 권리와 완성된 챕터는 보관돼요.",
          );
      }
      if (!ended) timer = setTimeout(poll, 3000);
    }
    timer = setTimeout(poll, 3000);
    return () => {
      ended = true;
      clearTimeout(timer);
    };
  }, [book.id, book.status]);
  useEffect(() => {
    if (!query.trim()) {
      setMatches(null);
      return;
    }
    let ended = false;
    const timer = setTimeout(async () => {
      try {
        const d = await api(
          `fortune/search?id=${encodeURIComponent(book.id)}&q=${encodeURIComponent(query)}`,
        );
        if (!ended) setMatches(d.ids);
      } catch {
        if (!ended) setError("검색을 마치지 못했어요.");
      }
    }, 200);
    return () => {
      ended = true;
      clearTimeout(timer);
    };
  }, [query, book.id]);
  async function expand(id: string) {
    const attempt = ++expansion.current;
    if (open === id && body) return;
    setOpen(id);
    setBody(null);
    setError("");
    try {
      const d = await api(
        `fortune/chapter?id=${encodeURIComponent(book.id)}&chapter=${encodeURIComponent(id)}`,
      );
      if (attempt === expansion.current) setBody(d);
    } catch (e) {
      if (attempt === expansion.current) setError((e as Error).message);
    }
  }
  async function markRead() {
    try {
      await api("fortune/progress", { requestId: book.id, chapterId: open });
      setBook({
        ...book,
        progress: {
          lastChapter: open,
          read: [...new Set([...book.progress.read, open])],
        },
      });
      setNotice("읽은 위치를 보관했어요.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const visible = book.chapters.filter(
    (c) =>
      (!theme || c.theme === theme) &&
      (!query || (matches ? matches.includes(c.id) : c.title.includes(query))),
  );
  const selected=book.chapters.find(c=>c.id===open);
  const available=book.chapters.filter(c=>c.status==='completed');
  const position=available.findIndex(c=>c.id===open);
  const selectChapter=(id:string)=>{
    setTocOpen(false);void expand(id);
    requestAnimationFrame(()=>document.getElementById('reader-page')?.scrollIntoView({block:'start'}));
  };
  return (
    <article className="destiny-book reader-book">
      <header className="reader-cover book-cover">
        <div>
          <h1>{book.packageName||'영냥이'} 운명서</h1>
          <p>너의 흐름을 읽고, 너의 선택으로 이어지는 이야기.</p>
          <p className="reader-count" aria-live="polite">완성 {book.completed} / {book.total} · 읽은 챕터 {book.progress.read.length}</p>
        </div>
        <img src={`/_soulcat/assets/fish/${book.tier}.webp`} width={96} height={88} alt="" />
      </header>
      {book.mock&&<p className="reader-mock">모의 운명서 · 실제 개인 해설이 아닙니다.</p>}
      {book.summary&&<section className="reader-overview" aria-label="한눈에 보는 내 이야기">
        <img src="/_soulcat/assets/expressions/smile.webp" width={84} height={84} alt="" />
        <div><h2>한눈에 보는 내 이야기</h2><p>{book.summary.summary}</p><ul className="reader-keywords">{book.summary.keywords.map(k=><li key={k}>{k}</li>)}</ul></div>
      </section>}
      <details className="reader-evidence">
        <summary>나의 기본 차트와 해석 근거</summary>
        <ChartTabs charts={book.charts||[book.chart]} />
        {!!book.signals?.length&&<><h2>체계별 해석의 공통점</h2><p>일치도는 해석 근거가 겹치는 정도이며, 미래가 맞을 확률은 아니에요.</p><ul>{book.signals.map(s=><li key={s.theme}>{labels[s.theme]} · {s.agreement}개 체계의 지지 신호 · {s.confidence==='mixed'?'상반된 요소도 있음':s.confidence==='supported'?'근거가 겹침':'제한된 근거'}</li>)}</ul></>}
        {!!book.timeline?.length&&<details><summary>계산된 연도별 흐름</summary><ol>{book.timeline.map(t=><li key={t.year}><strong>{t.year}년</strong> · {t.label} · {t.source}</li>)}</ol></details>}
      </details>
      {book.status!=='SUCCEEDED'&&<aside className="book-companion"><img src={`/_soulcat/assets/expressions/${book.retryable?'comfort':'thinking'}.webp`} width={72} height={72} alt="" /><p>{book.retryable?'이야기를 정리하다 잠시 멈췄어. 완성된 장은 그대로 읽을 수 있어.':'완성된 장부터 읽어 봐. 나머지 이야기도 차근차근 정리하고 있어.'}</p></aside>}
      {error&&<p role="alert">{error}</p>}
      <p className="reader-notice" role="status">{notice}</p>
      <div className="reader-layout">
        <aside className={`reader-index${tocOpen?' is-open':''}`}>
          <button className="reader-index-toggle" aria-expanded={tocOpen} aria-controls="reader-index-body" onClick={()=>setTocOpen(!tocOpen)}><BookOpen size={18} />목차에서 골라 읽기 <span>{book.total}장</span></button>
          <div id="reader-index-body" className="reader-index-body">
            <h2>내 이야기 목차</h2>
            <label className="reader-search"><Search size={17}/><input aria-label="내 운명서 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="궁금한 이야기 찾기" maxLength={80}/></label>
            <label className="reader-theme">주제<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="">전체 주제</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
            {book.progress.lastChapter&&<button className="reader-resume" onClick={()=>{setTheme('');setQuery('');selectChapter(book.progress.lastChapter!);}}>지난번 읽던 곳부터</button>}
            <nav aria-label="챕터 목차">
              {!visible.length&&<p>다른 단어나 주제로 찾아봐요.</p>}
              {visible.map((c,i)=><div key={c.id}>
                {(i===0||visible[i-1].part!==c.part)&&<h3 className="reader-part">{c.part}</h3>}
                <button className="reader-chapter-link" aria-current={open===c.id?'page':undefined} disabled={c.status!=='completed'} onClick={()=>selectChapter(c.id)}>
                  <span className="reader-ordinal">{c.ordinal+1}</span><span>{c.title}</span><span className="reader-chapter-state">{book.progress.read.includes(c.id)?<Check size={14} aria-label="읽음"/>:c.status==='completed'?'':c.status==='failed'?'복구 대기':'준비 중'}</span>
                </button>
              </div>)}
            </nav>
          </div>
        </aside>
        <section id="reader-page" className="reader-page" aria-label="선택한 챕터">
          {selected?<>
            <header className="reader-page-title"><p>{selected.ordinal+1} / {book.total} · {labels[selected.theme]||'내 이야기'}</p><h2>{selected.title}</h2></header>
            <div className="chapter-prose" aria-live="polite" aria-busy={!body}>
              {!body?<p>이야기를 펼치고 있어요.</p>:<>
                <p className="chapter-conclusion">{body.summary}</p>
                {body.blocks?.length?body.blocks.map((block,i)=><section key={i}><h3>{block.title}</h3>{block.paragraphs.map((p,j)=><p key={j}>{p}</p>)}</section>):<><h3>이 흐름이 나오는 이유</h3>{body.analysis.map((p,i)=><p key={i}>{p}</p>)}</>}
                <h3>생활 속에서는</h3><p>{body.example}</p>
                <aside className="chapter-companion"><img src={`/_soulcat/assets/expressions/${(chapterCompanions[selected.theme]||chapterCompanions.self).image}.webp`} width={64} height={64} loading="lazy" alt=""/><p>{(chapterCompanions[selected.theme]||chapterCompanions.self).question}</p></aside>
                <h3>오늘 해볼 수 있는 선택</h3><p>{body.advice}</p>
                <blockquote className="chapter-cat-word"><img src="/_soulcat/assets/expressions/encourage.webp" width={56} height={56} loading="lazy" alt=""/><p>{body.persona}</p></blockquote>
                <details className="reader-source"><summary>이 장의 계산 근거</summary><ul>{body.sources.map(s=><li key={s}>{s}</li>)}</ul></details>
                <button className="reader-mark" onClick={()=>void markRead()}><Check size={17}/>{book.progress.read.includes(open)?'읽은 챕터예요':'이 챕터 읽음 표시'}</button>
              </>}
            </div>
            <nav className="reader-pagination" aria-label="챕터 넘기기"><button disabled={position<=0} onClick={()=>selectChapter(available[position-1].id)}>이전 장</button><span>{selected.ordinal+1} / {book.total}</span><button disabled={position<0||position>=available.length-1} onClick={()=>selectChapter(available[position+1].id)}>다음 장</button></nav>
          </>:<div className="reader-empty"><img src="/_soulcat/assets/expressions/thinking.webp" width={112} height={112} alt=""/><h2>네 이야기를 준비하고 있어</h2><p>첫 번째 장이 완성되면 여기서 펼쳐볼 수 있어.</p></div>}
        </section>
      </div>
      {book.retryable&&<button onClick={()=>api('fortune/retry',{requestId:book.id}).catch(e=>setError(e.message))}>구매한 운명서 생성 이어가기</button>}
      <BookShare id={book.id} completed={book.status==='SUCCEEDED'}/>
      {!!book.locked?.length&&<details className="reader-upgrade"><summary>다른 상담 구성 살펴보기</summary><p>상위 상품은 별도 구매예요. 선택하기 전에 전체 구성과 가격을 확인해 주세요.</p><a href={`/fortune/?domain=${book.chart.domain}`}>생선별 상담 구성과 가격 보기</a><ul>{book.locked.map(c=><li key={c.title}>{c.title} · {c.tier}</li>)}</ul></details>}
    </article>
  );
}

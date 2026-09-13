"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Heart, Moon, PawPrint, Send, Sparkles, X } from "lucide-react";
import DailyWords from "./DailyWords";
import StoryPanel from "./StoryPanel";
import CatMotion from "./CatMotion";
import "./room.css";

const starters = ["요즘 마음이 복잡해", "그 사람의 마음이 궁금해", "앞으로 무슨 일을 하면 좋을까?", "그냥 누군가에게 말하고 싶어"];

export default function YeongnyangRoom() {
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<{ question: string; guide: string }[]>([]);
  const [readings,setReadings]=useState<{id:string;name:string;packageName:string}[]>([]);
  const [readingId,setReadingId]=useState('');
  const [busy,setBusy]=useState(false);
  const [counselError,setCounselError]=useState('');
  const [loadingReadings,setLoadingReadings]=useState(true);
  const sending=useRef(false);
  useEffect(()=>{let active=true;fetch('/api/yeongnyangi/library',{credentials:'same-origin'}).then(async r=>{if(!r.ok)throw Error('내 운세를 불러오려면 로그인 상태를 확인해 주세요.');return r.json();}).then(d=>{if(active){const available=d.results.filter((r:{status:string})=>r.status==='SUCCEEDED');setReadings(available);setReadingId(available[0]?.id||'');}}).catch(e=>{if(active)setCounselError(e.message);}).finally(()=>{if(active)setLoadingReadings(false);});return()=>{active=false;};},[]);
  const [storyOpen, setStoryOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [reaction, setReaction] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const storyButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const notebook = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storyOpen) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [storyOpen]);

  function closeStory() {
    dialog.current?.close();
    setStoryOpen(false);
    storyButton.current?.focus({ preventScroll: true });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const question=draft.trim();
    if(!question||!readingId||sending.current)return;
    sending.current=true;setBusy(true);setCounselError('');
    try {
      const response=await fetch('/api/yeongnyangi/room/counsel',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:readingId,question,history:notes.slice(-4).map(n=>({question:n.question,answer:n.guide.slice(0,1200)}))})});
      const data=await response.json();
      if(!response.ok)throw Error(data.code==='ROOM_MOCK_ONLY'?'고민 상담 연결을 준비하고 있어요. 지금은 보관한 운세를 살펴볼 수 있어요.':data.code==='ROOM_READING_VERSION'?'이 결과는 이전 구성으로 작성됐어요. 새 구성의 운세를 선택해 주세요.':data.message||'상담을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      setNotes(value=>[...value,{question,guide:[data.answer,data.followUp,data.chapter?'참고한 장: '+data.chapter.title:''].filter(Boolean).join('\n\n')}]);
      setDraft('');setReaction(1);
      requestAnimationFrame(()=>notebook.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'}));
    }catch(e){setCounselError((e as Error).message);}finally{sending.current=false;setBusy(false);}
  }

  return <main className="yeongnyang-room">
    <header className="room-header">
      <a href="/yeongnyangi/" className="room-round-button" aria-label="메인으로 돌아가기"><ArrowLeft size={22} /></a>
      <h1><PawPrint size={19} />영냥이의 방</h1>
      <a href="#room-conversation" className="room-round-button" aria-label="질문 적으러 가기"><Send size={18} /></a>
    </header>
    <div className="room-layout">
      <DailyWords/>
      <section className="room-presence" aria-label="달빛 아래 영냥이의 점술방">
        <img className="room-scenery" src="/_soulcat/assets/room-1440.webp" srcSet="/_soulcat/assets/room-780.webp 780w, /_soulcat/assets/room-1440.webp 1440w" sizes="(min-width: 900px) 58vw, 100vw" width={1440} height={810} alt="" fetchPriority="high" />
        <div className="room-welcome"><Moon size={14} />잠깐, 여기서 쉬어가.</div>
        <div className="room-cat-speech" aria-live="polite">{reaction ? <>말이 좀 엉켜도 괜찮아.<br />천천히 풀어보자.</> : <>어서 와.<br />오늘은 무슨 이야기야?</>}</div>
        <button className="room-resident" aria-label="영냥이 쓰다듬기" onClick={() => setReaction(value => value ? 0 : 1)}>
          <img src={reaction ? "/_soulcat/assets/prologue-cat.webp" : "/_soulcat/assets/hero-800.webp"} width={480} height={480} alt="방석 위에서 이야기를 기다리는 영냥이" />
        </button>
        <p className="room-presence-caption">거창한 고민이 아니어도 돼.</p>
      </section>
      <section className="room-conversation" id="room-conversation" aria-labelledby="conversation-title">
        <div className="room-conversation-heading"><div><h2 id="conversation-title">그래서, 무슨 이야기야?</h2><p>잘 정리된 말보다, 네 진짜 마음이 궁금해.</p></div><Heart size={21} /></div>
        <div className="room-reading-choice"><label htmlFor="room-reading">상담에 참고할 나의 운세</label><select id="room-reading" value={readingId} disabled={busy||loadingReadings} onChange={e=>{setReadingId(e.target.value);setNotes([]);setCounselError('');}}><option value="">{loadingReadings?'운세를 확인하고 있어요':'운세를 선택해 주세요'}</option>{readings.map(r=><option key={r.id} value={r.id}>{r.name} · {r.packageName}</option>)}</select>{!loadingReadings&&!readings.length&&<p>완성된 본인 운세가 필요해요. <a href="/yeongnyangi/fortune/">운세 입력하기</a></p>}</div>
        {counselError&&<p role="alert">{counselError}</p>}
        <div className="room-starters" aria-label="이야기 시작하기">
          {starters.map(text => <button key={text} onClick={() => { setDraft(text); input.current?.focus(); }}>{text}<ChevronRight size={14}/></button>)}
        </div>
        <div ref={notebook} tabIndex={0} className="room-notebook" aria-live="polite" aria-relevant="additions" role="log" aria-label="이 방에서 정리한 고민">
          {notes.map((note,index) => <div className="room-note-entry" key={index}><div className="room-question"><span>내가 적은 고민</span><p>{note.question}</p></div><div className="room-guide"><PawPrint size={18}/><div><span>영냥이의 모의 고민 상담</span><p>{note.guide}</p></div></div></div>)}
        </div>
        <form className="room-composer" onSubmit={submit}>
          <label htmlFor="room-question">지금 마음에 걸리는 이야기</label>
          <textarea ref={input} id="room-question" value={draft} onChange={event => setDraft(event.target.value)} maxLength={1000} rows={3} placeholder="연애, 일, 오늘 있었던 일… 어떤 이야기든 편하게 적어봐." aria-describedby="room-input-note" />
          <div className="room-composer-actions"><span>{draft.length} / 1,000</span><button type="submit" disabled={!draft.trim()||!readingId||busy}>{busy?'상담 확인 중':'고민 상담하기'}<Send size={16}/></button></div>
          <p id="room-input-note">선택한 운세를 참고하는 모의 상담입니다. 질문과 최근 대화 일부가 서버로 전송되며, 대화 기록은 이 화면을 나가면 사라져요.</p>
        </form>
        <a className="room-fortune-link" href="/yeongnyangi/fortune/">운세로 내 흐름 살펴보기<ArrowRight size={16}/></a>
      </section>
      <section className="room-stories" aria-labelledby="room-story-title">
        <div className="room-story-heading"><BookOpen size={19}/><h2 id="room-story-title">내 얘기도, 들어볼래?</h2></div>
        <button ref={storyButton} className="room-prologue-entry" onClick={() => { setStep(0); setStoryOpen(true); }}>
          <img src="/_soulcat/assets/story-mirror.webp" width={480} height={270} alt="" loading="lazy" />
          <span><strong>두 대통령의 운명을 맞힌 밤,<br />나는 고양이가 됐다.</strong><span>영묘진인에서 영냥이로. 그날의 이야기.</span><b>프롤로그 보기 <ArrowRight size={16}/></b></span>
        </button>
      </section>
      <section className="room-small-moment" aria-label="영냥이의 작은 휴식"><CatMotion/><div><Sparkles size={18}/><h2>조금 쉬어도 괜찮아.</h2><p>답을 빨리 찾는 것보다,<br/>네 마음을 놓치지 않는 게 먼저야.</p></div></section>
    </div>
    <footer className="room-footer"><PawPrint size={18}/>오늘도, 네 이야기에 작은 달빛 하나.</footer>
    {storyOpen && <dialog ref={dialog} className="experience-dialog story-dialog" aria-label="영냥이의 프롤로그" onCancel={event => { event.preventDefault(); closeStory(); }}>
      <div className="dialog-inner"><div className="dialog-header"><span><BookOpen size={17}/>영냥이의 방 · 프롤로그</span><button className="icon-button" aria-label="닫기" onClick={closeStory}><X size={22}/></button></div>
      <StoryPanel step={step} onPrevious={() => setStep(value => Math.max(0,value-1))} onNext={() => setStep(value => Math.min(7,value+1))} onClose={closeStory} onReading={() => { window.location.assign('/yeongnyangi/fortune/'); }}/></div>
    </dialog>}
  </main>;
}

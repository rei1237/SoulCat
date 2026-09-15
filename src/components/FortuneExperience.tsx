"use client";
import {sessionFetch} from "../lib/session";
import {depthDescriptions} from '../../server/fortune/reading-policy';
import {productManifest} from '../../server/fortune/product-manifest';
import {ApiError} from "../lib/checkout";
import {loginHref} from "../lib/service-links";
import BirthFields, {readBirthFields} from "./BirthFields";
import "./free-fortune.css";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, BookOpen } from "lucide-react";
import {
  fortuneLoadingArt,
  fortuneSurfaces,
  FortuneDomainId,
} from "@/data/fortune";
import { topicEntry, isHomeTopic, topicLabel, type HomeTopicId } from "@/data/topics";
import "./fortune.css";
import ChartTabs from "./ChartTabs";
import {FishReaction} from "./FishCatalog";
import type {Product} from "../../server/payments/catalog";
import DestinyBook, { BookView } from "./DestinyBook";
import type { ChartView } from "../../server/fortune/charts";

interface Reading {
  title: string;
  summary: string;
  sections: { title: string; content: string; evidence: string[] }[];
  yeongnyangiComment: string;
  cautions: string[];
}
const cities = [
  {
    name: "서울",
    latitude: 37.5665,
    longitude: 126.978,
    timezone: "Asia/Seoul",
  },
  {
    name: "부산",
    latitude: 35.1796,
    longitude: 129.0756,
    timezone: "Asia/Seoul",
  },
  { name: "직접 입력", latitude: 0, longitude: 0, timezone: "" },
];
async function api(path: string, body?: object, signal?: AbortSignal) {
  const response = await (path === "session" ? sessionFetch() : fetch(`/api/yeongnyangi/${path}`, {
    credentials: "same-origin",
    signal,
    ...(body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  }));
  let data;
  try {data=await response.json();}catch{throw new Error("연결이 잠시 끊겼어요. 같은 구매에서 다시 시도해 주세요. 확인된 구매 권리는 보관되어 있어요.");}
  if (!response.ok)
    throw new ApiError(data.code,
      data.message || "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
      data,
    );
  return data;
}
export default function FortuneExperience() {
  const [login,setLogin]=useState("");
  const [domain, setDomain] = useState<FortuneDomainId>("saju");
  const [topic, setTopic] = useState("");
  // Home recommendation cards arrive with ?topic=; it steers the server manifest and the loading art.
  const [topicId, setTopicId] = useState<HomeTopicId | "general">("general");
  const [fusionId,setFusionId]=useState("");
  const [charts,setCharts]=useState<ChartView[]>([]);
  const [paid,setPaid]=useState(false);
  const [chart, setChart] = useState<ChartView | null>(null);
  const [book, setBook] = useState<BookView | null>(null);
  const [readingMode, setReadingMode] = useState<"personal" | "compatibility">(
    "personal",
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [localMock, setLocalMock] = useState(false);
  const [fish, setFish] = useState("mackerel");
  const [stage, setStage] = useState<
    "choose" | "input" | "chart" | "checkout" | "loading" | "result"
  >("choose");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [result, setResult] = useState<Reading | null>(null);
  const [requestId, setRequestId] = useState("");
  const [progress, setProgress] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const lock = useRef(false);
  const surface = fortuneSurfaces[domain];
  const product = products.find(
    (p) => fusionId?p.id===fusionId:p.readingKind==="single"&&p.domain === domain && p.fishId === fish,
  );
  const chipArt = surface.choices.find(([name]) => name === topic)?.[2];
  const topicArt = topicId !== "general" ? topicEntry[topicId].artKey : chipArt;
  const submittedTopicId = topicId !== "general" ? topicId : ["love","luck","work","money"].includes(chipArt||"") ? chipArt : "general";
  const loadingKey = (topicArt ?? domain) as keyof typeof fortuneLoadingArt;
  const loadingArt =
    fortuneLoadingArt[loadingKey] ??
    fortuneLoadingArt[domain] ??
    fortuneLoadingArt.default;
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search);
    const selected = initial.get("domain");
    if (selected && selected in fortuneSurfaces)
      setDomain(selected as FortuneDomainId);
    const requestedTopic = initial.get("topic");
    const homeTopic = isHomeTopic(requestedTopic) && selected && (topicEntry[requestedTopic].domains as readonly string[]).includes(selected) ? requestedTopic : null;
    if (homeTopic && !initial.get("product") && !initial.get("request")) {
      setTopicId(homeTopic);
      setTopic(`${topicLabel(homeTopic)} · ${topicEntry[homeTopic].title}`);
      setReadingMode(topicEntry[homeTopic].readingMode);
      if (!initial.get("profile")) setStage("input");
    }
    api("products")
      .then(async (d) => {
        setProducts(d.products);
        const params=new URLSearchParams(window.location.search),fusion=d.products.find((p:Product)=>p.id===params.get('product')&&p.readingKind!=='single');
        if(fusion){setFusionId(fusion.id);setDomain(fusion.domain);setFish(fusion.fishId);setTopic(fusion.name);setStage('input');}
        else if(['mackerel','salmon','flounder','tuna'].includes(params.get('fish')||''))setFish(params.get('fish')!);
        setLocalMock(d.mode === "local-mock");
        const savedProfile=params.get('profile');
        if(savedProfile&&!params.get('request')){
          const restored=await api('charts',{profileId:savedProfile,...(fusion?{productId:fusion.id}:{})});
          setProfileId(savedProfile);setDomain(restored.chart.domain);setCharts(restored.charts||[restored.chart]);setChart(restored.chart);
          if(!fusion&&!homeTopic)setTopic(fortuneSurfaces[restored.chart.domain as FortuneDomainId].name);
          setStage('chart');
        }
      })
      .catch((e) => {
        setError(e.message || "상품 정보를 불러오지 못했어요. 새로고침해 주세요.");
        if(e instanceof ApiError && e.code==="SESSION_REQUIRED")setLogin(loginHref(window.location.pathname+window.location.search));
      });
    const pending = new URLSearchParams(window.location.search).get("request");
    if (pending) {
      setRequestId(pending);
      setStage("loading");
    }
  }, []);
  useEffect(() => {
    if (!requestId || stage !== "loading") return;
    let cancelled = false;
    const abort=new AbortController();
    const leave=()=>{cancelled=true;abort.abort();};
    const resume=(event:PageTransitionEvent)=>{if(event.persisted)setPollVersion(n=>n+1);};
    window.addEventListener("pagehide",leave);
    window.addEventListener("pageshow",resume);
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await api(
          `fortune/status?id=${encodeURIComponent(requestId)}`, undefined, abort.signal,
        );
        if (cancelled) return;
        if (data.book) {
          setBook(data.book);
          setStage("result");
          return;
        }
        if (data.result) {
          setResult(data.result);
          setStage("result");
          return;
        }
        if (data.status === "FAILED" || data.status === "UNCERTAIN") {
          setRetryable(data.retryable === true);
          setError(
            data.message ||
              "결과 생성을 마치지 못했어요. 구매 권리는 보관되어 있어요.",
          );
          setProgress("결과 생성 확인이 필요해요.");
          return;
        }
        setProgress(
          data.status === "RUNNING"
            ? "계산한 자료를 바탕으로 상담을 정리하고 있어."
            : "상담 순서를 확인하고 있어.",
        );
        timer = setTimeout(poll, 2500);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    poll();
    return () => {
      leave();
      window.removeEventListener("pagehide",leave);
      window.removeEventListener("pageshow",resume);
      clearTimeout(timer);
    };
  }, [requestId, stage, pollVersion]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    function person(prefix: string) {
      const city = cities[Number(data.get(`${prefix}city`) || 0)];
      return {
        birthDate: data.get(`${prefix}date`),
        birthTime: data.get(`${prefix}time`) || undefined,
        gender: data.get(`${prefix}gender`),
        calendarType: "solar",
        birthPlace:
          city.name !== "직접 입력"
            ? city
            : {
                latitude: Number(data.get(`${prefix}lat`)),
                longitude: Number(data.get(`${prefix}lon`)),
                timezone: data.get(`${prefix}zone`),
              },
      };
    }
    try {
      await api("session", {});
      const saved = await api("profiles", {
        domain,
        input: {
          readingMode,
          ...(domain!=="tarot"?{personA: person("a")}:{}),
          topicId: submittedTopicId,
          ...(domain === "sukuyo" && readingMode === "compatibility"
            ? { personB: person("b") }
            : {}),
          question: `${topic}. ${data.get("question") || ""}`,
        },
      });
      setProfileId(saved.id);
      const snapshotParams=new URLSearchParams({domain,profile:saved.id,fish,...(fusionId?{product:fusionId}:{}),...(topicId!=='general'?{topic:topicId}:{})});
      window.history.replaceState(null,'','/yeongnyangi/fortune/?'+snapshotParams);
      const calculated = await api("charts", { profileId: saved.id, ...(fusionId?{productId:fusionId}:{}) });
      setChart(calculated.chart);
      setCharts(calculated.charts||[calculated.chart]);
      setStage("chart");
    } catch (e) {
      setError((e as Error).message);
      if(e instanceof ApiError && e.code==="SESSION_REQUIRED")setLogin(loginHref(window.location.pathname+window.location.search));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function preview() {
    if (lock.current || !product) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (localMock)
        await api("testing/purchase", {
          productId: product.id,
          profileId,
          idempotencyKey: `mock-${profileId}-${product.id}`,
        });
      if(localMock)setPaid(true);
      const d = await api("fortune/generate", {
        productId: product.id,
        profileId,
      });
      setRequestId(d.id);
      setStage("loading");
      window.history.replaceState(
        null,
        "",
        `/yeongnyangi/fortune/?domain=${domain}&request=${encodeURIComponent(d.id)}`,
      );
    } catch (e) {
      setError((e as Error).message);
      if(e instanceof ApiError && e.code==="SESSION_REQUIRED")setLogin(loginHref(window.location.pathname+window.location.search));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function purchase() {
    if(lock.current||!product)return;
    lock.current=true;setBusy(true);setError('');
    try {
      await api('session',{});
      // 결제는 코드 데스티니 결제창(단건 결제 전용)에서만. 워커는 CD 증빙이 있으면 바로 책을 만들고, 없으면 402 로 결제창 주소를 준다.
      const result=await api('orders',{productId:product.id,profileId,idempotencyKey:crypto.randomUUID()});
      if(result?.status==='PAID'&&result.requestId){setPaid(true);setRequestId(result.requestId);setStage('loading');window.history.replaceState(null,'','/yeongnyangi/fortune/?request='+encodeURIComponent(result.requestId));}
      else setError('결제가 완료되지 않았어요. 보관함에서 상태를 확인해 주세요.');
    } catch(e){
      if(e instanceof ApiError&&e.code==='PAYMENT_REQUIRED'&&typeof e.data.checkoutUrl==='string'&&e.data.checkoutUrl.startsWith('/checkout/')){window.location.assign(e.data.checkoutUrl);return;}
      setError((e as Error).message);
      if(e instanceof ApiError&&e.code==='SESSION_REQUIRED')setLogin(loginHref(window.location.pathname+window.location.search));
    }
    finally{lock.current=false;setBusy(false);}
  }
  return (
    <main className="fortune-shell">
      {login && <a className="fortune-back" href={login}>로그인하고 이어가기</a>}
      <header className="fortune-header">
        <a href="/yeongnyangi/" aria-label="Code Destiny 홈으로">
          <ArrowLeft size={20} /> 점술방
        </a>
        <span>{fusionId||book?.charts?.length&&book.charts.length>1?"초융합 상담":topicId!=="general"?`${surface.name} · ${topicLabel(topicId)}`:surface.name}</span>
        <a href="/yeongnyangi/library/" aria-label="나의 결과 보관함">
          <BookOpen size={21} />
        </a>
      </header>
      {stage === "choose" && (
        <>
          <div className="fortune-intro">
            <h1>{surface.title}</h1>
            <p>{surface.line}</p>
          </div>
          <div
            className={`reading-choices ${domain === "sukuyo" ? "relationship-choices" : ""}`}
          >
            {surface.choices.map(([name, caption, art], i) => (
              <button
                key={name}
                className="reading-choice"
                onClick={() => {
                  setTopic(name);
                  setTopicId("general");
                  setReadingMode(
                    name === "나의 본명숙" ? "personal" : "compatibility",
                  );
                  setStage("input");
                }}
              >
                <img
                  src={art==="tarot"?"/_soulcat/assets/tarot.webp":`/_soulcat/assets/fortune/${art}-illustration.webp`}
                  alt=""
                  width={560}
                  height={560}
                  decoding="async"
                  loading={i < 2 ? "eager" : "lazy"}
                />
                <div>
                  <h2>{name}</h2>
                  <p>{caption}</p>
                  <span>
                    <img
                      src="/_soulcat/assets/fish/mackerel.webp"
                      alt=""
                      width={40}
                      height={32}
                    />
                    고등어부터 <ArrowRight size={15} />
                  </span>
                </div>
              </button>
            ))}
          </div>
          <p className="fortune-footnote">
            생선은 상담 상품의 가격을 나타내요. 생선값은 코드 데스티니 결제창에서 단건 결제(카드·카카오페이 등)로만 받아요.
            영냥이의 세계는 다른 차원이라 달빛 이용권·월정석은 통하지 않습니다.
          </p>
          <blockquote className="fortune-footnote fortune-quote">
            <p>“이용권? 월정석? 먹지도 못하는 걸 어디에 써? 나는 꽃돼지 연이처럼 그렇게 혜자는 아니야~”</p>
            <footer>— 영냥이</footer>
          </blockquote>
        </>
      )}
      {stage === "input" && (
        <form className="fortune-form" onSubmit={submit}>
          <button
            type="button"
            className="fortune-back"
            onClick={() => { setTopicId("general"); setTopic(""); setStage("choose"); }}
          >
            <ArrowLeft size={16} /> 이야기 다시 고르기
          </button>
          <h1>
            {domain === "sukuyo" && readingMode === "compatibility"
              ? "두 사람의 이야기를 들려줘."
              : "너를 알아갈 단서를 알려줘."}
          </h1>
          <p>{topic}</p>
          {domain!=="tarot" && <ProfileFields
            prefix="a"
            title={domain === "sukuyo" ? "나의 정보" : "출생 정보"}
            domain={domain}
          />}
          {domain === "sukuyo" && !fusionId && (
            <label>
              분석 범위
              <select
                value={readingMode}
                onChange={(e) =>
                  setReadingMode(e.target.value as "personal" | "compatibility")
                }
              >
                <option value="personal">나의 본명숙</option>
                <option value="compatibility">두 사람의 궁합</option>
              </select>
            </label>
          )}
          {domain === "sukuyo" && readingMode === "compatibility" && (
            <ProfileFields prefix="b" title="상대방 정보" domain={domain} />
          )}
          <label>
            궁금한 이야기
            <textarea
              name="question"
              required={domain==="tarot"||!!fusionId}
              maxLength={900}
              rows={3}
              placeholder="요즘 마음에 걸리는 일을 들려줘."
            />
          </label>
          <p className="fortune-footnote">
            {domain==="tarot"?"카드는 서버에서 한 번 확정하고 보관해요. 다시 열어도 같은 배열을 읽어요.":"선택한 달력과 출생지로 계산해요. 사주·자미두수는 검증된 한국 표준시 출생을 지원해요. 출생 정보는 상담 계산과 결과 보관에 사용해요."}
          </p>
          <button className="fortune-primary" disabled={busy}>
            {busy ? "기본 차트 계산 중" : "내 기본 차트 확인하기"}
            <ArrowRight size={18} />
          </button>
        </form>
      )}
      {stage === "chart" && chart && (
        <>
          <ChartTabs charts={charts.length?charts:[chart]} />
          <button
            className="fortune-primary"
            onClick={() => setStage("checkout")}
          >
            이 차트로 해설 선택하기
          </button>
          <button className="fortune-back" onClick={() => setStage("input")}>
            출생정보 수정하기
          </button>
        </>
      )}
      {stage === "checkout" && (
        <section className="fortune-checkout">
          <h1>{fusionId?product?.fishName:"어떤 생선을 가져왔어?"}</h1>
          <p>{fusionId?"확인한 차트들을 나란히 읽고, 공통점과 차이를 풀어볼게.":"기본은 고등어. 궁금한 만큼 천천히 골라봐."}</p>
          <div
            className="fish-choices"
            role="group"
            aria-label="생선 상품 선택"
          >
            {products
              .filter((p) => fusionId?p.id===fusionId:p.domain === domain&&p.readingKind==="single")
              .map((p) => (
                <button
                  key={p.id}
                  aria-pressed={fish === p.fishId}
                  onClick={() => setFish(p.fishId)}
                >
                  <img src={p.image} alt="" width={100} height={90} />
                  <span>{p.fishName} · {p.chapterCount}챕터</span><small>{depthDescriptions[p.fishId]}</small>
                  {fish === p.fishId && <Check size={18} />}
                </button>
              ))}
          </div>
          {product && (
            <div className="payment-summary">
              <h2>
                {product.name}
              </h2>
              <p>
                실제 결제금액{" "}
                <strong>{product.priceKRW.toLocaleString("ko-KR")}원</strong>
              </p>
              <p>선택한 상담: {topic} · {product.chapterCount}챕터</p><details><summary>이 상담의 목차와 해석 범위</summary><p>{depthDescriptions[product.fishId]}</p><ol>{productManifest(product,submittedTopicId,readingMode).map(c=><li key={c.id}>{c.title}</li>)}</ol></details>
              <FishReaction product={product}/>
            </div>
          )}
          {!localMock && product?.enabled && <div className="checkout-form">
            <p className="fortune-footnote">영냥이의 세계는 코드 데스티니와 다른 차원이에요. 달빛 이용권도, 월정석도 그 문을 넘지 못합니다. 복채는 생선값 그대로, 단건 결제(카드·카카오페이 등)만 받아요.</p>
            <button type="button" className="fortune-primary" disabled={busy} onClick={purchase}>{busy?'결제 확인 중':product.priceKRW.toLocaleString('ko-KR')+'원 단건 결제하러 가기'}</button>
          </div>}
          {!product?.enabled && <p className="fortune-footnote">
            이 상담은 아직 준비 중인 생선이에요. 현재 실제 구매는 열려 있지 않아요.
          </p>}
          {(localMock || !product?.enabled) && <button
            className="fortune-primary"
            disabled={busy || (!product?.enabled && !localMock)}
            onClick={preview}
          >
            {busy
              ? "상담 확인 중"
              : localMock
                ? "개발용 구매 흐름 확인 · 청구 없음"
                : "상담 준비 중"}
          </button>}
          <button className="fortune-back" onClick={() => setStage("input")}>
            입력으로 돌아가기
          </button>
        </section>
      )}
      {paid && product && (stage==="loading"||stage==="result") && <FishReaction product={product} paid/>}
      {stage === "loading" && (
        <section className="fortune-loading" aria-live="polite">
          <div className="fortune-loading-stage">
            <span className="fortune-loading-orbit" aria-hidden="true" />
            <img
              src={`/_soulcat/assets/fortune/${loadingArt.image}`}
              width={520}
              height={520}
              alt={loadingArt.alt}
            />
          </div>
          <h1>{loadingArt.title}</h1>
          <p>{progress || "저장된 상담 상태를 확인하고 있어."}</p>
          <p className="fortune-loading-note">
            이 화면을 닫아도 보관함에서 진행 상태를 확인할 수 있어요.
          </p>
          <a href="/yeongnyangi/library/">보관함으로 이동</a>
        </section>
      )}
      {stage === "result" && book && <DestinyBook initial={book} />}
      {stage === "result" && result && !book && (
        <article className="fortune-result">
          <h1>{result.title}</h1>
          <p className="result-summary">{result.summary}</p>
          {result.sections.map((s, i) => (
            <section key={i}>
              <h2>{s.title}</h2>
              {s.content
                .split("\n")
                .filter(Boolean)
                .map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
            </section>
          ))}
          <aside>
            <h2>영냥이의 한마디</h2>
            <p>{result.yeongnyangiComment}</p>
          </aside>
          {result.cautions.map((c, i) => (
            <p className="fortune-footnote" key={i}>
              {c}
            </p>
          ))}
        </article>
      )}
      {error && (
        <p className="fortune-error" role="alert">
          {error}
        </p>
      )}
      {retryable && (
        <button
          className="fortune-primary"
          disabled={busy}
          onClick={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            try {
              await api("fortune/retry", { requestId });
              setError("");
              setRetryable(false);
              setPollVersion((v) => v + 1);
            } catch (e) {
              setError((e as Error).message);
      if(e instanceof ApiError && e.code==="SESSION_REQUIRED")setLogin(loginHref(window.location.pathname+window.location.search));
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          추가 결제 없이 다시 생성하기
        </button>
      )}
    </main>
  );
}
function ProfileFields({prefix,title,domain}:{prefix:string;title:string;domain:FortuneDomainId}) {
 return <BirthFields prefix={prefix} title={title} timeRequired={domain!=="saju"}/>;
}

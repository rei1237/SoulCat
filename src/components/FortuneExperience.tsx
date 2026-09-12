"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, BookOpen } from "lucide-react";
import { fortuneSurfaces, FortuneDomainId } from "@/data/fortune";
import "./fortune.css";

interface Product {
  id: string;
  domain: string;
  fishId: string;
  fishName: string;
  priceKRW: number;
  image: string;
  enabled: boolean;
}
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
async function api(path: string, body?: object) {
  const response = await fetch(`/api/${path}`, {
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
    throw new Error(
      data.message || "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
  return data;
}
export default function FortuneExperience() {
  const [domain, setDomain] = useState<FortuneDomainId>("saju");
  const [topic, setTopic] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [localMock, setLocalMock] = useState(false);
  const [fish, setFish] = useState("mackerel");
  const [stage, setStage] = useState<
    "choose" | "input" | "checkout" | "loading" | "result"
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
    (p) => p.domain === domain && p.fishId === fish,
  );
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("domain");
    if (selected && selected in fortuneSurfaces)
      setDomain(selected as FortuneDomainId);
    api("products")
      .then((d) => {
        setProducts(d.products);
        setLocalMock(d.mode === "local-mock");
      })
      .catch(() =>
        setError("상품 정보를 불러오지 못했어요. 새로고침해 주세요."),
      );
    const pending = new URLSearchParams(window.location.search).get("request");
    if (pending) {
      setRequestId(pending);
      setStage("loading");
    }
  }, []);
  useEffect(() => {
    if (!requestId || stage !== "loading") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await api(
          `fortune/status?id=${encodeURIComponent(requestId)}`,
        );
        if (cancelled) return;
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
      cancelled = true;
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
          personA: person("a"),
          ...(domain === "sukuyo" ? { personB: person("b") } : {}),
          question: `${topic}. ${data.get("question") || ""}`,
        },
      });
      setProfileId(saved.id);
      setStage("checkout");
    } catch (e) {
      setError((e as Error).message);
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
      const d = await api("fortune/generate", {
        productId: product.id,
        profileId,
      });
      setRequestId(d.id);
      setStage("loading");
      window.history.replaceState(
        null,
        "",
        `/fortune/?domain=${domain}&request=${encodeURIComponent(d.id)}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="fortune-shell">
      <header className="fortune-header">
        <Link href="/" aria-label="영냥이 홈으로">
          <ArrowLeft size={20} /> 점술방
        </Link>
        <span>{surface.name}</span>
        <Link href="/library/" aria-label="나의 결과 보관함">
          <BookOpen size={21} />
        </Link>
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
                  setStage("input");
                }}
              >
                <img
                  src={`/assets/fortune/${art}-illustration.webp`}
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
                      src="/assets/fish/mackerel.webp"
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
            생선은 상담 상품의 가격을 나타내요. 결제 전 실제 금액을 확인할 수
            있어요.
          </p>
        </>
      )}
      {stage === "input" && (
        <form className="fortune-form" onSubmit={submit}>
          <button
            type="button"
            className="fortune-back"
            onClick={() => setStage("choose")}
          >
            <ArrowLeft size={16} /> 이야기 다시 고르기
          </button>
          <h1>
            {domain === "sukuyo"
              ? "두 사람의 이야기를 들려줘."
              : "너를 알아갈 단서를 알려줘."}
          </h1>
          <p>{topic}</p>
          <ProfileFields
            prefix="a"
            title={domain === "sukuyo" ? "나의 정보" : "출생 정보"}
            domain={domain}
          />
          {domain === "sukuyo" && (
            <ProfileFields prefix="b" title="상대방 정보" domain={domain} />
          )}
          <label>
            궁금한 이야기
            <textarea
              name="question"
              maxLength={900}
              rows={3}
              placeholder="요즘 마음에 걸리는 일을 들려줘."
            />
          </label>
          <p className="fortune-footnote">
            양력 기준이에요. 사주·자미두수는 한국 표준시 출생을 기준으로 해요.
            출생 정보는 상담 계산과 결과 보관에 사용해요.
          </p>
          <button className="fortune-primary" disabled={busy}>
            {busy ? "정보 확인 중" : "생선 고르기"}
            <ArrowRight size={18} />
          </button>
        </form>
      )}
      {stage === "checkout" && (
        <section className="fortune-checkout">
          <h1>어떤 생선을 가져왔어?</h1>
          <p>기본은 고등어. 궁금한 만큼 천천히 골라봐.</p>
          <div
            className="fish-choices"
            role="group"
            aria-label="생선 상품 선택"
          >
            {products
              .filter((p) => p.domain === domain)
              .map((p) => (
                <button
                  key={p.id}
                  aria-pressed={fish === p.fishId}
                  onClick={() => setFish(p.fishId)}
                >
                  <img src={p.image} alt="" width={100} height={90} />
                  <span>{p.fishName} 한 마리</span>
                  {fish === p.fishId && <Check size={18} />}
                </button>
              ))}
          </div>
          {product && (
            <div className="payment-summary">
              <h2>
                {product.fishName} 한 마리로 {surface.name}
              </h2>
              <p>
                실제 결제금액{" "}
                <strong>{product.priceKRW.toLocaleString("ko-KR")}원</strong>
              </p>
              <p>선택한 상담: {topic}</p>
            </div>
          )}
          <p className="fortune-footnote">
            상담·결제 연결을 검증하고 있어요. 현재 실제 구매는 열려 있지 않아요.
          </p>
          <button
            className="fortune-primary"
            disabled={busy || (!product?.enabled && !localMock)}
            onClick={preview}
          >
            {busy
              ? "상담 확인 중"
              : localMock
                ? "개발용 구매 흐름 확인 · 청구 없음"
                : "상담 준비 중"}
          </button>
          <button className="fortune-back" onClick={() => setStage("input")}>
            입력으로 돌아가기
          </button>
        </section>
      )}
      {stage === "loading" && (
        <section className="fortune-loading" aria-live="polite">
          <img
            src="/assets/fortune/loading.webp"
            width={280}
            height={280}
            alt="자료를 들여다보는 영냥이"
          />
          <h1>조금만 기다려봐.</h1>
          <p>{progress || "저장된 상담 상태를 확인하고 있어."}</p>
          <p>이 화면을 닫아도 보관함에서 진행 상태를 확인할 수 있어요.</p>
          <Link href="/library/">보관함으로 이동</Link>
        </section>
      )}
      {stage === "result" && result && (
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
function ProfileFields({
  prefix,
  title,
  domain,
}: {
  prefix: string;
  title: string;
  domain: FortuneDomainId;
}) {
  const [city, setCity] = useState("0");
  return (
    <fieldset>
      <legend>{title}</legend>
      <label>
        생년월일
        <input name={`${prefix}date`} type="date" min="1901-01-01" required />
      </label>
      <div className="input-pair">
        <label>
          출생시간{domain === "saju" ? " (모르면 비워두기)" : ""}
          <input
            name={`${prefix}time`}
            type="time"
            required={domain !== "saju"}
          />
        </label>
        <label>
          성별
          <select name={`${prefix}gender`} required defaultValue="">
            <option value="" disabled>
              선택
            </option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </label>
      </div>
      {["sukuyo", "vedic", "astrology"].includes(domain) && (
        <>
          <label>
            출생지
            <select
              name={`${prefix}city`}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {cities.map((c, i) => (
                <option key={c.name} value={i}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {city === "2" && (
            <>
              <div className="input-pair">
                <label>
                  위도
                  <input
                    name={`${prefix}lat`}
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    required
                  />
                </label>
                <label>
                  경도
                  <input
                    name={`${prefix}lon`}
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    required
                  />
                </label>
              </div>
              <label>
                출생지 시간대
                <input
                  name={`${prefix}zone`}
                  placeholder="Asia/Seoul"
                  required
                />
              </label>
            </>
          )}
        </>
      )}
    </fieldset>
  );
}

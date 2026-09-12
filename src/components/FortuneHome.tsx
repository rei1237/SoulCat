"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  ChevronRight,
  Circle,
  Compass,
  Copy,
  Eye,
  Heart,
  House,
  KeyRound,
  MessageCircle,
  Moon,
  PawPrint,
  Sparkles,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import CatMotion from "./CatMotion";
import {
  concerns,
  dailyMessages,
  recommendations,
  services,
} from "@/data/home";

type Panel =
  | "daily"
  | "auth"
  | "library"
  | "notifications"
  | "service"
  | "fusion"
  | null;
const imagePath = (name: string) => `/_soulcat/assets/${name}.webp`;
const bubbles = [
  "무슨 고민이야?\n어디 한번 볼까.",
  "쓰다듬는 건…\n딱 한 번만이야.",
  "흥, 잘 찾아왔네.\n편하게 앉아.",
];
const concernIcons: Record<string, typeof Heart> = {
  heart: Heart,
  wallet: Wallet,
  rings: Circle,
  briefcase: BriefcaseBusiness,
  book: BookOpen,
  eyes: Eye,
  sparkles: Sparkles,
};

function Art({
  name,
  alt = "",
  className = "",
  width = 460,
  height = 300,
  eager = false,
}: {
  name: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
}) {
  return (
    <img
      src={imagePath(name)}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
function SectionHeading({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {aside}
    </div>
  );
}

export default function FortuneHome() {
  const [panel, setPanel] = useState<Panel>(null);
  const [serviceId, setServiceId] = useState("saju");
  const [concern, setConcern] = useState<string | null>(null);
  const [bubble, setBubble] = useState(0);
  const [petting, setPetting] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [notice, setNotice] = useState("");
  const [today, setToday] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState("night");
  const [activeNav, setActiveNav] = useState("home");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedConcern = concerns.find((item) => item.id === concern);
  const service = services.find((item) => item.id === serviceId) || services[0];
  const message = dailyMessages[dayIndex];

  useEffect(() => {
    const now = new Date();
    const date = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
    }).format(now);
    setToday(date);
    setDayIndex(Math.floor(Date.parse(date) / 86400000) % dailyMessages.length);
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        hour12: false,
      }).format(now),
    );
    setTimeOfDay(hour >= 7 && hour < 19 ? "day" : "night");
    return () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel) {
      if (!dialog.open) {
        openerRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        dialog.showModal();
      }
      dialog.scrollTop = 0;
      dialog
        .querySelector<HTMLButtonElement>(".dialog-header button")
        ?.focus({ preventScroll: true });
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    if (dialog.open) dialog.close();
    openerRef.current?.focus({ preventScroll: true });
  }, [panel]);

  function openPanel(next: Panel) {
    setNotice("");
    setPanel(next);
  }
  function closePanel() {
    setPanel(null);
    setNotice("");
    setActiveNav(
      window.scrollY <
        (document.getElementById("readings")?.offsetTop || 900) - 100
        ? "home"
        : "readings",
    );
  }
  function openService(id: string) {
    setServiceId(id);
    openPanel("service");
  }
  function navigate(id: string) {
    if (id === "chat") { window.location.assign("/room/"); return; }
    if (id === "home" || id === "readings") {
      closePanel();
      setActiveNav(id);
      document
        .getElementById(id === "home" ? "home" : "readings")
        ?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
    } else {
      setActiveNav(id);
      openPanel(id === "cat" ? "daily" : "library");
    }
  }
  function petCat() {
    setBubble((value) => (value + 1) % bubbles.length);
    setPetting(true);
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setPetting(false), 650);
  }
  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(
        `${message.title}\n${message.text}\n— 사주보는 영냥이`,
      );
      setNotice("문구를 복사했어요.");
    } catch {
      setNotice("복사하지 못했어요. 문구를 길게 눌러 직접 복사해 주세요.");
    }
  }

  const titles: Record<Exclude<Panel, null>, string> = {
    daily: "영냥이의 오늘 한마디",
    auth: "달빛 점술방의 문",
    library: "나의 보관함",
    notifications: "점술방 소식",
    service: service.name,
    fusion: "영냥이의 초융합 운세",
  };

  return (
    <>
      <a className="skip-link" href="#readings">
        운세 목록으로 건너뛰기
      </a>
      <div className="site-shell" id="home">
        <header className="header">
          <a href="#home" className="brand">
            <img src={imagePath("avatar")} width="42" height="34" alt="" />
            <span>
              사주보는 <strong>영냥이</strong>
              <small>FORTUNE SOUL CAT</small>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="주 메뉴">
            <a href="#readings">운세 골라보기</a>
            <button onClick={() => window.location.assign("/room/")}>영냥이의 방</button>
            <a href="#recommendations">영냥이 추천</a>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button bell"
              aria-label="알림 보기"
              onClick={() => openPanel("notifications")}
            >
              <Bell size={21} />
            </button>
            <button
              className="login-button"
              onClick={() => {
                setAuthMode("login");
                openPanel("auth");
              }}
            >
              로그인
            </button>
          </div>
        </header>

        <main>
          <section className="hero" aria-labelledby="hero-title">
            <picture className="hero-room">
              <source
                media="(min-width: 700px)"
                srcSet={imagePath("room-1440")}
              />
              <img
                src={imagePath("room-780")}
                width="780"
                height="439"
                alt=""
                fetchPriority="high"
              />
            </picture>
            <div className="hero-copy">
              <h1 id="hero-title">
                네 운명의 이야기,
                <br />
                <span>내가 읽어줄게.</span>
              </h1>
              <p>달빛이 머무는 작은 점술방</p>
              <div className="desktop-intro">
                모습은 고양이, 실력은 여전하지.
                <br />
                복잡한 마음은 잠깐 내려놓고 들어와.
              </div>
            </div>
            <div className="cat-stage">
              <span className="star star-one" aria-hidden="true">
                <Sparkles />
              </span>
              <span className="star star-two" aria-hidden="true">
                <Sparkles size={17} />
              </span>
              <div className="speech-bubble" aria-live="polite">
                {bubbles[bubble].split("\n").map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
                <PawPrint size={14} />
              </div>
              <button
                className={`hero-cat ${petting ? "is-petted" : ""}`}
                aria-label="영냥이 쓰다듬기"
                onClick={petCat}
              >
                <img
                  src={imagePath("hero-800")}
                  srcSet={`${imagePath("hero-480")} 480w, ${imagePath("hero-800")} 800w`}
                  sizes="(min-width: 900px) 480px, 90vw"
                  width="800"
                  height="800"
                  alt="보라색 마법사 모자를 쓰고 턱을 괸 흰 고양이 영냥이"
                  fetchPriority="high"
                />
                <span className="pet-heart" aria-hidden="true">
                  <Heart size={23} />
                </span>
              </button>
              <span className="cat-caption">
                <PawPrint size={12} /> 영냥이를 살짝 눌러봐
              </span>
            </div>
            <div className="hero-action">
              <button
                className="primary-cta"
                onClick={() => openPanel("daily")}
              >
                <PawPrint size={21} />
                <span>무료 운세 보기</span>
                <ArrowRight size={21} />
              </button>
              <p>오늘의 한마디부터 가볍게 만나봐요</p>
            </div>
          </section>

          <div className="main-content">
            <button
              className="prologue-banner"
              onClick={() => window.location.assign("/room/")}
            >
              <Art name="story-mirror" className="prologue-backdrop" />
              <span className="prologue-copy">
                <span className="small-label">
                  <BookOpen size={14} /> 영냥이의 방 · 프롤로그
                </span>
                <strong>
                  두 대통령의 운명을 맞힌 밤, <br />나는 고양이가 됐다.
                </strong>
                <span className="text-link">
                  그날의 이야기 <ArrowRight size={15} />
                </span>
              </span>
              <Art
                name="surprised"
                className="prologue-cat"
                width={480}
                height={640}
              />
            </button>

            <section
              className="concern-section"
              aria-labelledby="concern-title"
            >
              <div className="section-heading">
                <h2 id="concern-title">지금 뭐가 궁금해?</h2>
                <PawPrint size={19} className="gold" />
              </div>
              <p className="section-description">
                어려운 건 몰라도 돼. 네 고민부터 골라봐.
              </p>
              <div className="concern-chips">
                {concerns.map((item) => {
                  const Icon = concernIcons[item.icon];
                  return (
                    <button
                      key={item.id}
                      aria-pressed={concern === item.id}
                      onClick={() =>
                        setConcern(concern === item.id ? null : item.id)
                      }
                    >
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedConcern && (
                <div className="concern-answer" aria-live="polite">
                  <p>{selectedConcern.line}</p>
                  <div>
                    {selectedConcern.ids.map((id) => (
                      <button key={id} onClick={() => openService(id)}>
                        {services.find((x) => x.id === id)?.name} 살펴보기
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section
              className="readings-section"
              id="readings"
              aria-labelledby="readings-title"
            >
              <div className="section-heading">
                <h2 id="readings-title">운세 골라보기</h2>
                <span className="section-aside">여섯 가지 운명의 언어</span>
              </div>
              <div className="service-grid">
                {services.map((item) => (
                  <button
                    className={`service-card ${item.id === "ziwei" ? "ivory-art" : ""} ${selectedConcern && (selectedConcern.ids as readonly string[]).includes(item.id) ? "is-recommended" : ""}`}
                    key={item.id}
                    onClick={() => openService(item.id)}
                  >
                    <div className="service-image">
                      <Art
                        name={item.image}
                        alt={`${item.name}를 보는 영냥이`}
                      />
                      <span className="card-ornament" aria-hidden="true">
                        ✧
                      </span>
                    </div>
                    <div className="service-copy">
                      <h3>{item.name}</h3>
                      <p>{item.subtitle}</p>
                      <span>
                        보러가기 <ArrowRight size={14} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="fusion-section" aria-labelledby="fusion-title">
              <div className="fusion-card">
                <Art name="story-curse" className="fusion-art" />
                <div className="fusion-shade" />
                <div className="fusion-top">
                  <Sparkles size={18} aria-hidden="true" />
                  <Moon size={25} />
                </div>
                <h2 id="fusion-title">
                  흩어진 운명을,
                  <br />
                  <span>하나의 이야기로.</span>
                </h2>
                <p className="fusion-name">영냥이의 초융합 운세</p>
                <p className="fusion-description">
                  서로 다른 운세의 시선을 모아
                  <br />
                  나를 더 깊이 이해하는 시간.
                </p>
                <div className="fusion-systems">
                  사주 · 자미두수 · 점성술 · 숙요 · 베다
                </div>
                <button
                  className="outlined-cta"
                  onClick={() => openPanel("fusion")}
                >
                  내 운명 깊게 보기 <ArrowRight size={17} />
                </button>
              </div>
            </section>

            <section
              className="recommendations-section"
              id="recommendations"
              aria-labelledby="recommendations-title"
            >
              <div className="section-heading">
                <h2 id="recommendations-title">영냥이가 골라봤어</h2>
                <button
                  className="icon-button"
                  aria-label="다음 추천 보기"
                  onClick={() =>
                    carouselRef.current?.scrollBy({
                      left: 245,
                      behavior: matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                        ? "instant"
                        : "smooth",
                    })
                  }
                >
                  <ArrowRight size={20} />
                </button>
              </div>
              <div
                className="recommendation-carousel"
                ref={carouselRef}
                tabIndex={0}
                aria-label="추천 운세 가로 목록"
              >
                {recommendations.map((item) => (
                  <button
                    className="recommendation-card"
                    key={item.title}
                    onClick={() => openService(item.target)}
                  >
                    <Art name={item.image} />
                    <span className="recommendation-copy">
                      <span>{item.category}</span>
                      <strong>{item.title}</strong>
                      <span className="recommendation-link">
                        이야기 살펴보기 <ArrowRight size={14} />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section
              className="room-section"
              id="room"
              aria-labelledby="room-title"
            >
              <SectionHeading>운세가 끝나도, 머물러도 돼.</SectionHeading>
              <div className="room-note">
                <CatMotion daytime={timeOfDay === "day"} />
                <div className="room-note-copy">
                  <span className="room-time">
                    {timeOfDay === "day" ? (
                      <Sun size={14} />
                    ) : (
                      <Moon size={14} />
                    )}
                    {timeOfDay === "day"
                      ? "잠깐 쉬어가는 오후"
                      : "모두 잠든 뒤의 점술방"}
                  </span>
                  <h3 id="room-title">…한마디 더 해줄까.</h3>
                  <p>
                    운명은 읽는 거지만,
                    <br />네 하루를 사는 건 너니까.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => window.location.assign("/room/")}
                  >
                    영냥이의 방 들어가기 <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>

            <footer className="footer">
              <PawPrint size={22} />
              <strong>사주보는 영냥이</strong>
              <p>네 이야기에, 작은 달빛 하나.</p>
              <span>FORTUNE SOUL CAT</span>
              <a href="#home">
                처음으로 <ArrowDown size={13} className="up-arrow" />
              </a>
            </footer>
          </div>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="하단 메뉴">
        {[
          { id: "home", label: "홈", icon: House },
          { id: "readings", label: "운세", icon: Compass },
          { id: "cat", label: "영냥이", icon: PawPrint },
          { id: "chat", label: "수다방", icon: MessageCircle },
          { id: "library", label: "보관함", icon: Bookmark },
        ].map((item) => (
          <button
            key={item.id}
            className={`${item.id === "cat" ? "center-nav" : ""} ${activeNav === item.id ? "active" : ""}`}
            aria-current={activeNav === item.id ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            {item.id === "cat" ? (
              <span className="nav-avatar">
                <img src={imagePath("avatar")} width="45" height="38" alt="" />
              </span>
            ) : (
              <item.icon size={22} />
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <dialog
        ref={dialogRef}
        className="experience-dialog"
        aria-labelledby="panel-title"
        onCancel={closePanel}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePanel();
        }}
      >
        <div className="dialog-inner">
          <div className="dialog-header">
            <span>
              <PawPrint size={17} />
              <span id="panel-title">{panel ? titles[panel] : ""}</span>
            </span>
            <button
              className="icon-button"
              aria-label="닫기"
              onClick={closePanel}
            >
              <X size={22} />
            </button>
          </div>

          {panel === "daily" && (
            <div className="daily-panel panel-body">
              <div className="daily-date">
                <Moon size={15} />
                {today.replaceAll("-", ".")} · 오늘의 한마디
              </div>
              <div className="daily-cat">
                <Art eager name="hero-480" width={480} height={480} />
              </div>
              <h2>{message.title}</h2>
              <p className="daily-text">{message.text}</p>
              <div className="daily-action">
                <Sparkles size={18} />
                <span>{message.action}</span>
              </div>
              <p className="honest-note">
                생년월일로 풀이한 개인 운세가 아닌,
                <br />
                영냥이가 건네는 오늘의 짧은 조언이에요.
              </p>
              <button className="outlined-cta" onClick={copyMessage}>
                <Copy size={18} />
                문구 복사하기
              </button>
            </div>
          )}

          {panel === "auth" && (
            <div className="auth-panel panel-body">
              <div className="auth-tabs" aria-label="계정 메뉴">
                <button
                  aria-pressed={authMode === "login"}
                  onClick={() => setAuthMode("login")}
                >
                  로그인
                </button>
                <button
                  aria-pressed={authMode === "signup"}
                  onClick={() => setAuthMode("signup")}
                >
                  회원가입
                </button>
              </div>
              <Art
                eager
                name={authMode}
                className="auth-art"
                width={440}
                height={560}
                alt={
                  authMode === "login"
                    ? "달빛 문을 살짝 열고 기다리는 영냥이"
                    : "황금 열쇠를 들고 반기는 영냥이"
                }
              />
              <h2>
                {authMode === "login" ? "흥, 다시 왔네." : "처음 왔어? 반가워."}
              </h2>
              <p>
                네 이야기를 간직할 자리를
                <br />
                준비하고 있어.
              </p>
              <div className="availability-note">
                <KeyRound size={18} />
                <span>
                  {authMode === "login" ? "로그인" : "회원가입"}은 준비
                  중이에요.
                  <br />
                  오늘의 한마디와 이야기는 먼저 만나볼 수 있어요.
                </span>
              </div>
              <button
                className="primary-cta"
                onClick={() => openPanel("daily")}
              >
                오늘의 한마디 만나기
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {panel === "service" && (
            <div className="service-panel panel-body">
              <Art
                eager
                name={service.image}
                className={`detail-art ${service.id === "ziwei" ? "ivory-detail" : ""}`}
                alt={`${service.name}를 보는 영냥이`}
              />
              <h2>{service.subtitle}</h2>
              {service.id !== 'tarot' && <a className="outlined-cta" href={`/fortune/?domain=${service.id}`}>상담 살펴보기 <ArrowRight size={18} /></a>}
              <p>{service.description}</p>
              <ul>
                {service.details.map((item) => (
                  <li key={item}>
                    <Sparkles size={15} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="availability-note">
                <BookOpen size={18} />
                <span>
                  상세 리포트는 준비 중이에요.
                  <br />
                  먼저 오늘의 한마디를 만나보세요.
                </span>
              </div>
              <button
                className="outlined-cta"
                onClick={() => openPanel("daily")}
              >
                오늘의 한마디 보기
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {panel === "fusion" && (
            <div className="fusion-panel panel-body">
              <Sparkles size={40} className="gold" />
              <h2>
                하나의 나를,
                <br />
                여러 시선으로.
              </h2>
              <p>
                사주, 자미두수, 서양 점성술, 숙요, 베다점.
                <br />
                서로 다른 체계의 해석을 구분해 살펴보고,
                <br />내 삶에 참고할 이야기를 모으는 리포트예요.
              </p>
              <div className="fusion-chapters">
                <span>나의 바탕</span>
                <span>관계의 패턴</span>
                <span>삶의 방향</span>
                <span>현실적인 조언</span>
              </div>
              <div className="availability-note">
                초융합 리포트는 준비 중이에요.
                <br />
                이용 조건은 서비스가 열릴 때 안내할게요.
              </div>
              <button
                className="outlined-cta"
                onClick={() => navigate("readings")}
              >
                여섯 가지 운세 살펴보기
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {panel === "library" && (
            <div className="library-panel panel-body">
              <Art
                eager
                name="night-read"
                className="empty-art"
                width={310}
                height={325}
              />
              <h2>네 이야기를 위한 서랍.</h2>
              <p>
                운세 리포트를 다시 펼쳐볼 수 있는
                <br />
                보관함을 준비하고 있어요.
              </p>
              <button
                className="outlined-cta"
                onClick={() => navigate("readings")}
              >
                운세 둘러보기
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {panel === "notifications" && (
            <div className="panel-body notifications-panel">
              <Moon size={38} className="gold" />
              <h2>점술방에 어서 와.</h2>
              <p>
                새로운 소식이 생기면 여기에 전할게.
                <br />
                오늘은 내 이야기부터 들어볼래?
              </p>
              <button
                className="outlined-cta"
                onClick={() => window.location.assign("/room/")}
              >
                영냥이의 이야기 보기
                <ArrowRight size={18} />
              </button>
            </div>
          )}
          {notice && (
            <p className="status-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}

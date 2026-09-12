# 영냥이 Fortune Architecture Audit

조사일: 2026-09-12. 실행 프로젝트: `C:/Users/user/Desktop/SoulCatProject` (main, 조사 시작 시 clean).

## 조사 범위와 자료 우선순위

- 에셋 원본: `C:/Users/user/Desktop/사주보는 고양이 영냥이` — TXT 1, PNG 42, WebP 242개. TXT 세계관/로드맵, 하위 폴더 및 기존 파생 에셋 manifest 조사.
- `가격별생선`: 가격 이미지와 생선 단독/구매 이미지 4종 및 홍보 이미지. `docs/fish-audit.png`에 가격 이미지 비교 보존.
- `D:/Development` 전체 코드/문서 내부 키워드 검색: 사주, 명리학, 숙요, 27숙, Jyotish, Nakshatra, Western Astrology, Ziwei, 자미두수, 십성, 삼방사정, 라그나, 다샤, Aspect. node_modules/build-cache/.next/out/public 중복 산출물과 개인정보 DB 백업 내용은 제외. 코드 원본에 1,192개, 다른 체크아웃들에 1,010~1,203개 관련 파일. 복제 체크아웃을 별개 엔진으로 세지 않는다.
- 주 기준 소스: `D:/Development/code-destiny`, HEAD `09544df6453584376931d695b53c5a7d27bd0143`. 원본 수정 없이 의존성 포함 추출하며 해시 provenance를 기록한다.
- 첨부 문서는 참고 자료이며 그 안의 옛 실행 지시·API 공급자·가격·미구현 혜택은 이번 요청을 덮어쓰지 않는다. 사용자가 이번 대화에서 **이미지 가격 1,000 / 3,000 / 5,000 / 10,000원**을 확정했다. 990원 문구와 문서의 분량/무료상담 약속은 제품 정책으로 이식하지 않는다.

## 현재 서비스 18항목

1. 성격: 도도하고 자부심이 있지만 힘든 이야기에 은근히 다정한 상담가.
2. 말투: 반말 중심, 필요한 안내는 존댓말. '~냥' 반복 금지.
3. 호칭: 너/손님. 모욕·공포·정답 보장 금지.
4. 세계관: 영묘진인이 천기누설로 고양이가 되어 달빛 점술방 운영. 제공된 흰 고양이 이미지가 옛 회색 고양이 설정보다 우선.
5. 금지: 운명/재회/수익 보장, 의료 진단, 사실 없는 계산 근거, 미구현 혜택, 캐릭터의 과도한 반복.
6. 결과 분위기: 근거→쉬운 해석→행동 조언, 절제된 캐릭터 한마디.
7. 디자인: `DESIGN.md`, `globals.css`의 점술방·금색 테두리·아이보리 무대, native dialog와 safe-area 보존.
8. 폰트: Nanum Myeongjo, Noto Sans KR Variable (local font packages).
9. 색: night #211432, violet #7541ad, gold #e9c78d, ivory #fff3e2.
10. 이미지: 흰 고양이 일러스트와 보라 점술방, 백색 시트는 털 훼손 없이 사용.
11. 생선: 고등어/연어/광어/참치; 단독, 가격표, 구매 포즈 WebP. Emoji 대체 금지.
12. 카테고리: 사주/타로/자미두수/점성술/베다/숙요. 이번 계산 대상 5종, 타로 기존 소개 보존.
13. 페이지: static export `/`; `FortuneHome.tsx`가 한마디, 이야기, 소개, 계정 준비, 보관함 준비 dialog 제공.
14. API: Pages Functions `functions/api/health.js`, `functions/api/llm.js`만 존재.
15. AI: 공개 llm POST가 임의 prompt를 AI.run에 직접 전달, llama-3.1-8b-instruct. 인증/구매 확인/구조 검사 없음. 우선 차단 대상.
16. 인증: UI 안내만 존재. 실계정/세션 없음.
17. DB: 없음. D1 schema/binding 없음. Code Destiny MongoDB를 공유하지 않는다.
18. Cloudflare: `wrangler.jsonc` name=soulcat, out static output, AI binding. 계정의 실제 배포·DB·secret은 로컬 설정만으로 확정할 수 없음.

## 계산 재사용 후보와 검증할 한계

| Domain | 소스 위치 (code-destiny 기준) | 근거 / 주의 |
|---|---|---|
| 사주 | worker/lib/life-book-ai-saju.js, saju-expert-factors.js, lib/korean-calendar/*, lib/saju/myeongri-tables.js | 한국 절기·간지, 지장간/십성/상호작용/대운/세운. keep-day 자시 정책 유지. 강약·용신 일부 휴리스틱은 확정 진단처럼 표현하지 않음 |
| 숙요 | worker/lib/sukuyo-astronomy.js, sukuyo-coordinate.js, sukuyo-relation-core.js | 달 황경 27숙과 방향별 관계. 시간 불명 시 경계 불확실성 처리. 음력 고정표 방식과 천문식 혼용 금지 |
| 베다 | worker/lib/vedic-ai-chart.js, vedic-derived-calculations.js, swiss-ephemeris.js | sidereal/Lahiri, graha/bhava/dasha/dignity. 레거시의 longitude 기반 timezone 추측을 입력 검증으로 막음 |
| 서양 | worker/lib/swiss-ephemeris.js:getSwissWesternChart | tropical, Placidus, planets/aspects/retrograde. Swiss WASM/ephemeris 필요; 폴백 정밀도를 숨기지 않음 |
| 자미 | worker/lib/ziwei-ai-chart.js, lib/ziwei-fire-bell.js, lib/ziwei-minor-limit.js | 한국 음력, 12궁/14주성/보조/살성/사화/명암/삼방/대운. 시간 불명일 때 정오 명반을 확정하지 않음 |

`lib/vedicCalculator.js`의 단순 계산은 정밀 Swiss 경로 대신 채택하지 않는다. 브라우저 거대 `js/saju-engine.js` 전체나 Code Destiny 결제 실행 코드는 가져오지 않는다. `worker/payments/index.js`, pg.js, resume-context.js의 서버 검증·멱등·복귀 패턴을 참고하되 Mongo/월정석/이용권 비즈니스는 분리한다.

## 결정한 Architecture

`UI → same-origin Pages API → session ownership → server catalog/order → PG verification → entitlement → persistent generation request → domain calculation/context → persona+domain prompt → provider → schema/evidence validator → D1 result`.

- `server/fortune/{saju,sukuyo,vedic,astrology,ziwei,shared}`, `server/providers`, `server/prompts/persona`, `server/payments`, `server/db`로 분리. UI에는 계산/secret import 없음.
- Domain 인터페이스 validateInput/calculate/buildContext/buildPrompt/validateResult. 계산 출처·제약을 context에 보존하고 결과 evidence ID를 검증.
- Mock 기본. Cloudflare 명시 선택+실호출 허용 환경 설정이 모두 필요. Gemini는 환경 secret과 모델만 받아 준비, 테스트에서 호출 금지. 자동 failover 없음.
- D1 User/Profile/Order/Payment/Entitlement/FortuneRequest/FortuneResult 분리. session cookie hash 저장, 소유권 확인, 결과 no-store. 인증이 준비되지 않은 상태에서 판매를 켜지 않는다.
- UNIQUE(user,idempotencyKey), UNIQUE(paymentId), UNIQUE(orderId entitlement), UNIQUE(entitlementId request), 결과 requestId PK. 실패해도 권리 보존. 생성 CAS/lease와 결과 저장 원자성 필요.
- 가격은 서버 catalog만 신뢰. 동일 상품의 구매 시점 가격 snapshot 저장. 기본 생선=고등어, 운세 카테고리와 4종 생선 선택 독립.
- 클라이언트 callback·웹훅 둘 다 PG 서버 조회로 검증. 반환된 id/store/channel/amount/currency/paid 확인 전 권리 발급 금지.
- 사주 화면은 참고의 2열 이미지 카드 구성, 나머지는 도메인별 내용·숙요는 두 프로필 궁합 우선. 기존 홈을 전면 재작성하지 않는다.

## 신규 모듈 / 통합

신규: domain contracts, provider factory/mock/cloudflare/gemini, persona, result schema, catalog, persistence/auth, payment verification, job/retry, profile/checkout/result/library UI, mock tests.

통합: 기존 공개 `/api/llm` 직접 호출은 제거하고 410 반환으로 안전 종료. 기존 소개·계정·보관함 준비 패널은 기능 구현 시 점진 연결. 삭제 가능한 레거시 홈 동작은 현재 없음.

## 위험과 출시 조건

- 새 로그인 복구 방식/PG 전용 channel·secret 미확인. 로그인이 되어 있다는 사실만으로 설정값을 추측하지 않음.
- Swiss WASM 런타임·ephemeris 배포와 사용 라이선스 확인 필요. 기존 소스 존재가 새 서비스 배포 적합성 증명은 아님.
- 결과 구조 검사는 환각 의미를 완전히 판별하지 못함. 계산 없는 사실은 prompt 금지 및 참조 검증, 실제 모델 품질 평가는 별도 승인 후 수행.
- 실패 시 재시도 권리는 유지하지만 외부 모델의 ambiguous timeout은 자동 재호출 시 중복 비용 가능. claim/재시도 정책과 최대 실행 시간을 별도로 검증.
- Mock green은 실제 결제/모바일 PG 복귀/LLM/운영 배포 증명이 아님.

## 공식 참고

- https://developers.portone.io/api/rest-v2/payment
- https://developers.portone.io/opi/ko/integration/pg/v2/inicis-v2
- https://developers.portone.io/opi/ko/integration/webhook/readme-v2
- https://developers.cloudflare.com/d1/worker-api/
- https://developers.cloudflare.com/pages/functions/bindings/ (로컬 AI도 실제 비용 발생 가능)

다음: 공통 계층부터 구현·Mock 검증 후 domain을 순서대로 연결한다. 미해결 항목은 handoff에 유지한다.

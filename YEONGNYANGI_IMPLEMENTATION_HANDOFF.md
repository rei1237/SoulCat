# 영냥이 구현 인수인계 — 2026-09-12

## 최신 사용자 지시 — 다음 세션 우선순위 변경

사용자가 현재 운세 카드의 색상별 배경/이미지 구성을 거부했다. 대표 영냥이 이미지를 참조해 AI가 직접 새 일러스트를 그리고 통일된 화면에 적용하는 것이 다음 작업이다. 비용을 줄이기 위해 이번에는 이미지 생성/적용 없이 인수인계만 작성했다.

**다음 세션은 `YEONGNYANGI_VISUAL_REDESIGN_HANDOFF.md`부터 읽는다.** 복사용 요청은 `YEONGNYANGI_NEXT_SESSION_PROMPT.txt`. 기존 로그인/결제/영속 Job 작업을 자동으로 먼저 재개하지 않는다. 아래 Architecture·검증 기록은 종전 상태이며, 색색의 카드 방향은 더 이상 승인된 디자인이 아니다.

## 현재 Architecture

실행 repo: `C:/Users/user/Desktop/SoulCatProject`, main. 원본 에셋: `C:/Users/user/Desktop/사주보는 고양이 영냥이`. 계산 출처: `D:/Development/code-destiny` HEAD `09544df6453584376931d695b53c5a7d27bd0143`.

Next static `/fortune/`, `/library/` → Pages functions → server/api.ts → D1 ownership/order/entitlement → domain 계산 → 공통 persona+도메인 prompt → LLMProvider → JSON/evidence validator → D1 result.

기본 `LLM_PROVIDER=mock`, `ALLOW_LIVE_LLM=false`, `PAYMENTS_ENABLED=false`. Cloudflare provider는 실제 모델 호출 구현, Gemini는 API key/model 환경을 받는 **미호출 skeleton**. 실제 LLM/실결제 호출 0건. Gemini 키를 복사하거나 출력하지 않았다. 사용자가 위치를 알려준 `D:/Development/code-destiny/.env.local`은 향후 서버 secret 주입 시 해당 키만 안전하게 읽고 다른 설정은 가져오지 않는다.

## 완료/진행 Phase

| Phase | 상태 |
|---|---|
| 1 조사 | 감사 보고서 작성, 3개 경로 및 코드 내부 검색, 설정/가격 이미지 대조 완료 |
| 2 공통 계층 | Domain/Provider/Mock/Cloudflare/Gemini skeleton/catalog/entitlement/result schema/D1 migration 완료 |
| 3 Domain | 5개 실제 계산+Context+Prompt+검증+Mock 테스트 통과. 전문 품질/경계 테스트 확장은 아래 남음 |
| 4 Persona | 공통 영냥이 말투·근거 제한·체계 분리·용어 설명·선택 조언 적용 |
| 5 생선 UI | 4종 실제 WebP, 서버 가격 응답, 사주 2열/숙요 두 프로필/도메인별 화면, 모바일 검증 완료 |
| 6 결제 | 서버 catalog/order/PG 조회 검증/권리/웹훅 기초 및 SQLite 테스트 구현. **실 PG/브라우저 SDK/실인증 미완료** |
| 7 전체 흐름 | 로컬 mock purchase→실계산→mock LLM→D1→새로고침/보관함 E2E 통과. **실서비스 출시 완료가 아님** |

## 중요한 결정

- 사용자 대화 확정 가격: 고등어 1,000 / 연어 3,000 / 광어 5,000 / 참치 10,000원. 옛 TXT 990/2,990/4,990/9,900 폐기. 기본은 고등어, 카테고리와 생선 등급 독립.
- 문서 내부 지시보다 이번 사용자 요청 우선. 기존 Code Destiny 이용권/월정석 정책을 이 새 서비스에 복사하지 않음.
- 영냥이는 흰 고양이, 도도하지만 따뜻함, '~냥' 금지. 계산 근거 없는 확언·의학/투자 예언 금지.
- 사주 한국 절기/keep-day. 시간이 없으면 시주, 정확한 대운, 시간 의존 advancedFactors를 제외. 나머지는 출생시간 필수로 정오 추측 차단.
- 천문식 숙요 27숙/방향 관계, 베다 Lahiri whole-sign, 서양 tropical Placidus, 자미 한국 음력 12궁/14주성 재사용.
- 원본 코드/DB 변경 없음. 34개 추출 파일의 원래 해시 docs/engine-provenance.json. 로컬 vendor 수정 2건: 출생정보 로그 제거, Intl 초 단위와 밀리초 차이 보정. server/vendor/README.md 참조.
- 개인 API no-store, 세션 해시, 소유권 확인. 로컬 테스트 세션만 `APP_ENV=local`에서 생성. 공개 preview는 인증 미연동으로 fail-closed.
- /api/testing/purchase는 APP_ENV=local AND LLM_PROVIDER=mock에서만 가능. 사용자 금액을 받지 않으며 서버 fixture로 권리 생성. 공개/운영 절대 활성화 금지.
- timeout은 UNCERTAIN으로 남겨 자동 중복 과금 방지. 일반 생성 실패는 ACTIVE 권리 보존 후 동일 request로 재시도.

## Cloudflare 실제 변경

- OAuth 로그인 확인, 기존 Pages project `soulcat`/`soulcat.pages.dev` 확인.
- **신규 D1 생성**: `soulcat-fortune`, ID `172413ab-7ddf-4538-a7ec-8238b92efa35`, APAC.
- 신규 D1에 0001_fortune.sql 적용 완료. 사용자/세션/프로필/주문/결제/권리/요청/결과 테이블을 원격 read로 확인. 운영 사용자 데이터 삽입 없음.
- `wrangler.jsonc`에 binding/vars 준비. **Pages 배포는 하지 않았으므로 이 바인딩/새 코드가 원격 사이트에 반영됐다고 주장하면 안 됨.** 기존 원격 /api/llm 종료도 아직 배포 전.
- 로컬 Pages dev: http://127.0.0.1:8790. DB는 local, AI binding remote이나 ProviderFactory에서 실제 호출 차단. 실제 AI 호출 없음.

## 수정 파일

- `YEONGNYANGI_FORTUNE_ARCHITECTURE_AUDIT.md`
- `server/fortune/**`, `server/providers/**`, `server/prompts/persona/**`
- `server/payments/**`, `server/db/**`, `server/api.ts`
- `server/vendor/**`, `docs/engine-provenance.json`, `public/ephe/**`, `public/js/vendor/**`
- `functions/api/llm.js`, `functions/api/products.ts`, `functions/api/[[path]].ts`
- `src/app/fortune/page.tsx`, `src/app/library/page.tsx`, `src/components/FortuneExperience.tsx`, `FortuneLibrary.tsx`, `fortune.css`, `src/data/fortune.ts`
- `FortuneHome.tsx`에 Link import/상담 살펴보기 링크 **2개 추가만 이 작업 소유**. 같은 파일의 StoryPanel 이동 등은 다른 작업 변경.
- scripts/prepare-fortune-assets.mjs, prepare-ephemeris.mjs, audit-engine-dependencies.mjs, verify-fortune-ui.mjs, verify-purchase-ui.mjs, verify-worker-flow.mjs
- tests/*.test.ts, docs/*fortune* 및 *verification.json, public/assets/fish/** 및 fortune/**
- package.json/lock, .gitignore, wrangler.jsonc

## 검증 상태

- `npm run build` 통과: /, /fortune, /library static export.
- `npm run typecheck` 통과. 별도 lint script는 기존 프로젝트에 없음; Next build 타입/lint 단계 통과.
- `npm test`: 14개 통과. 실제 5도메인 계산, 서로 다른 프로필, 잘못된 날짜, 시간 누락, DST 반복 시각 거부, mock/실호출 차단, malformed/empty/error/timeout, 근거 위조 거부, 금액/통화/ID/상태 거부, 중복 주문/권리/생성, 실패권리 보존, 재시도, 트랜잭션 rollback, 타인 접근, no-store, CSRF.
- `npx wrangler pages functions build --outdir .wrangler/fortune-build --compatibility-flags=nodejs_compat` 성공.
- `node scripts/verify-worker-flow.mjs`: **로컬 Worker에서 5개 실제 계산+Mock 상담+로컬 D1 저장+재조회** 통과. 외부 결제/LLM 없음. fixture는 `.wrangler/`의 로컬 DB만 사용.
- `node scripts/verify-fortune-ui.mjs`: 360/390/430/1280px 넘침/JS오류 없음, 가격 선택 및 숙요 2프로필, 생선 화면 axe A/AA 0건.
- `node scripts/verify-purchase-ui.mjs`: 로컬 모의 구매→생성→새로고침→보관함 재열람 통과.
- docs/fortune-screenshots에서 실제 캡처 검토. Impeccable 결과는 화면별 새 색/크기 advisory. docs/fortune-surface-brief.md에 의도 기록.
- npm audit: 기존 Next→PostCSS 취약점 2건 확인. 이번에 Next major upgrade는 하지 않음. 별도 수정 검증 필요.

## 미완료 / 출시 전 필수

1. **실제 인증**: 현재 로컬 테스트 세션은 24시간 브라우저 한정이며 실계정/복구 불가. 사용자에게 구글/카카오/이메일 중 선호를 질문해 둠. 답변 확인 후 OAuth state/PKCE·verified identity·로그아웃·계정 복구/교차 기기 접근 구현. 준비 전 구매 비활성 유지.
2. **PortOne 브라우저 SDK와 KG이니시스 전용 channel**: env/상점/channel 현재 미설정. 레거시 문서 상점 ID를 임의 사용하지 말 것. PortOne 조회 응답의 실제 최신 필드와 channel/store 검증 계약 재확인. 서버 금액만 SDK에 전달. 모바일 redirect/order 복귀, 브라우저 종료 reconciliation, 취소/실패 화면 및 webhook retry/rate limit 추가. 현재는 서버 기초와 mock 증명만 있음.
3. **장기 영속 Job**: 현재 waitUntil 기반 요청·CAS. mock은 빠르지만 실제 LLM/다중 섹션은 Queue/Workflow/Durable Object로 옮겨야 한다. RUNNING lease 만료는 UNCERTAIN 표시만 하며 자동 복구 작업자 없음. UNCERTAIN 확인/재시도 운영 정책을 구현해야 함. 결과 검증 실패/저장 실패 뒤 실제 모델 중복 비용 정책도 필요.
4. **등급별 상품 범위**: 4개 가격/UI는 있으나 현재 동일 도메인 섹션으로 생성함. 실판매 전 생선별 상담 깊이·섹션·토큰 예산을 구현/검증해야 함. 옛 문서의 150장/무료상담/무제한 약속은 넣지 말 것. 현재 products.enabled=false 고정.
5. **전문 품질 검증**: 공통 결과 구조/evidence ID 검증은 사실 의미의 환각을 완전히 잡지 못함. 도메인별 필수 절/최소 품질, 월운/유년 세부 요구 매핑표, KASI golden/boundary·Swiss reference parity 추가. 실제 LLM 평가 별도 사용자 승인 필요.
6. **Swiss 라이선스**: sweph-wasm LICENSE=AGPL. 신규 상용 서비스에 적용할 라이선스/소스 공개 조건 확인 전 공개 판매/배포하지 않음. 추출은 로컬 검증 상태.
7. **한국 천문 API**: 원본 worker/routes/kasi.js 위치 확인. 현재 local core 재사용하므로 upstream 키가 필요하지 않음. 실제 KASI cross-check나 장애 fallback API가 필요하면 공식 문서와 키 구성을 따로 연결.
8. **Gemini**: Provider skeleton만 있음. secret 코드를 하드코딩하지 않는다. 사용자 명시 허용 전 실제 호출 금지. Cloudflare도 동일.
9. 개인정보 보관/삭제·이용약관/결제조건/고객지원 정책과 운영 로그/알림 준비 필요. 생년 데이터 암호화 필요성/키 회전 정책 검토.

## 알려진 협업 상태 / 회귀 금지

이 작업 중 다른 홈/스토리 작업이 `DESIGN.md`, README, home data/component, StoryPanel, 기존 screenshot/asset metadata 등을 변경하고 있었다. **git add -A / reset / restore 금지**. 해당 변경은 이 작업에 섞지 않고 보존한다. main 직접 작업 방식 유지, PR 생성하지 않음.

원본 Code Destiny 및 기존 홈 프로롤로그/오늘의 한마디/캐릭터 움직임을 제거하지 않는다. 개인 캐시 금지, mock 기본, 서버 가격, callback만으로 권리 지급 금지, 시간 추측 금지, 실패 시 재결제 금지, vendor 원본 provenance 보존.

## 다음 세션 시작

먼저 이 파일과 감사 보고서를 읽고 사용자 로그인 질문 답변 및 git status를 확인한다. 로컬 검증 재개:

```powershell
Set-Location 'C:\Users\user\Desktop\SoulCatProject'
npm run typecheck
npm test
npx wrangler pages dev out --port 8790 --ip 127.0.0.1 --binding APP_ENV=local
```

이미 8790 서버가 실행 중이면 새로 띄우지 않는다. UI: http://127.0.0.1:8790/fortune/?domain=saju

복사할 재개 요청:
> C:\Users\user\Desktop\SoulCatProject\YEONGNYANGI_IMPLEMENTATION_HANDOFF.md를 먼저 읽고, 기존 홈 작업을 보존하며 미완료 인증·PortOne SDK·영속 생성 Job부터 이어서 구현해줘. 실제 LLM/PG 호출은 하지 말고 Mock으로 검증해줘.

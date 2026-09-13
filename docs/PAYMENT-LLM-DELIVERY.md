# SoulCat 결제·LLM·모바일 복귀 구현

> 이 문서는 원격 작업 전 초기 구현 기록이다. 최신 배포·실제 Gemini·결과 화면 상태는 [STAGING-READER-DELIVERY.md](STAGING-READER-DELIVERY.md)를 참조한다.

## 현재 경계

- 테스트용 실제 LLM 예산은 **테스트 전체 합계 1,000원**이다. 날짜가 바뀌어도 리셋하지 않는다. 테스트 단가는 가격 정책과 무관하다.
- 사용자의 최종 정정에 따라 운영 `LLM_COST_MODE=metered`는 고객 상담의 누적 비용을 차단하지 않고 기록한다. 상품의 기존 챕터 수와 단건 결제 정책은 그대로다.
- 운영 결제·실제 LLM·상품 활성화는 수행하지 않았다. 실제 LLM/PG 호출 비용은 이번 작업에서 발생시키지 않았다.
- 작업 시작 시 기존 tracked 변경을 `C:\Users\user\AppData\Local\Temp\soulcat-before-payment-20260913-081225\working-tree.patch`에 기록했다. status.txt에 미추적 파일 목록도 기록했다. 기존 작업을 reset/stash/commit하지 않았다.

## 이번 작업의 변경 파일

인증·UI:
- `src/lib/return-path.ts`, `src/lib/service-links.ts`: 복귀 경로와 식별자 query allowlist.
- `src/lib/checkout.ts`: PortOne SDK, 최소 localStorage 티켓, 24시간 만료, Promise/redirect 공통 검증.
- `src/components/CheckoutRecovery.tsx`, `src/app/layout.tsx`: 세 경로에서 복귀 검증·로그인·보관함 안내.
- `src/components/FortuneExperience.tsx`, `src/components/FortuneLibrary.tsx`, `src/app/globals.css`: 카드/카카오페이 입력, 상태 복원, 주문별 복구.

서버:
- `server/api.ts`, `server/payments/orders.ts`, `server/payments/portone.ts`, `server/payments/reconcile.ts`: 주문 계약 고정, 결제 재조회, 서명 웹훅, 조회 잠금, 취소 전이.
- `server/db/migrations/0005_checkout_budget.sql`: 주문 계약·조회 잠금·웹훅 중복 기록·비용 원장·재개 시각. 기존 migration은 수정하지 않았다.
- `server/providers/budget.ts`, `provider-factory.ts`, `gemini.ts`: 실제 공급자 gate, 사전 토큰 계산, 비용 예약/정산, 명시적 재시도.
- `server/fortune/books.ts`, `generation.ts`, `shared/contracts.ts`, `server/worker-entry.ts`: 비용 대기, 명시적 타임아웃 재시도, 취소/늦은 결과 fence, 사용량 전달.
- `server/edge.ts`, `scripts/source-release.mjs`, `scripts/prepare-release.mjs`, `scripts/deploy-staging.mjs`: 소스 내용 digest와 dirty 표시, 배포 시 SHA/digest 대조.
- `wrangler.worker.jsonc`, `package.json`, `package-lock.json`: staging 테스트 비용 설정과 PortOne SDK 의존성. 운영 gate는 false/mock 유지.

검증:
- `tests/checkout-budget.test.ts`, `tests/books.test.ts`, `tests/integration.test.ts`.
- `scripts/verify-checkout-ui.mjs`, `docs/checkout-ui-verification.json`.

## 구현 계약

### 인증·복귀

기존 `sharedUser()` Service Binding 인증을 사용한다. 로컬 임시 인증은 명시적 local/mock에서만 생성한다. 서버 정적 upstream으로 사용자 헤더·쿠키·query를 전달하지 않는다.

`/fortune/`, `/room/`, `/library/`의 정확한 경로만 허용한다. query는 domain/fish/product/profile/request/orderId/paymentId의 단일 식별자 값만 보존하며 원본 출생정보·질문·인증정보·외부 경로·인코딩 우회는 제거한다. 저장소는 권한 증명이 아니며 서버에서 로그인 소유권을 확인한다.

복귀 티켓에는 주문/결제/상품/프로필 식별자, 안전한 복귀 경로, 생성 대기 상태와 생성 시각만 기록한다. 구매자 이름·연락처·이메일은 결제 UI 메모리와 PG 요청에만 사용한다. 구형 SoulCat 티켓이 없어 sessionStorage fallback을 만들지 않았다.

### 결제

`POST /api/yeongnyangi/orders`는 productId/profileId/idempotencyKey/payMethod/returnPath만 받는다. 가격과 소유자는 서버가 정한다. 응답의 `payment`에는 공개 SDK 값만 포함한다. 기존 단일 채널 값은 로컬/기존 fixture 호환에만 남으며 실제 재조회는 주문에 고정된 store/channel을 요구한다.

`CARD`는 일반 채널, `KAKAOPAY`는 별도 채널과 명시된 `inicis` 또는 `kakaopay` 유형을 사용한다. 일반 카드창은 이니시스 간편결제 노출을 비활성화한다. 두 채널 값이 같으면 신규 결제를 거부한다.

`POST payments/verify`는 orderId/paymentId와 인증된 소유자를 확인한다. 서명 검증된 웹훅도 동일한 재조회/상태 전이를 사용한다. 20초 조회 lease와 최소 3초 간격을 적용한다. 판매 비활성화 후에도 기존 결제의 확인·취소 반영은 계속 허용한다.

정상 PAID만 D1 transaction으로 권한을 한 번 부여한다. 정상 결제 후 생성 준비가 실패해도 구매 권리는 유지되며 cron/보관함이 같은 요청을 복구한다. 실패/취소/부분취소/확인 불가에는 권한을 새로 부여하지 않는다.

취소 주문은 기존 CHECK 제약과 호환되는 REFUNDED를 사용하며 `pg_status`와 `cancelled_amount`로 전액/부분취소를 구분한다. 권한을 철회하고 outbox·진행 챕터의 저장 권한·공유를 차단한다. 늦은 PAID 이벤트는 취소 권한을 다시 활성화하지 않는다. 환불 API 호출이나 신규 환불 보장은 추가하지 않았다.

진행 중인 동일 상품/프로필 주문은 다른 탭에서도 재사용한다. 결제수단이 이미 고정된 진행 주문의 수단 변경은 거부하며 보관함 확인을 안내한다. 실제 PG 상태가 불명확한 동안 새 ID를 발급해 중복 청구하지 않는다.

### Gemini·비용·복구

실제 공급자는 Gemini만 준비했다. Workers AI는 비용 원장 연동이 없으므로 실제 호출을 차단한다. 운영에서 mock으로 유료 결과를 만들지 않는다.

실제 공급자 선택에는 APP_ENV, LLM_PROVIDER=gemini, ALLOW_LIVE_LLM=true, GEMINI_API_KEY, 명시적 모델, 유효한 모델별 단가·환산 기준·만료일, timeout/retry/token 설정과 DB 요청 문맥이 필요하다. 모두 갖춰지기 전에는 fail-closed다.

토큰 사전 계산 후 최대 예상 비용을 micro-KRW로 올림 예약한다. 응답 사용량의 입력 및 전체 나머지 토큰(사고 토큰 포함)으로 정산한다. 타임아웃·응답/사용량 불확실성은 예약금을 반환하지 않는다. 이는 보수적 앱 비용 관리이며 공급자의 실제 원화 청구액을 보증하지 않는다.

테스트 모드는 D1 전체 원장 합계 한도 1,000원을 적용한다. 운영 metered 모드는 합계에 따른 거부 없이 같은 원장을 사용한다. 60초 호출 제한, 입력/출력 제한, 명확한 429에 최대 2회 추가 시도는 유지한다. 타임아웃/불확실 응답은 자동 재호출하지 않으며 사용자의 재시도에서 기존 저장 토큰을 폐기하고 새 시도로 진행한다. 완료 챕터와 구매 권리는 보존한다.

상품 활성화 전 `LLM_VERIFIED_PRODUCTS`에 실제 검증된 모델·챕터 수·측정 비용 정보를 등록해야 한다. 운영에서 이 측정값은 고객 누적 비용 한도로 쓰지 않는다. 계산 근거 선별·출생정보 제거·근거 ID 검증은 기존 계산 구조를 유지한다.

## 검증과 제한

- `npm run typecheck` 통과. `npm test` 65개 통과. 실제 PG/LLM 전송 없이 fixtures로 검증했다.
- 로컬 D1: 0001~0005 migration 적용 성공. **remote D1 적용이 아니다.**
- `npm run build` 통과. 현재 미커밋 변경이 포함된 빌드는 dirty=true와 소스 digest를 기록한다.
- Worker: staging 설정 `wrangler deploy --dry-run` 성공. **배포가 아니다.**
- 브라우저: Chromium/Windows WebKit × 360/390/430/1280 × 카드/카카오 총 16개 시나리오 통과. 결제 입력 폼, 복귀, 새 탭, 새로고침, 불일치, 취소, 세션 만료를 mock API로 검증했다. SDK Promise 흐름은 transport fixture 단위 테스트로 검증했다.
- 실기기 Android WebView/iPhone Safari·인앱/실제 모바일 Chrome: 미검증.
- 실제 PG 및 실제 Gemini: 미실행. PG 계약·채널과 Gemini 모델·비밀값·단가 정보 미등록 상태다.
- remote staging: `wrangler d1 migrations list ... --remote`가 Cloudflare 오류 7403으로 실패했다. whoami 및 D1 목록 조회는 성공했고 구성의 staging DB ID도 목록과 일치한다. 쿼리 권한이 복구되기 전 migration/배포는 실행하지 않는다.
- 기존 Next/PostCSS 의존성의 npm audit 결과 moderate 1/high 1이 남아 있다. PortOne SDK 추가로 생긴 항목이 아니며 이번 변경에서 강제 major 업그레이드하지 않았다.
- PG 신청 화면은 조작하지 않았고, 요구되지 않은 PG 심사 제출 자료도 만들지 않았다.

## 재개와 승인 순서

1. Cloudflare staging D1 **쿼리 권한**을 복구한 뒤 아래 명령으로 조회부터 재확인한다. 인증 비밀값을 채팅이나 파일에 붙여 넣지 않는다.
2. 기존 미커밋 작업 소유 범위를 확인한 clean 릴리스 checkout에서 코드 리뷰·테스트·빌드를 수행한다. 현재 dirty 빌드의 HEAD SHA만으로 배포 증거를 주장하지 않는다.
3. `npx wrangler d1 migrations apply soulcat-fortune-staging --config wrangler.worker.jsonc --env staging --remote`를 실행하고 staging 큐·인증 binding을 확인한다.
4. 검증한 clean build를 Pages **preview branch**에 배포한다. main 자동 배포는 사용하지 않는다. `node scripts/deploy-staging.mjs <immutable-preview-url>`로 같은 소스 digest의 staging Worker를 배포하고 Pages/Worker version을 대조한다.
5. 사용자가 staging Worker secret을 직접 등록한다. Gemini 모델·해당 모델 단가·보수적 환산 기준·유효기간을 설정하고, 테스트 예산 1,000원 안에서 실제 LLM을 검증한다. PG 테스트는 별도 승인 전 실행하지 않는다.
6. PG 심사/새 MID와 일반·카카오 채널 발급 후 실제 PG 테스트의 대상·금액·취소 절차를 요약하여 별도 승인을 받는다. 실제 기기별 복귀 증거를 확보한다.
7. PG 최종 제출, 운영 키 등록, 운영 DB 변경, 운영 배포 각각의 승인을 확보하고 최종 **운영 결제 및 LLM 활성화 승인** 이후에만 운영 전환한다. 고객 비용 상한을 추가하지 않는다.

```powershell
Set-Location C:\Users\user\Desktop\SoulCatProject
npm run typecheck
npm test
npm run build
npx wrangler d1 migrations list soulcat-fortune-staging --config wrangler.worker.jsonc --env staging --remote
```

브라우저 mock 검증은 별도 터미널에서 `$env:PORT='8794'; node scripts/serve.mjs` 실행 후 `node scripts/verify-checkout-ui.mjs`로 재현한다. 결과·스크린샷은 `docs/checkout-ui-verification.json`, `.integration/checkout-ui/`에 기록한다.

# 영냥이 유료 운명서 구현·검증 기록

> 1차 구현의 기록입니다. 신규 v3 상품·타로·초융합·방 전용 한마디의 최신 적용 결과는 [FUSION-IMPLEMENTATION.md](FUSION-IMPLEMENTATION.md)를 참조하세요. 기존 구매는 이 문서의 저장된 구성을 유지합니다.

작업 위치: `C:\Users\user\Desktop\SoulCatProject`

## 실행 경계

- 실제 LLM 호출, 실제 PG 결제, 원격 D1 마이그레이션, 큐 리소스 생성, 운영 배포를 실행하지 않았다.
- 기본 provider는 Mock이고 `ALLOW_LIVE_LLM=false`, `PAYMENTS_ENABLED=false`를 유지했다. 상품 가격은 기존 서버 catalog의 1,000 / 3,000 / 5,000 / 10,000원이다.
- 한국천문 API만 사용자 허용 범위에서 합성 날짜로 최소 조회했다. 음양력은 `kasi`, 24절기는 기존 모듈의 `local` 폴백이었다. `kasi-connection-verification.json` 참조.
- `.env.local` 전체를 복사하지 않았다. 필요한 두 KASI 설정만 읽으며 키를 보고서·응답·브라우저에 넣지 않는다. 로컬 실행은 `node scripts/dev-with-kasi.mjs`로 선택적으로 연결한다.

## 기존 엔진 조사 및 재사용

| 분야 | 정본·위치 (Code Destiny 기준) | 구현 | 범위·한계 |
|---|---|---|---|
| 사주 | `js/saju-engine.js`, `worker/lib/life-book-ai-saju.js` | 실제 화면의 일주·시주·오행·강약·조후·종격·용신 함수를 AST로 추출하여 그대로 호출하고 기존 원국 파생 모듈에 동일 기둥 전달 | 한국 표준시 출생 지원. 기존 화면의 종격 생활 이력 확인은 자동으로 확정하지 않고 후보/조건부로 노출 |
| 자미 | `worker/lib/ziwei-ai-chart.js` | 12궁·명궁·신궁·주성·보조성·사화·삼방사정·대한·유년 | 동일 기준 연도로 유년 10개 조합. 유월 지원을 주장하지 않음 |
| 숙요 | `sukuyo-astronomy.js`, `sukuyo-relation-core.js`, `sukuyo-premium.js` | 개인 본명숙 / 두 사람 관계 분리, 기존 명·업태 및 방향·거리 구분 | 개인 숙요에 상대 관계를 만들어 넣지 않음. 참치에는 개인 모드 요구 |
| 베다 | `vedic-ai-chart.js`, `swiss-ephemeris.js` | Swiss 라그나·행성·하우스·낙샤트라·파다·분할 배치·다샤·트랜싯 | 정밀 계산 폴백 시 구매용 차트 차단. 분할 배치가 완전한 분할 하우스 명반은 아님 |

기존 공통 vendor 묶음 출처는 `engine-provenance.json`, 추가 복사/어댑터 차이는 `book-engine-provenance.json`, 사주 원본 함수별 해시는 `saju-runtime-provenance.json`에 기록했다. 추출된 함수는 원본 수식을 바꾸지 않았으며 자동 최신 교체하지 않는다. **원본 화면의 모든 상호작용·모든 과거 날짜와 전수 동등성이 입증되었다는 의미는 아니다.**

## 단계별 변경

| 단계 | 변경 파일·의도 | 검증·위험 / 다음 운영 확인 |
|---|---|---|
| 1 조사 | 위 출처 기록, `scripts/extract-saju-runtime.mjs` | 원본 함수 해시 검증. 전체 브라우저 `calculate()`의 종격 확인 상호작용은 별도 검증 대상 |
| 2 사실·한국천문 | `server/fortune/charts.ts`, `shared/privacy.ts`, 기존 KASI 경로 | 서버 소유권, 불변 snapshot, KASI 응답·로컬 코어 교차검사, fixture/cache 검사. 24절기 실조회는 local 폴백임 |
| 3 사주 | `saju/runtime.ts`, `saju/index.ts`, 최소 vendor 어댑터 | 원국·십성·오행·강약·조후·용신·종격 후보·신살·세운·월운. 자정/야자시/경도 보정 경계 검사. 종격 후보의 용신은 조건부 |
| 4 자미 | `ziwei/index.ts` | 기존 명반 및 동일 KST 기준의 유년 재사용. 유월 미제공 |
| 5 숙요 | `sukuyo/index.ts`, 기존 거리 함수 export | 개인/궁합 구분 및 원래 역할/거리 규칙 유지. 1~10년 숙요 날짜별 전체 천문 달력은 추가하지 않음 |
| 6 베다 | `vedic/index.ts` | 정밀도·폴백 검사, 고정 `asOf` 다샤·트랜싯. 지원되지 않는 장기 트랜싯은 LLM으로 채우지 않음 |
| 7 해설 | `analysis.ts`, `providers/chapter.ts`, 분리 prompts, Gemini/Cloudflare provider | 체계 중복 집계 방지·상충 보존, JSON/evidence 검증, birth PII 제거, 이전 논점 전달, 입력 크기/출력 토큰 제한. 실제 해설 품질 미평가 |
| 8 상품 | `book-contracts.ts`, `charts.ts`, `payments/orders.ts` | 5/13/30/70 manifest. 고가 상품 보조 계산을 결제 전에 캐시. 동일 유효 구매 재진입 시 기존 주문 재사용. 가격 변경 없음 |
| 9 화면 | `FortuneChart.tsx`, `DestinyBook.tsx`, `FortuneExperience.tsx`, CSS | 구매 전 차트, 본문 개별 fetch, 검색/목차/읽음/재진입, 실제 공개 등급 잠금 목록. 기존 sections 결과 경로 유지 |
| 10 공유 | `BookShare.tsx`, `server/shares.ts`, `functions/share/`, `worker-entry.ts`, share assets | 익명 기본, 선택 공개, 링크 목록/해제, OG PNG와 세로 PNG. 공개 DTO에 내부 사실/주문/출생정보 제외. 공유 시 LLM 없음 |
| 11 영속 작업 | `books.ts`, D1 migrations 0002/0003, `worker-entry.ts`, Worker config | chapter CAS/lease/raw 보존/outbox/queue, paid-order 복구. Mock 로컬만 waitUntil loop. 불확실 외부 호출은 운영 확인으로 격리 |
| 12 모바일 | `scripts/verify-book-ui.mjs` | 네 폭의 네 차트, 참치 검색·복원·공유 검사 및 하위 등급 흐름. 실제 기기·카카오 인앱 별도 |
| 13 복구 | `tests/books.test.ts`, `book-boundaries.test.ts`, 기존 persistence/integration | 37개 테스트. 동시 호출·중간 실패·timeout·raw 재사용·소유권·취소된 공유·결제 후 종료 복구. 실 PG callback은 미실행 |

## 데이터와 작업 흐름

`profiles → chart_snapshots → 기본 ChartView → purchaseContexts → orders/order_chart_links → entitlement → fortune_books → fortune_chapters → summary/share`

- 주문은 확인한 snapshot에 연결한다. 주 계산 snapshot은 바뀌지 않으며 보조 체계는 `chart_domain_contexts`에 같은 기준시각으로 보관한다. 본문/재열람은 그 사실을 사용한다.
- `DomainContext`는 계산 사실 ID·엔진 버전·제약을 보관한다. 원본 출생정보는 profile에 두고, provider 직전에 설명용 사실에서 개인정보를 제거한다.
- 캐시는 snapshot/profile 기준이다. 서로 다른 새 profile ID의 완전히 동일한 출생 입력을 전역 중복 제거하는 캐시는 현재 없다. 새 시점 분석은 새 snapshot으로 만든다.
- 본문을 처음부터 전송하지 않는다. 최초 응답은 차트·목차·상태·요약·읽음·허용된 연도별 표다. 한 챕터를 열 때 해당 본문만 받는다.
- 별점이나 상위 백분위에 검증된 정량 척도가 없어 임의 점수를 만들지 않았다. 대신 근거 체계 수·상충 여부를 표시한다. 이는 적중 확률이 아니다.
- 큐 메시지는 한 챕터만 진행한다. 완료 직후 outbox가 다음 메시지를 요청한다. cron은 미전달 outbox 및 결제 후 생성 진입이 빠진 주문을 복구한다.
- `UNCERTAIN`/`LLM_TIMEOUT`은 자동 재호출하지 않는다. 저장 응답이 있으면 재검증하고, 없으면 운영자가 공급자 이력을 확인해야 한다. 완료 챕터와 구매 권리는 유지한다.

## 로컬 검증 명령

```powershell
npm test
npm run typecheck
npm run build
npx wrangler d1 migrations apply DB --local
npx wrangler pages dev out --port 8790 --ip 127.0.0.1 --binding APP_ENV=local
# 별도 터미널
node scripts/verify-book-ui.mjs
npx wrangler deploy --config wrangler.worker.jsonc --env staging --dry-run --outdir .integration/book-worker
git diff --check
```

로컬 Pages 설정에 AI binding 자체는 존재하지만 모든 테스트는 Mock provider로 실행했다. binding 존재 또는 Worker dry-run 성공은 실제 추론/운영 배포 성공의 증거가 아니다.

## 출시 전 남는 확인

1. 운영/스테이징 리소스 생성 및 마이그레이션·실제 queue delivery/cron·DLQ 관찰은 승인 후 실행한다. 현 작업은 로컬 DB와 dispatcher 단위 검증이다.
2. 실제 모델 승인 후 챕터별 전문성·중복·근거 정합성을 샘플링하고 길이/비용을 측정한다. 현재 Mock은 UI용임을 명시하는 합성 해설이다.
3. 한국천문 24절기의 해당 키/서비스 권한 및 실응답 정밀도를 추가 확인한다. 날짜 자료에서 절입 시각을 만들어내지 않는다.
4. 사주 종격 생활 이력 확인 흐름, DST/절입/윤달을 포함한 기존 화면 대규모 비교 데이터셋을 추가 확보한다. 현재 검증은 함수 보존과 대표 경계값 범위다.
5. 실제 모바일 결제 앱 복귀, 카카오톡 OG 캐시/인앱, 실제 기기의 확대/읽기 성능을 별도 확인한다.

이 문서는 기능 구현 및 Mock 검증 결과이며, 유료 서비스의 운영 출시 승인서가 아니다.

## 최종 로컬 확인

- 네 화면 폭 × 네 차트 및 네 상품 흐름 검증 통과. 총 32개 UI 검증 기록: `book-ui-verification.json`.
- 참치 70챕터 초기 본문 DOM 0개, 개별 열람·검색·읽음 저장·재열람·링크 해제 통과. 일반 1200×630 및 세로 1080×1920 PNG 확인.
- `npm run build`, `npm run typecheck`, Worker staging `--dry-run`, `git diff --check` 통과.
- 작업 중 원본 저장소 HEAD가 전진했으므로 출처 기록에 초기 조사 커밋과 마지막 대조 커밋을 구분했다. 계산 함수를 자동 갱신하지 않았다.

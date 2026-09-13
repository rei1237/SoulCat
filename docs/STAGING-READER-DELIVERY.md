# SoulCat 스테이징·결과 화면 검증 — 2026-09-13

이 문서가 최신 상태다. PAYMENT-LLM-DELIVERY.md는 원격 작업 전 초기 구현 기록이다.

## 변경 파일과 의도

- `src/components/DestinyBook.tsx`, `reader.css`: 모바일 접이식 목차, 데스크톱 옆 목차, 한 장씩 읽는 본문, 이전/다음 장, 읽은 위치 복원. 차트·근거·상위 구성은 접어서 본문을 우선한다.
- `src/components/BookShare.tsx`, `fish-catalog.css`: 단톡방용 문구+링크 복사, Web Share 이미지 전달, 일반/세로 이미지 저장, 공유 해제. 대화방은 사용자가 고른다.
- `public/assets/expressions/`: 사용자 제공 표정의 고민·위로·응원·미소 원본 4개 복사. 원본 변경 없음.
- `server/prompts/system/fortune-master.ts`: 질문과 근거에 맞춘 작은 생활 장면, 장마다 다른 갈등·선택. 과거 경험·직업·상대 마음을 지어내지 않는 규칙 유지.
- `server/providers/chapter.ts`: sources를 실제 전달한 사실 ID enum으로 제한. 고등어 장별 질문·장면 분리와 유사 예시 거부를 추가. 잘못된 근거를 후처리로 정상처럼 바꾸지 않는다.
- `server/providers/gemini.ts`: Workers native fetch 호출 문맥 보존, 비밀값 없는 토큰 계산 오류 코드.
- `server/edge.ts`: 공유 PNG 재료를 고정 Pages에서 읽고 렌더 오류는 안전한 503으로 반환.
- `tests/books.test.ts`, `book-boundaries.test.ts`, `checkout-budget.test.ts`: 공유 렌더 경계, 근거 enum, Workers transport 회귀 검증.
- `scripts/verify-book-ui.mjs`, `verify-fusion-ui.mjs`: 새 리더 탐색 방식 반영.
- `next.config.ts`, `scripts/prepare-release.mjs`: 별도 export 경로 지원. 다른 개발 서버의 out 잠금을 피해서 완성한 파일을 반영한다.
- 결제·복귀·예산의 전체 변경 파일과 계약은 초기 구현 기록의 변경 파일/구현 계약 절 참조.

## 유지한 정책

“천원만 테스트”는 **1,000원짜리 고등어 5챕터**다. 상품 가격·이용권·월정석 정책은 변경하지 않았다. 실제 LLM은 고등어만, 상위 상품은 긴 생성·복구·UI를 mock으로 검증한다. 테스트 원장 전체 1,000원 제한은 테스트 안전장치이며 운영 고객의 누적 상담 한도가 아니다.

Service Binding 로그인, 같은 도메인 경로, SoulCat 독립 D1·주문·권한을 유지한다. 운영 결제/LLM/상품은 비활성이다. 실제 PG 청구, 운영 키 등록, 운영 DB 변경, 운영 배포, PG 최종 제출은 실행하지 않았다.

## 환경별 증거

| 범위 | 결과·한계 |
|---|---|
| 현재 작업트리 | typecheck와 76개 테스트 통과. 다른 진행 작업의 free 관련 테스트 포함 |
| 격리 배포 후보 | 67개 테스트, typecheck, Next build 통과. 원본에서 이후 추가된 free 기능은 배포에 포함하지 않음 |
| 결제 mock | 카드/카카오 × Chromium/WebKit × 360/390/430/1280, 16개. SDK transport 단위 테스트 별도 |
| 결과·공유 mock | 5/13/30/70/80/120 × Chromium/WebKit × 390/1280, 24개. 목차·이전/다음·재열람·표정·공유·오버플로·axe 검사 |
| remote staging | 전용 D1 0001~0005, 큐/DLQ, Pages preview/Worker 배포. 가상 6주문 318챕터 완료. 완료 outbox 재전송 후 추가 생성 없음 |
| remote 인증 | 익명, 로컬 사용자 헤더 위조, 무효 세션 모두 401. 실제 로그인 계정의 전체 E2E는 미검증 |
| remote 공유 | 고등어/오마카세 HTML·OG meta 200, 일반 1200×630·세로 1080×1920 PNG 모두 200 |
| 실제 Gemini | 고등어 5챕터 범위. 세부 결과·추정 비용은 staging-live-llm-verification.json 참조. 주문은 가상 fixture |
| 실기기·실제 PG | Android WebView, iPhone Safari/인앱, 실제 모바일 Chrome, 실제 카카오톡 앱 발송 미검증 |
| 운영 | 키·DB·배포·판매 활성화·PG 제출 모두 미실행 |

공유 UI 테스트는 Web Share 호출을 stub으로 검사했다. 전용 Kakao JS SDK 연동/실제 대화방 발송 또는 실제 카카오톡 미리보기 검증으로 표현하지 않는다.

증거: checkout-ui-verification.json, reading-share-ui-verification.json, staging-mock-queue-verification.json, staging-share-verification.json, payment-llm-verification.json.

## 재사용한 설정과 필요한 입력

- 지정된 .env.local의 기존 Gemini 키를 값 출력 없이 읽어 staging GEMINI_API_KEY로 stdin 등록했다. 키를 코드·Git·로그·브라우저에 복제하지 않았다.
- PortOne secret으로 존재하지 않는 가상 payment ID를 GET 조회해 PAYMENT_NOT_FOUND(404)를 확인했다. 실제 주문 조회·생성·청구·취소는 하지 않았다. 카드/Kakao 키는 서로 다르고 V2 webhook secret 형식도 있다. **테스트 채널 여부와 SoulCat 판매 승인 MID인지는 미확인**이다. 기존 webhook은 변경하지 않았다.
- .env.local Cloudflare 토큰은 D1 쿼리 권한이 부족했으나 기존 Wrangler OAuth로 staging 작업을 수행했다. 운영 키는 교체하지 않았다.
- Gemini 2.5 Flash 단가는 [공식 가격표](https://ai.google.dev/gemini-api/docs/pricing)의 입력 0.30 USD/백만, 출력(사고 포함) 2.50 USD/백만이다. 2,000 KRW/USD는 보수적 앱 계산 기준이며 실제 청구액 보장이 아니다. 검증 설정 유효기간은 2026-09-20 UTC까지다.

## 남은 승인과 실행 순서

1. 결과 화면과 고등어 Gemini 샘플 검토. 상위 상품 전체의 실제 LLM 품질·비용까지 검증됐다고 확대 보고하지 않는다.
2. PortOne 콘솔에서 SoulCat 심사 상태·MID·카드 채널·Kakao 유형(이니시스/직접)·테스트 여부 확인. 필요하면 해당 PG 테스트 채널 또는 심사가 끝난 신규 MID 채널을 발급받는다.
3. PG 화면에서 요구할 때만 실제 코드·정책과 일치하는 자료 작성. 사업자 서류·계좌·대표자·OTP·법적 동의·업로드는 사용자가 처리한다. 최종 제출은 직전 요약 후 별도 승인 대상이다.
4. 실제 PG 검증안: **고등어 1,000원 × 카드/Kakao 각 1회, 총 2,000원**. 모바일 복귀·서버 재조회·보관함 확인 후 PortOne 콘솔 전액 취소와 권한 철회 확인. 실제 실행·취소·필요한 운영 자원 변경은 별도 승인 전 실행하지 않는다.
5. 실제 기기 로그인·결제 복귀, 새로고침·새 탭, 카카오톡 미리보기 확인.
6. 검증한 상품/모델만 활성화하는 변경을 리뷰하고 staging 회귀 통과. **운영 결제 및 LLM 활성화 승인** 후 승인된 운영 secrets → migration → Pages/Worker 배포 → 버전 일치 확인 → 상품 활성화 순서로 진행.

## 로컬 미리보기와 작업 보존

MOCK 주소: http://127.0.0.1:8791 — 새로고침하면 새 리더를 읽는다. 원본 기본 build는 다른 개발 서버의 out 잠금으로 EBUSY가 발생했다. 별도 export는 성공했고 완성 파일을 out에 복사했다. 폴더 자체를 제거하지 않았다.

```powershell
Set-Location C:\Users\user\Desktop\SoulCatProject
npm run typecheck
npm test
$env:SOULCAT_EXPORT_DIR='.integration/local-preview'
npx next build
node scripts/prepare-release.mjs .integration/local-preview
```

원본 작업트리를 reset/stash/commit/push하지 않았다. 격리 staging 후보만 별도 로컬 Git 이력으로 고정했다. 경로는 .integration/current-staging-release.txt에 있다. main 자동 배포는 사용하지 않았다.

## 환경 변수 이름 연결 (값은 문서에 기록하지 않음)

| SoulCat Worker 설정 | 기존 파일 후보 | 조건 |
|---|---|---|
| GEMINI_API_KEY | GEMINIF_API_KEY | staging에 안전하게 등록 완료 |
| PORTONE_API_SECRET | PORTONE_V2_API_Secret | 승인된 SoulCat 판매/테스트 범위 확인 후 |
| PORTONE_STORE_ID | PORTONE_Store_ID | 실제 store 일치 확인 후 |
| PORTONE_CARD_CHANNEL_KEY | PORTONE_channel | 일반 카드용·테스트 여부 확인 후 |
| PORTONE_KAKAO_CHANNEL_KEY | PORTONE_KAKAOPAY_CHANNEL_KEY | Kakao 전용·테스트 여부 확인 후 |
| PORTONE_KAKAO_TYPE | 없음 | 콘솔 확인으로 inicis 또는 kakaopay 명시 |
| PORTONE_WEBHOOK_SECRET | PORTONE_webhook | 해당 SoulCat webhook 서명 secret인지 확인 후 |

SoulCat staging webhook 경로는 https://staging.code-destiny.com/api/yeongnyangi/payments/webhook 이다. 기존 Code Destiny webhook을 교체하지 않았다. 운영 등록과 실제 PG 실행은 별도 최종 승인 대상이다.

## 최종 확인

- Pages: https://2b6b2c26.soulcat.pages.dev
- Worker: 63f9d6ef-739a-4c85-b3cd-f9cde6c86d5c
- 실제 Gemini 고등어 2회(5챕터씩), 총 11개 생성 호출, 앱 추정 누적 162.50원, 미정산 예약 0. 두 번째 검증은 5개 장 모두 첫 시도 완료.
- 생활 예시는 분리됐지만 요약·분석의 책임감/완벽주의 및 직장 중심 반복은 남았다. 콘텐츠 판매 품질 게이트는 미완료이며 샘플을 보존했다.
- 최종 staging은 LLM_PROVIDER=mock, ALLOW_LIVE_LLM=false, PAYMENTS_ENABLED=false로 복원했다. 실제 PG와 운영은 실행하지 않았다.

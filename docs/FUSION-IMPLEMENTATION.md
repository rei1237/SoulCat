# 영냥이 전체 운세 · 모둠/오마카세 구현 기록

작업 경로: `C:\Users\user\Desktop\SoulCatProject` · 2026-09-13

이 문서는 `DESTINY-BOOK-IMPLEMENTATION.md`의 1차 구현 기록에 이어지는 변경 기록이다. 신규 상품 구성은 여기의 v3를 따르며, 저장된 v2 운명서는 변경하지 않는다.

## 적용 상품

가격의 단일 소스는 `server/payments/catalog.ts`다. 금액을 이미지에 넣지 않는다.

| 상품 | 가격 | 챕터 | 새 구매의 체계 |
|---|---:|---:|---|
| 고등어 | 1,000원 | 5 | 선택한 단일 분야 |
| 연어 | 3,000원 | 13 | 선택한 단일 분야 |
| 광어 | 5,000원 | 30 | 선택한 단일 분야 |
| 참치 | 10,000원 | 70 | 선택한 단일 분야 |
| 생선 모둠 세트 | 20,000원 | 80 | 사주+자미 / 숙요+베다 / 서양 점성술+타로 |
| 생선 오마카세 | 30,000원 | 120 | 여섯 분야 전체 |

총 28개 상품: 여섯 분야 × 네 등급 + 모둠 세 가지 + 오마카세 한 가지.

## 변경 파일과 의도

| 단계 | 주요 파일 | 구현 내용 |
|---|---|---|
| 원본 재사용 | `server/vendor/code-destiny/lib/tarot/`, `docs/tarot-source-provenance.json`, `public/assets/tarot/` | 기존 카드·스프레드·편집 해석·조합 모듈 7개와 78장 카드 이미지 재사용. 원본 네트워크/LLM 실행 모듈 제외. 연인 카드의 JPG 파일명 예외 포함 |
| 상품·구성 | `server/payments/catalog.ts`, `server/fortune/product-manifest.ts`, `server/db/migrations/0004_fusion_daily.sql`, `server/payments/orders.ts` | 가격/체계/분량 중앙 관리. 주문에 v3 상품 사양과 topicId 저장. 기존 주문/결과 보존 |
| 사실·차트 | `server/fortune/tarot/index.ts`, `charts.ts`, `shared/input.ts`, `chapter-facts.ts` | 출생정보 없는 타로, 3/6카드 확정, 초융합 6카드. 기본 차트·추가 체계는 구매 전에 계산. 선택 주제에 맞는 사실 선별 |
| 해설·복구 | `books.ts`, `providers/chapter.ts`, `prompts/domain/rules.ts`, `server/api.ts` | 80/120챕터에서 기존 lease/outbox/raw-response 저장 재사용. 로컬 생성 반복 수도 DB 챕터 수로 결정. 챕터 체계·사실 ID·논점·기간·이전 결론 전달 |
| 한마디 | `server/fortune/daily.ts`, `src/components/DailyWords.tsx`, `YeongnyangRoom.tsx`, `FortuneHome.tsx` | 방 전용 여섯 분야. KST 날짜/사용자/선택 프로필/분야/버전 캐시. 개인 계산 자료와 편집 조언, 정보 부족 시 일반 조언 구분. 홈 CTA는 방으로 이동 |
| 구매·결과 | `FortuneExperience.tsx`, `ChartTabs.tsx`, `FortuneChart.tsx`, `DestinyBook.tsx`, `FortuneLibrary.tsx` | 여섯 메뉴 및 초융합 연결. 구매 전 새로고침에도 소유권 확인 후 같은 차트/카드를 복원. 결과에서 차트 탭·개별 본문·검색·읽음·이어 읽기 유지 |
| 가격표·반응 | `FishCatalog.tsx`, `fish-catalog.css`, `public/assets/fish/`, `docs/fish-asset-provenance.json` | 서버 가격표 여섯 상품. 기존 네 구매 반응 원본 각각 사용. 모둠·오마카세 상품/반응을 각기 새로 생성. 구매 전 기대, 확인 후 감사. 오마카세 2초 1회, reduced-motion 정지 |
| 공유 | `server/shares.ts`, `public/assets/share/` | 새 상품명/이미지 적용. 저장된 요약을 사용하고 공유 시 LLM 호출 없음. 익명 기본·선택 공개·해제 유지 |

모둠 구성은 체계별 20+20, 비교 20, 실행 20이다. 오마카세는 체계별 10×6, 세 조합별 비교 10×3, 통합·실행 30이다. 같은 천문 관측을 공유하는 체계의 일치도를 독립적인 적중 증거로 과장하지 않고, 타로는 질문 당시의 상징으로 구분한다.

## 이미지 출처

- 기존 네 반응: `C:\Users\user\Desktop\사주보는 고양이 영냥이\가격별생선\{고등어,연어,광어,참치}구매-Photoroom.webp`.
- 새 이미지: 내장 imagegen으로 별도 생성. 제품 그림 두 장과 고양이 반응 두 장을 각각 제작했다. 잘못 생성된 체크무늬 배경은 생성 도구로 아이보리 배경으로 수정한 뒤 WebP로 축소했다.
- 생성 원본 폴더: `C:\Users\user\.codex\generated_images\01a09727-6c4e-7670-99a8-c5acfc6eae14`.
- 최종 원본 ID: 모둠 상품 `6cd1d1b3-f594-47bf-b9e6-f6d68850bb37`, 오마카세 상품 `b6449b16-a974-4913-9a16-081e3724c292`, 모둠 반응 `12a93bce-4fac-4505-b30e-b0a5bbb78b10`, 오마카세 반응 `5571e2fb-3d63-4358-a1dc-1f69ebfa7e6e`.
- 최종 자산 크기/해시는 `fish-asset-provenance.json`에 기록했다. 공유 PNG는 해당 상품 그림의 축소본이다.

## 유지한 정책과 실행 경계

- 기존 이용권·월정석 정책, 인증 방식과 PG 검증 규칙을 유지했다. 신규 생선 상품은 별도의 단건 상품이다. 자동 업그레이드·차액 할인은 추가하지 않았다.
- 실제 LLM·실결제·운영 배포·원격 DB 마이그레이션·원격 큐 생성은 실행하지 않았다. 상품 `enabled=false`, `LLM_PROVIDER=mock`, `ALLOW_LIVE_LLM=false`, `PAYMENTS_ENABLED=false`다.
- 신규 마이그레이션은 로컬 D1에만 적용했다. 실제 운세 API를 임의로 테스트하지 않았고, 이번 추가 기능의 QA 서버는 `scripts/dev-mock.mjs`로 KASI 키도 전달하지 않고 실행했다.
- 기존 사주·달력·천문 계산 정책은 변경하지 않았다. 미지원 유월/장기 트랜짓/불확실 시간의 정보를 LLM으로 채우지 않는다.

## 검증 명령과 증거

```powershell
npm run typecheck
npm test
npm run build
npx wrangler deploy --config wrangler.worker.jsonc --dry-run --env staging --outdir .integration/worker-dry-run
node scripts/dev-mock.mjs 8791
node scripts/verify-fusion-ui.mjs
node scripts/verify-fusion-final.mjs
```

- 최종 결과: `npm test` **50개 통과**, 타입 검사·정적 빌드·staging Worker dry-run 통과.
- 화면 결과: 여섯 상품 × 네 폭 **24개 흐름 통과**. 추가 네 폭에서 관계 타로 6장·메뉴 이미지·구매 전 복원·오늘의 카드와 가격표/방/반응의 WCAG A/AA 검사 통과(검사 영역 위반 0). `fusion-final-verification.json` 참조.
- 서버 테스트: 모든 상품 가격/권한/체계/챕터 수, 타로 추첨 중복·동시 생성·snapshot 유지, 기존 참치 네 체계 보존, 신규 참치 단일 체계, 80/120 중간 실패 복구·완료 챕터 유지·재구매 방지·공유, KST 경계·프로필 소유권·일반 조언 폴백, 120개의 구조화 요청 범위/개인정보/입력 크기, 필수 계산 실패 시 주문 없음, 카드 이미지 78장 검증.
- 모바일 증거: `docs/fusion-ui-verification.json`, `.integration/fusion-ui/`. 360/390/430/1280px에서 여섯 상품 결과·리액션·검색·이어 읽기·공유·차트 탭을 검사했다. 전체 본문 최초 DOM 생성은 금지하고 열린 본문만 로드한다.
- QA 중 개발 서버 hot reload로 응답이 끊긴 사례를 확인했다. 같은 구매 재시도가 가능하도록 연결 오류 안내를 보완했다. 새로고침 전 chart/profile 참조를 URL에 기록하여 구매 전 카드도 유지한다. URL에 출생정보나 질문은 넣지 않는다.

## 추가 확인이 필요한 부분

실제 LLM의 문장 품질·120챕터 간 의미 중복·실제 모델 비용, PG/카카오 결제 복귀와 실기기 인앱 브라우저, 운영 큐 장애 복구, 카카오 OG 캐시 동작은 이번 Mock/로컬 검증의 범위가 아니다. 해당 연결을 승인받아 검증하기 전 유료 운영 준비 완료로 보지 않는다. 원본 계산 엔진의 지원 범위와 1차 보고서의 사주 종격/달력 폴백 제한도 유지된다.

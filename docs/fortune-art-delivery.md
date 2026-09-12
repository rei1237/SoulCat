# 영냥이 운세 일러스트 적용 — 2026-09-12

## 범위와 시각 기준

`YEONGNYANGI_NEXT_SESSION_PROMPT.txt` → `YEONGNYANGI_VISUAL_REDESIGN_HANDOFF.md`의 승인된 범위를 적용했다. 요청된 중첩 경로는 없었으며 루트의 실제 프롬프트를 사용했다.

- 선택 화면에서 쓰는 9종(saju, sukuyo, vedic, astrology, ziwei, love, luck, work, money)만 생성. 추가 시안/재생성 없음.
- 제공된 대표 WebP를 실제 열람하고 built-in `image_gen`의 참조 파일로 전달. 흰 털, 보라·금빛 눈, 달무늬 모자, 남색 의상, 보석과 도도한 표정 유지.
- 같은 보라 점술방과 금빛 조명 안에서 책, 관계를 잇는 두 토큰, 베다 다이아몬드 차트, 서양 원형 차트, 자미 명반 등 소품으로 구분. 계산 결과를 표시하는 차트가 아닌 장식 일러스트다.
- 새 일러스트 9종은 앱에서 **560×560 WebP**로만 참조. 합계 606,146바이트(약 592KiB), 파일당 64~71KB. 도구가 반환한 PNG 원본은 `docs/fortune-art-originals/`에 보존하며 앱으로 전송하지 않는다.
- `src`의 PNG 참조는 0건. 기존 대표 이미지·홈·프롤로그·방·생선 참조도 이미 WebP이며 불필요한 교체 없음. 개발 캡처와 출처 메타데이터의 PNG는 화면 이미지 참조가 아니다.

## UI 계약

목적은 운세 주제를 선택하고 기존 입력 흐름으로 진입하는 것이다. 제목·설명·행동 문구는 React 텍스트로 유지한다. 분홍/노랑/하늘색의 `.tone-*` 배경을 제거하고 `#2b1a3d` 표면, 아이보리 제목, 금색 행동 문구를 사용한다. 흰 털을 어둡게 만들던 multiply를 제거했다.

기존 2열 선택 구조, 숙요의 첫 카드 전체 너비 예외, 키보드 포커스와 클릭 동작은 유지한다. 정사각형 이미지는 contain으로 보존하고, 숙요 대표 그림은 최대 높이 360px로 제한한다. 첫 두 이미지는 eager, 이후는 lazy이며 크기를 명시해 레이아웃 이동을 줄인다. 별도 모션을 추가하지 않았다.

## 수정 파일

- `src/components/FortuneExperience.tsx`: 새 WebP 경로, 크기, 비동기 디코딩, tone 클래스 제거.
- `src/components/fortune.css`: 카드 배경/텍스트 대비 통일, 이미지 혼합 효과 제거, 비율과 hover 조정.
- `scripts/prepare-fortune-assets.mjs`: 보존한 생성 원본에서 WebP 재현, `--illustrations-only`, 기존 원본과 별도 경로, manifest 갱신.
- `public/assets/fortune/*-illustration.webp` 및 출처 sidecar 9쌍.
- `docs/fortune-art-originals/`: PNG 원본 9개, WebP 비교 시트, 정확한 생성 프롬프트 `prompts.json`.
- `docs/fortune-asset-manifest.json`: 참조 원본, 도구, 프롬프트, 크기, 파일 크기 기록.
- `scripts/verify-fortune-art.mjs`, `docs/fortune-art-verification.json`, `docs/fortune-art-screenshots/`: 새 그림의 20개 도메인/화면 폭 검증과 캡처.
- `docs/fortune-screenshots/saju-*.png`: 기존 UI 검증 스크립트가 갱신한 사주 화면.

## 검증

```powershell
npm run typecheck
node scripts/prepare-fortune-assets.mjs --illustrations-only
npm run build
node scripts/verify-fortune-art.mjs
node scripts/verify-fortune-ui.mjs
node scripts/verify-purchase-ui.mjs
```

모두 통과. 5개 운세 × 360/390/430/1280px에서 WebP 디코딩, 가로 넘침 없음, 포커스 표시, axe A/AA 위반 0건. 별도 UI 검증은 생선 가격 선택과 숙요 두 프로필을 확인했다. 로컬 Mock 구매 → 실제 계산 → Mock 상담 → 저장 → 새로고침 → 보관함 재열람 통과. 새 이미지 검증의 브라우저 외부 요청은 차단했다.

최종 읽기 전용 시각 리뷰 판정은 **ship**. 리뷰어가 `docs/fortune-art-screenshots/`의 20장과 정확한 참조 원본 `C:/Users/user/Desktop/사주보는 고양이 영냥이/사주 보는 고양이 영냥이.webp`를 확인했으며, 중대한 시각 결함은 발견하지 않았다. 흰 고양이 정체성, 보라·금빛 방의 일관성, 파스텔 배경 및 이미지에 합성한 UI의 배제, 기존 2열과 숙요 전체 너비 예외를 확인했다. 이 판정은 이번 일러스트 적용 범위의 승인 가능 상태이며 운영 배포나 실결제 검증을 뜻하지 않는다.

최초 새 검증 스크립트에서 Axe가 명시적 BrowserContext를 요구해 스크립트를 수정한 뒤 재실행했다. 앱 결함이나 추가 이미지 생성은 없었다. Impeccable 기계 검사는 기존 화면의 색상·타입·모서리 값과 오래된 디자인 sidecar 사이의 advisory를 보고했으며, 전체 디자인 문서 갱신은 범위 밖이다.

## 보존 및 남은 사항

생선 4종과 고등어 1,000원 / 연어 3,000원 / 광어 5,000원 / 참치 10,000원 유지. 운세 데이터·계산·상담 프롬프트·결제·인증·API·DB 변경 없음. 실제 상담용 Cloudflare AI/Gemini와 실제 결제 호출 없음. 기존 홈·프롤로그·방의 병행 작업 보존. 운영 배포 및 PR 없음.

실인증, 실결제, 영속 Job, 상품별 상담 범위, 라이선스 등 출시 전 과제는 기존 구현 인수인계에 남아 있으며 이번 적용으로 해결된 것으로 보지 않는다. DESIGN.md와 `.impeccable/design.json`의 동기화는 별도 `document` 작업에서 갱신할 수 있다.

적용 화면: `http://127.0.0.1:8790/fortune/?domain=saju` (로컬 서버 실행 시).

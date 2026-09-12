# 영냥이 운세 일러스트 교체 — 다음 세션 전용 인수인계

## 사용자 요청과 현재 상태

사용자: “운세 이미지가 다소 색깔별로 있는게 보기 좋지 않아 대표 이미지를 참조해서 그냥 니가 직접 그려서 넣어주고 다른 세션에서 하는 편이 쌀것 같아서 인수 인계 파일과 명령 프롬프트를 만들어줘.”

이번 세션은 인수인계 문서만 작성했다. **새 이미지는 아직 생성하지 않았고 UI도 교체하지 않았다.** 다음 세션에서 이미지 생성 도구로 직접 그려 실제 앱에 적용한다. 단순 배경색 변경으로 끝내지 않는다.

작업 루트: `C:/Users/user/Desktop/SoulCatProject`
진입 화면: `http://127.0.0.1:8790/fortune/?domain=saju` (서버 실행 여부는 재확인)
기존 구현 기준 커밋: `95032b1`, `b4960ef`, `6c1c394`.

## 시각 방향

- 현재 연노랑/연두/하늘/라벤더/복숭아색으로 나뉜 `.tone-*` 카드 배경을 없앤다. 카테고리마다 색을 바꾸는 방식은 폐기한다.
- 대표 영냥이의 얼굴, 흰 털, 눈매, 모자·의상·장신구, 도도한 표정을 먼저 실제 이미지로 확인하고 새 그림에서도 일관되게 유지한다.
- 기존 보라 점술방·금색·아이보리 세계관 안에서 카드 배경/조명/그림체를 통일한다. 카드별 차이는 포즈와 운세 소품으로 표현한다.
- 사주는 명리 자료, 숙요는 두 사람의 관계, 베다는 Jyotish, 서양은 천체 차트, 자미는 명반이라는 특징을 구분한다. 서로 다른 체계의 상징을 무분별하게 섞지 않는다.
- 이미지 안에 카드 제목·설명·가격·버튼·워터마크를 그리지 않는다. 글자는 React UI로 표시한다. 기존 이미지 속 라벨/프레임/UI가 중복되는 문제도 함께 해결한다.
- 손가락으로 선택하기 쉬운 모바일 2열 구조와 실제 생선 가격 선택은 유지한다. 생선 원본 4종은 교체 대상이 아니다.

## 먼저 확인할 파일 — 재조사 최소화

1. 이 문서.
2. `src/components/FortuneExperience.tsx`, `src/components/fortune.css`, `src/data/fortune.ts`.
3. `DESIGN.md`의 현재 대표 캐릭터/세계관 부분과 `docs/fortune-asset-manifest.json`.
4. 대표 원본: `C:/Users/user/Desktop/사주보는 고양이 영냥이/사주 보는 고양이 영냥이.webp`.
5. 앱 대표 파생본: `C:/Users/user/Desktop/SoulCatProject/public/assets/hero-800.webp` (manifest에서 위 원본과 연결 확인됨).
6. 현 상태 캡처: `docs/fortune-screenshots/saju-390.png`, `fish-390.png`, `sukuyo-390.png`.

원본 폴더 전체 또는 D:/Development를 다시 전수 검색하지 않는다. 계산/결제 구조가 필요한 경우에만 `YEONGNYANGI_IMPLEMENTATION_HANDOFF.md`의 해당 절을 읽는다.

## 실제 수정 지점

- `src/data/fortune.ts`: 화면별 제목/설명과 choice 이미지 ID.
- `src/components/FortuneExperience.tsx`: reading-choice/tone 클래스, 이미지 표시. 현재 category 이미지 ID는 saju, sukuyo, vedic, astrology, ziwei, love, luck, work, money. 필요한 실제 사용 ID만 교체.
- `src/components/fortune.css`: `.reading-choices`, `.reading-choice`, `.tone-0`~`.tone-4`, `.relationship-choices`.
- `public/assets/fortune/`: 신규 최적화 이미지 적용 위치. 기존 원본은 별도로 보존하고 생성 이미지임을 manifest에 기록.
- `scripts/prepare-fortune-assets.mjs`: 예전 원본을 재복사해 새 이미지를 덮어쓰지 않도록 입력 경로/생성 산출물 관리 수정.
- `docs/fortune-asset-manifest.json`: 새 파일의 출처·생성 참고 이미지·크기 기록.
- 필요하면 `docs/fortune-surface-brief.md`를 최종 방향으로 갱신. 전체 DESIGN.md나 홈 세계관을 재작성하지 않는다.

## 실행 방법과 비용 경계

1. git status로 다른 세션 변경을 확인하고 보존한다. 이 repo에서는 홈/프롤로그/방 화면의 병행 변경이 있었다.
2. 제공된 `imagegen` 스킬을 읽고 이미지 생성/편집 도구를 사용한다. 대표 이미지를 실제로 확인하고 참조 이미지로 전달한다. 외형을 텍스트만으로 추측하지 않는다.
3. 사용자에게 이미 직접 그리라는 승인이 있으므로 선택지 여러 세트/불필요한 재확인은 생략한다. 필요한 이미지 수만 생성하고 반복 생성은 확인된 결함에 한정한다.
4. 이 요청의 이미지 생성은 승인된 작업이다. 다만 운세 상담용 Cloudflare AI/Gemini, 실제 결제 호출은 여전히 금지다. 이미지 생성은 무료라고 단정하지 않는다.
5. 최적화와 앱 적용까지 끝낸다. PNG 원본 보존, WebP 파생본, 크기 지정, 적절한 lazy loading. 흰 털을 투명 배경으로 오인해 제거하지 않는다.
6. 현재 프로필 입력/생선 선택/Mock 생성/보관함 경로를 유지하고 작은 범위로 커밋한다. PR/운영 배포는 이 시각 수정 요청에 포함하지 않는다.

## 검증

```powershell
Set-Location 'C:\Users\user\Desktop\SoulCatProject'
npm run typecheck
npm run build
# 8790이 이미 실행 중이면 추가 실행하지 않음
npx wrangler pages dev out --port 8790 --ip 127.0.0.1 --binding APP_ENV=local
# 다른 터미널에서
node scripts/verify-fortune-ui.mjs
node scripts/verify-purchase-ui.mjs
```

UI 스크립트는 360/390/430/1280px, 생선 실제 금액과 숙요 두 프로필을 확인한다. 사주 외 다른 운세의 새 그림도 화면에서 확인한다. 새 코드 변경이 계산에 닿지 않으면 무관한 엔진 검사를 반복하지 않는다. 시각 검토 1회 후 발견된 결함을 함께 수정하고 필요한 확인만 추가한다.

## 유지해야 할 계약

- 고등어 1,000원 / 연어 3,000원 / 광어 5,000원 / 참치 10,000원. 기본 고등어, 서버 catalog 신뢰.
- 사주/숙요/베다/서양/자미 실제 계산 모듈, LLM Provider 경계, 세션 소유권, D1, idempotency, private no-store 유지.
- 실판매 꺼짐, 상담 LLM Mock 기본. 실제 키를 화면/로그/커밋에 노출하지 않는다.
- 기존 홈·프롤로그·방·타로 및 다른 작업자의 변경을 삭제하거나 덮어쓰지 않는다. git add -A/reset/restore 금지. 수정한 파일/변경 부분만 stage.
- 로그인/실 PG/영속 Job/등급별 상담 범위/라이선스 관련 미완료 항목은 기존 통합 인수인계에 남아 있다. 이번 이미지 교체로 해결됐다고 표시하지 않는다.

## 완료 보고

새 일러스트가 적용된 실제 화면 또는 캡처, 수정 파일, 검증 결과, 아직 남은 연결 작업을 짧게 보고한다. 단순 계획이나 이미지 파일 생성만으로 끝내지 않는다.

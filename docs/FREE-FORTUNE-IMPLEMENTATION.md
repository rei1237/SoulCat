# 영냥이 무료 운세·멸치 출석

## 구현한 동작

- 로그인 계정별 KST 하루 1회 출석(+1), 하루 전체 열기(-1). 미사용 멸치는 누적한다. 구매·환전·선물 기능은 없다.
- 원장 `(user_id, day, kind)` 고유 제약과 단일 SQL 조건부 INSERT로 중복 지급·차감을 막는다. unlock 원장 자체가 열람 권한이다.
- 무료 결과는 `(user_id, day, category)`당 최초 입력·카드 배열·결과를 고정한다. 실행 중에는 중복 계산을 막고 실패 시 같은 입력으로 재시도한다. 읽기 API에서는 결과를 새로 만들지 않는다.
- 신규 열람 성공 응답의 `newlyUnlocked`에서만 0.4초 받기 → 0.9초 불만족 표정 → 상담 표정으로 전환한다. 모션 감소 설정은 정지 그림을 쓴다.
- 16종 요약과 상세 타이핑 해설, 즉시 전문 읽기, 계산 근거, 운세별 전문가 프롬프트 확인·복사를 제공한다. 사주·자미두수·숙요·서양 점성술·베다·타로는 기존 계산 차트를 함께 보여주며, 종합운은 네 체계의 프롬프트와 차트를 각각 분리한다. 무료 경로에는 LLM 호출이 없다.
- 유료 입력폼과 무료 프로필 입력에 공통 숫자 필드·달력 변환·장소 검색을 연결했다. 기존 결제·인증 구조는 유지한다.

## 주요 파일

- `src/components/BirthFields.tsx`: 숫자 입력과 출생지·거주지 선택.
- `src/components/DailyWords.tsx`, `src/components/ChartTabs.tsx`, `src/components/free-fortune.css`: 출석·멸치 반응·16종 메뉴·영냥이 스타일의 무료 차트·결과.
- `server/fortune/free/attendance.ts`, `readings.ts`, `places.ts`: 출석 원장, 규칙 기반 해설, 지명 검색.
- `server/db/migrations/0006_free_fortune.sql`: 신규 원장·결과·검색 캐시 테이블.
- `server/fortune/shared/korean-time.ts`: 역사적 한국 민용시를 고정 KST 계산기로 한 번 정규화.
- `src/data/free-fortune-hub.json`: 참조 허브의 16종 설명·필드·역할·원칙·답변 구조.
- `public/assets/fish/anchovy.webp`, `reaction-anchovy.webp`: 신규 투명 WEBP.

## 계산 출처와 한계

- 사주, 자미두수, 숙요, 점성술, 베다는 기존 vendored Code Destiny 엔진을 사용한다. 사주의 절기·야자시 정책은 유지한다.
- 한국의 과거 UTC+8:30 및 DST를 IANA 이력으로 해석해 고정 KST 계산기에 넘긴다. DST 중복·누락 시각은 추정하지 않는다.
- 시주 보정은 기존 서비스의 **경도에 따른 평균태양시 보정**이다. 균시차를 추가 적용한 진태양시라고 주장하지 않는다.
- 사주·자미두수·구성학의 해외 출생은 미지원 조건을 명시하고 계산을 거부한다. 해외 출생의 숙요·베다·서양 점성술은 해당 시간대의 실제 UTC를 사용한다. 서양 Placidus 고위도 제한은 유지한다.
- 숙요의 오늘 숙은 KST 정오 대표값이다. 경계 전후 27숙 연속성과 해외 동일 순간 일치를 테스트한다. 점성술·베다의 출생 차트를 실시간 트랜짓이라고 표현하지 않는다.
- 당사주 지지→별/해설 자료, 구성학·매화역수 계산기, 수비학 생명수·개인일수 공식은 참조 서비스에서 추출했다. 추출 스크립트와 `free-fortune-provenance.json`에 출처를 남겼다.
- 육효·심리·꿈·호라리는 확정 차트가 없는 질문·상징 해설이다. 개인 괘·진단·상대 마음을 생성한 결과처럼 표시하지 않는다.
- 거주지는 별도 보관하며 출생지를 대신하지 않는다. 현재 구현에서 거주지를 사용하는 이전·방위 계산은 제공하지 않는다.

## 장소 검색

기존 Code Destiny 도시표의 정확한 이름 매칭을 먼저 사용한다. 그 외에는 [Nominatim](https://operations.osmfoundation.org/policies/nominatim/)을 검색 버튼으로만 요청한다. 자동완성 요청은 없다. D1의 전역 1.1초 간격 예약, 30일 캐시, 서비스 식별 User-Agent와 OpenStreetMap 출처 표시를 적용했다. `PLACE_SEARCH_ENDPOINT`로 서버 측 제공처를 교체할 수 있다.

좌표의 IANA 시간대는 tz-lookup으로 찾는다. 시간대 경계 근처의 오차 가능성을 UI에 알리며, 검색 실패를 서울로 바꾸지 않는다. 상세 집 주소 대신 도시·구까지만 입력받는다. 외부 검색 실패·후보·캐시·속도 제한은 주입형 테스트로 검증했다.

## 검증과 로컬 실행

최종 확인: `npm run typecheck` 통과, `npm test` 76개 통과. 사용 중인 8793 로컬 서버가 `out`을 점유하고 있어 기본 출력 경로 대신 `.integration/free-preview-prompt-charts`로 격리 빌드·릴리스 준비를 통과시켰다. 360/390/430/1280px 브라우저 흐름에서 출석·멸치 반응·숫자 입력·장소 선택·재열람·사주 만세력·타로 카드·종합운 4개 차트 탭을 확인했다. 검사한 `#daily`의 serious/critical 접근성 오류와 브라우저 오류는 0건이다. 실제 모바일 기기의 키보드가 아닌 Chrome viewport 검증이다.

```powershell
npm run typecheck
npm test
npm run build
npx wrangler d1 migrations apply DB --config wrangler.free-local.jsonc --local --persist-to .integration/free-runtime
node scripts/dev-free-mock.mjs
# 다른 터미널
node scripts/verify-free-ui.mjs
```

미리보기: http://127.0.0.1:8793/room/#daily

로컬 설정에는 실제 AI·PG 바인딩과 비밀값이 없다. Windows에서는 `out`을 사용하는 로컬 서버를 종료한 뒤 다시 빌드한다. 테스트 결과는 `free-fortune-ui-verification.json`, 화면은 `.integration/free-ui/`에 기록한다.

운영 DB migration, 운영 배포, 실제 PG 결제 및 LLM 호출은 이 작업에서 실행하지 않았다. 기존에 진행 중인 결제·운명서 화면 변경은 보존했다. 실제 기기 키보드·WebView, 해외 시간대 경계 장소, 운영 로그인 연결은 별도 확인 항목이다.

## 이미지 제작 프롬프트

Built-in `image_gen`을 사용했다. 원본은 Codex generated_images에 보존하고 프로젝트에 alpha를 유지한 WEBP를 저장했다.

**표정**

> Create a production transparent-background game character asset for the existing Korean fortune-telling cat Yeongnyangi. Reference image is the strict character identity and illustration style: white fluffy cat, exactly two pink ears, sleepy violet eyes, navy wizard hat with gold stars and crescent, gold tassel, purple gem collar. Waist-up centered composition, ample transparent margins, no text. The cat has just received one tiny dried silver anchovy and holds it delicately in one paw at chest height, glancing down at it. Subtle funny underwhelmed expression: half-lowered eyelids, one very slightly asymmetric mouth corner, quietly unimpressed but still affectionate, absolutely no anger, tears, disgust, or extra ears. Polished watercolor/storybook rendering matching the reference. Real alpha transparent background, no scene, no checkerboard.

**멸치**

> A single tiny dried anchovy as a premium Korean storybook game inventory item, painted watercolor style with delicate navy linework and warm ivory highlights. Silver grey slender curved fish, recognizable tiny eye, subtle gold reflected light; charming but not a cartoon face. Centered horizontal composition with generous empty margins. Truly transparent alpha background, no plate, no cat, no text, no shadow backdrop, no checkerboard. Asset will be shown at 40px and 96px in a violet and gold fortune-telling cat app, so use a clear readable silhouette.

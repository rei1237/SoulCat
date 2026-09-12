# 영냥이의 방: 시네마틱 프롤로그

## 수정 파일과 의도
- src/data/home.ts: 두 가상 대통령의 운명을 맞힌 천기누설, 저주, 변신, 고등어와 재개업을 8장면으로 집필. 하늘의 대사와 영냥이의 대사를 분리하고 ~냥 말투를 사용하지 않음.
- src/components/StoryPanel.tsx: 독립된 장면 컴포넌트, 데이터 기반 배경·캐릭터·후속 포즈, 다음 장면 사전 로딩, 이미지 실패 시 본문 유지.
- src/components/FortuneHome.tsx: 프롤로그 배너와 진입 연결. 메인 진입은 /room/으로 연결. 프롤로그는 방 안에서 열리며 마지막 CTA는 /fortune/으로 연결.
- src/app/globals.css: 모바일 100dvh, 760px 이상 극장형 모달, 고정 조작부·안전 영역·스크롤 가능한 본문. 기존 데스크톱 모달 transform 상속을 명시적으로 해제.
- scripts/prepare-assets.mjs, public/assets/prologue-*.webp 및 출처 sidecar, docs/asset-manifest.json: 사용자 원본 10개 파생 에셋. 원본 보존, 투명도 유지, 원본 이상의 리사이즈 금지.
- scripts/verify-prologue.mjs, scripts/verify-ui.mjs: 8장면 및 기존 메인 동작 검증.
- README.md, DESIGN.md: 변경한 스토리 구조 기록.

## 유지한 영역
이 작업은 결제 정책·가격·인증·API·DB·운세 엔진을 변경하지 않았다. 오늘의 한마디 보관 기능을 추가하지 않았다. 대통령 이름·국가·실제 사건은 등장하지 않으며, 최고의 실력과 헐값 복채는 가상 세계의 저주 설정이다. 사용자가 제외한 인간 뒷모습 회상 이미지 두 장은 사용하지 않았다.

## 검증 명령과 증거
- npm run assets
- npm run typecheck
- npm run build
- npm run test:ui (최종 캡처 경로는 SOULCAT_REVIEW_DIR=docs/screenshots/prologue-home-check)
- node scripts/verify-prologue.mjs

메인 검증: docs/ui-verification.json.
프롤로그 검증: docs/prologue-verification.json.
360×800, 390×844, 430×932, 1440×1000의 각 8장면: docs/screenshots/prologue/.
이전/다음, 다시 열 때 초기화, Escape와 포커스 복귀, 키보드 이동, 마지막 CTA, 모션 감소, 이미지 실패 시 탐색을 검증한다.

## 추가 확인
실제 iOS/Android 기기와 저속 회선 체감은 별도 확인이 필요하다. 이번 검증은 로컬 Chrome 렌더링이며 외부 배포는 수행하지 않았다.


## 후속 요청: 영냥이의 방과 개별 포즈
- src/app/room/page.tsx, src/components/YeongnyangRoom.tsx, src/components/room.css: 별도 /room/ 화면. 기존 점술방 배경과 큰 영냥이, 말풍선, 자유 입력창, 고민 시작 문구, 프롤로그 진입, 작은 휴식 영역을 구성.
- 수다방과 메인의 영냥이 방 버튼은 /room/으로 연결한다. 프롤로그 종료 시 방의 작성 중 질문과 로컬 메모를 유지한다.
- 자유 상담 API는 현재 존재하지 않아 실시간 AI 응답을 구현한 것으로 표시하지 않는다. 입력 내용을 서버에 보내지 않고 준비된 안내 질문으로 고민을 정리하는 UI다. 새로고침/방 나가기 시 메모는 사라진다.
- src/components/CatMotion.tsx: 6개의 개별 걷기 이미지를 110ms 간격으로 두 번 재생한 뒤 4가지 정지 포즈 중 하나로 전환. 모션 감소 시 즉시 정지 포즈로 변경. 원시 스프라이트 시트를 표시하지 않는다.
- 걷기 크롭은 각기 다른 좌표를 사용하고 240×230 흰색 캔버스로 정규화했다. 밤 독서 포즈의 오른쪽 크롭을 줄여 옆 그림 조각을 제거하고, 낮 음료 포즈는 커피 원본의 독립 영역으로 교체했다.
- 귀가 세 개인 하품 포즈(room-wave)는 생성/사용 목록과 배포 에셋에서 제거했다. 사용자의 이전 제외 이미지도 계속 사용하지 않는다.
- scripts/serve.mjs: Next 정적 export의 .html 파일을 /room/ 같은 경로에서 미리 볼 수 있도록 확장자 대체 탐색 추가.
- 추가 검증: node scripts/verify-room.mjs, docs/room-verification.json, docs/screenshots/room/.
- 기존 빌드 캐시에서 발생한 메인 아이콘의 SSR/클라이언트 불일치는 새 빌드 캐시로 확인했다. 결제·인증·API·DB·운세 계산 구현은 이번 작업에서 수정하지 않았다.


## 최종 확인 결과
최종 build/typecheck/test:ui 및 verify-room 검사를 통과했다. 메인 7개 화면 크기와 방 4개 화면 크기에서 깨진 이미지/가로 넘침/JS 오류/axe WCAG 위반이 없었다. 8장면 프롤로그의 4개 화면 크기 검사도 통과했다. 최종 메인 캡처는 docs/screenshots/room-home-final/, 방 캡처는 docs/screenshots/room/, 수정된 개별 크롭 모음은 docs/screenshots/room-crops-final.png다. 입력 초안 유지, 방으로 복귀, 수다방 연결, 개별 프레임 종료, 모션 감소를 확인했다.

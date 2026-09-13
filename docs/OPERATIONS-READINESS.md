# SoulCat 운영 전 실행 순서

작성일: 2026-09-13

이 문서는 `https://staging.code-destiny.com/`와 영냥이(SoulCat)를 운영 수준으로 연결하기 위한 남은 단계를 실행 순서대로 정리한다. 현재 작업에서는 로그인 진입 UI와 꿀꿀 운세 연결 안내만 구현했다. 운영 결제, 운영 LLM, 운영 DB 변경, production 배포는 실행하지 않았다. SoulCat 결제 정책은 꿀꿀 운세의 기존 결제 권리와 별개로 운영한다.

staging 사용자 진입 주소:

- 실제 SoulCat 첫 화면: `https://staging.code-destiny.com/fortune/`
- 영냥이 방: `https://staging.code-destiny.com/room/`
- 보관함: `https://staging.code-destiny.com/library/`
- `https://staging.code-destiny.com/_soulcat`은 화면 주소가 아니라 SoulCat 정적 자산 네임스페이스다. 직접 접근 시 `/fortune/`으로 리다이렉트되도록 유지한다.

## 1. 로그인

현재 구현:

- 홈 로그인 패널에서 Google, 네이버, 카카오 버튼을 제공한다.
- 각 버튼은 기존 Code Destiny OAuth 시작점으로 이동한다.
  - `/api/auth/oauth/google/start`
  - `/api/auth/oauth/naver/start`
  - `/api/auth/oauth/kakao/start`
- SoulCat 서버는 기존 `fortune_auth_token`, `fortune_auth_refresh` 쿠키를 `AUTH_SERVICE`로 확인해 사용자 ID를 `codedestiny:{id}` 형태로 매핑한다.
- 새 비밀번호 저장소나 별도 OAuth secret을 SoulCat에 추가하지 않았다.

다음 실행:

1. `staging.code-destiny.com`에서 Google, 네이버, 카카오 각각 실제 계정으로 로그인한다.
2. 로그인 후 `/fortune/`, `/room/`, `/library/`, `/ggulggul-fortune/` 복귀 경로가 의도대로 동작하는지 확인한다.
3. `/api/yeongnyangi/session`이 익명에서는 401, 로그인 후에는 200을 반환하는지 확인한다.
4. Code Destiny `/api/auth/me`가 degraded 또는 token-only fallback을 반환할 때 SoulCat이 권한을 열지 않는지 확인한다.

## 2. 꿀꿀 운세 연결

현재 구현:

- 사용자 제공 꽃돼지 이미지를 `public/assets/ggulggul-fortune.webp`로 추가했다.
- 홈에 영냥이와 꿀꿀 운세를 연결하는 카드가 추가됐다.
- `/ggulggul-fortune/` SEO 안내 페이지를 추가했다.
- staging Worker 라우트 허용 목록에 `/ggulggul-fortune/`를 추가했다.

다음 실행:

1. staging에서 `/ggulggul-fortune/`가 SoulCat 화면으로 열리는지 확인한다.
2. 카드의 "꿀꿀 운세로 이동" 링크가 기존 Code Destiny 운세 허브로 이동하는지 확인한다.
3. 운영 전에는 `NEXT_PUBLIC_CODE_DESTINY_ORIGIN` 또는 production 환경의 origin 판정을 다시 확인한다.

## 3. 결제와 권한

현재 상태:

- `PAYMENTS_ENABLED=false`.
- PortOne 운영 청구는 실행하지 않았다.
- SoulCat은 꿀꿀 운세의 기존 결제 권리를 자동 적용하지 않는 별도 결제 서비스다.
- 현재 UI에서 검증된 결제 안내는 SoulCat 상품 카탈로그의 별도 상품 기준만 사용한다.

다음 실행:

1. PortOne 콘솔에서 SoulCat용 MID, 카드 채널, 카카오페이 채널, webhook secret의 테스트/운영 여부를 확인한다.
2. staging에서 고등어 1,000원 상품만 카드 1회, 카카오페이 1회 실제 테스트한다.
3. 결제 복귀, 서버 재조회, 보관함 노출, PortOne 전액 취소, 권한 철회까지 한 세트로 확인한다.
4. 사용자 승인 전 production 결제 활성화는 하지 않는다.

## 4. LLM과 생성 품질

현재 상태:

- 최종 staging 설정은 mock 기준이다.
- 실제 Gemini 검증은 고등어 샘플 범위에 한정한다.

다음 실행:

1. 고등어 샘플 리포트의 품질, 반복, 근거 표현, 민감 표현을 검토한다.
2. 상위 상품은 비용과 실패 복구가 더 크므로 별도 예산 한도와 품질 샘플을 먼저 정한다.
3. 운영 활성화 전 `ALLOW_LIVE_LLM=true`, `LLM_PROVIDER=gemini`, 큐/DLQ, 예산 guard를 staging에서 재검증한다.

## 5. 운영 배포

다음 실행:

1. staging에서 로그인, 무료운세, 단건 결제 복귀, 보관함, 공유 링크, 새로고침/새 탭을 검증한다.
2. 모바일 Safari, Android Chrome, 카카오톡 인앱 브라우저에서 로그인 복귀와 결제 복귀를 확인한다.
3. production secrets를 승인된 값으로 등록한다.
4. migration, Worker 배포, Pages 정적 배포, `/version.json`, `/api/yeongnyangi/version` SHA 일치를 확인한다.
5. 상품 활성화는 검증한 상품부터 단계적으로 연다.

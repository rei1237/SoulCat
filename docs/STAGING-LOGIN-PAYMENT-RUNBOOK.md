# SoulCat staging 로그인·결제 검증

## 범위

- 대표 경로: `/yeongnyangi/`; 모든 서비스 화면·법적 안내·SEO는 하위 경로에 있다.
- API `/api/yeongnyangi/*`, 공유 `/share/yeongnyangi/*`, 에셋 `/_soulcat/*`는 유지한다.
- 구 `/fortune/`, `/room/`, `/library/`, `/_soulcat` 진입은 쿼리를 보존해 새 경로로 이동한다. 기존 루트·운세 하위 기능·인증·결제 API는 통과시킨다.
- 결제는 Code Destiny 결제창(`/checkout/?featureKey=yeongnyangi-…&returnTo=/yeongnyangi/…`) 한 곳에서만 일어난다. 이 워커는 CD 증빙 API로 권리만 부여하며 PG·웹훅·`PAYMENTS_ENABLED`가 없다.
- 정식 canonical은 `https://code-destiny.com/yeongnyangi/`. 이번 후보는 staging/Pages 미리보기용으로 HTML·HTTP에서 noindex다. 운영 전환은 별도 변경·승인이다.
- 기존 인증 Service Binding을 재사용하고 SoulCat D1·주문·권한은 분리한다.

## 현재 설정과 검증 절차

실결제 검증은 CD staging 결제창에서 CD 결제 문서의 승인 절차대로 한다. 이 워커의 activation 파일은 실 LLM만 켜며 결제 슬롯은 없다. 과거 등록한 `PORTONE_*` staging secret 6종은 2026-09-15 승인 후 삭제했다.

1. 각 provider에서 사용자가 직접 로그인한다. 홈 하단의 로그인 상태, POST session 200, library 200, 재접속·새 탭·로그아웃을 확인한다. 비로그인은 401이며 소유권 없는 결과는 거부되어야 한다.
2. 검증 계정의 서버 확인된 `codedestiny:<id>`를 로컬 activation 파일의 `STAGING_TEST_USER_IDS`에 넣는다. ID나 비밀키를 Git에 기록하지 않는다.
3. `scripts/staging-activation.mjs` 계약대로 단일 상품 `saju_mackerel`, 실행 ID `soulcat-login-payment-20260913`, `LLM_STAGING_VALIDATION_MANIFEST=destiny-book-v4` 및 유효한 가격·예산을 준비한다. 기존 실제 검증 기록은 v3이므로 v4 검증 완료로 재사용하지 않는다. 실 LLM 생성은 허용 계정(최대 3)·해당 상품의 PAID 주문에서만 열리며 운영 품질 검증 선언이 아니다. 테스트 누적/일 예산은 각 1,000원 이하이며 기존 원장 사용분을 포함한다.
4. 깨끗한 커밋에서 build → SEO 검증 → Pages preview 전용 업로드 → 고정 preview SHA/sourceDigest 확인 → `node scripts/deploy-staging.mjs <immutable-preview-url> <local-activation-file>` 순서다. activation 파일을 생략하면 실제 AI를 비활성화한다.
5. 허용 계정으로 `/yeongnyangi/fortune/`에서 고등어 1,000원을 고르면 CD 결제창으로 이동한다. CD 결제 문서의 승인 범위 안에서 1회 결제 → `returnTo` 복귀 → `POST orders`가 증빙을 소비해 PAID → 실제 결과 5챕터·보관함 확인 → 환불·권한 철회는 CD 정책으로 처리한다.
6. 각 이벤트의 주문·증빙·권한 상태와 SHA를 값이 노출되지 않는 로컬 증거 파일에 기록한다. OTP·카드 인증은 사용자가 직접 입력한다.
7. 완료 또는 중단 시 activation 파일 없이 동일 후보를 재배포해 실 LLM을 비활성화한다. 결제 상태는 CD 쪽에서 확인한다.

`server/db/migrations/0006_free_fortune.sql`, `0007_staging_payment_validation.sql`은 staging에만 적용했다. 0007의 `staging_validation_run` 컬럼·유일 인덱스는 PortOne 슬롯용이었고 지금은 어떤 코드도 값을 쓰지 않는다(마이그레이션은 수정하지 않는다). 운영 DB 변경은 금지한다.

## 검증 명령

```powershell
npm run typecheck
npm test
npm run build
npm run verify:seo
node scripts/verify-staging-home.mjs
```

실제 계정/CD 결제/LLM E2E 완료 여부는 위 명령의 통과와 별개다. 실시간 검증 기록은 `.integration/`에 보관하고 최종 보고에 배포 SHA와 함께 명시한다.

## 기존 키 재사용과 법적 확인

사용자는 기존 심사가 유료 운세 판매를 포함한다고 확인했다. 같은 사업자·도메인의 일반 단건 운세라는 전제에서 CD 기존 결제(상점·채널)를 그대로 쓴다. 이는 법적 적합성에 대한 확정 의견이나 개별 PG 계약 검토 완료를 의미하지 않는다.

- PG 계약의 서비스 범위·URL 변경 통지 의무는 CD 결제 문서에서 관리한다. 영냥이 전용 신규 신청·계약 변경은 하지 않는다.
- [전자상거래법 제13조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1027062829)에 따라 사업자 신원, 가격·공급 방식과 시기, 약관·철회·환불 및 분쟁처리 안내가 필요하다. 사이트 고지 외에도 계약내용 교부 흐름은 운영 전에 확인해야 한다.
- [제17조](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1022341869)의 디지털 콘텐츠 철회 제한은 법정 요건이 있다. 생성·열람만으로 자동 환불 불가라고 주장하지 않도록 안내를 수정했다.
- 개인정보 안내의 과거 "저장하지 않는 준비 기능" 설명을 실제 서버 저장에 맞췄다. Cloudflare/Google Gemini 처리, 국외 이전의 적법 근거·고지, 보유기간·삭제 운영절차의 최종 확정은 운영 공개 전 남은 사항이다. 이번에 확인되지 않은 정책을 새로 약속하지 않는다.

법적 검토와 별도로 실제 결제 성공 여부는 테스트로 입증한다. production 배포 및 운영 판매는 별도 사용자 명시 승인이 필요하다.

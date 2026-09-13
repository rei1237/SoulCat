# SoulCat staging 로그인·결제 검증

## 범위

- 대표 경로: `/yeongnyangi/`; 모든 서비스 화면·법적 안내·SEO는 하위 경로에 있다.
- API `/api/yeongnyangi/*`, 공유 `/share/yeongnyangi/*`, 에셋 `/_soulcat/*`는 유지한다.
- 구 `/fortune/`, `/room/`, `/library/`, `/_soulcat` 진입은 쿼리를 보존해 새 경로로 이동한다. 기존 루트·운세 하위 기능·인증·결제 API는 통과시킨다.
- 정식 canonical은 `https://code-destiny.com/yeongnyangi/`. 이번 후보는 staging/Pages 미리보기용으로 HTML·HTTP에서 noindex다. 운영 전환은 별도 변경·승인이다.
- 기존 인증 Service Binding을 재사용하고 SoulCat D1·주문·권한은 분리한다.

## 현재 설정과 검증 절차

PortOne 콘솔에서 기존 카드 KG이니시스 `inicis_v2`, 카카오페이 `kakaopay` 실연동과 일반결제 계약 완료를 확인했다. 기존 `.env.local`의 상점·채널 식별자와 대조한 뒤 SoulCat staging secrets만 등록했다. 기존 운영 webhook은 변경하지 않았다. 각 주문의 SDK `noticeUrls`에 SoulCat staging webhook을 서버에서 지정한다.

1. 각 provider에서 사용자가 직접 로그인한다. 홈 하단의 로그인 상태, POST session 200, library 200, 재접속·새 탭·로그아웃을 확인한다. 비로그인은 401이며 소유권 없는 결과는 거부되어야 한다.
2. 검증 계정의 서버 확인된 `codedestiny:<id>`를 로컬 activation 파일의 `STAGING_TEST_USER_IDS`에 넣는다. ID나 비밀키를 Git에 기록하지 않는다.
3. `scripts/staging-activation.mjs` 계약대로 단일 상품 `saju_mackerel`, 실행 ID `soulcat-login-payment-20260913`, `LLM_STAGING_VALIDATION_MANIFEST=destiny-book-v4` 및 유효한 가격·예산을 준비한다. 기존 실제 검증 기록은 v3이므로 v4 검증 완료로 재사용하지 않는다. 이 설정은 승인된 두 주문의 시험 생성만 허용하며 운영 품질 검증 선언이 아니다. 테스트 누적/일 예산은 각 1,000원 이하이며 기존 원장 사용분을 포함한다.
4. 깨끗한 커밋에서 build → SEO 검증 → Pages preview 전용 업로드 → 고정 preview SHA/sourceDigest 확인 → `node scripts/deploy-staging.mjs <immutable-preview-url> <local-activation-file>` 순서다. activation 파일을 생략하면 결제·실제 AI를 비활성화한다.
5. 카드 1,000원 1회 → 실제 결과 5챕터·보관함·webhook 확인 → 해당 주문 전액 취소·권한/공유 철회 → 카카오페이 1,000원 1회를 같은 순서로 검증한다. 카드와 카카오 각각 한 주문 슬롯이며 취소되어도 재사용할 수 없다. 중단된 결제는 기존 paymentId로 이어간다.
6. 각 이벤트의 주문·PG·권한 상태와 SHA를 값이 노출되지 않는 로컬 증거 파일에 기록한다. OTP·카드 인증은 사용자가 직접 입력한다.
7. 완료 또는 중단 시 미완료 결제의 실제 PG 상태부터 확인한다. 승인된 두 주문의 취소를 확인한 뒤 activation 파일 없이 동일 후보를 재배포해 비활성화한다. 미완료 실결제 결과를 mock으로 채우지 않도록 worker가 차단한다.

`server/db/migrations/0006_free_fortune.sql`, `0007_staging_payment_validation.sql`은 staging에만 적용했다. 0007의 유일 인덱스가 동시에 들어온 요청도 결제수단별 한 주문으로 제한한다. 운영 DB 변경은 금지한다.

## 검증 명령

```powershell
npm run typecheck
npm test
npm run build
npm run verify:seo
node scripts/verify-staging-home.mjs
```

실제 계정/PG/LLM E2E 완료 여부는 위 명령의 통과와 별개다. 실시간 검증 기록은 `.integration/`에 보관하고 최종 보고에 배포 SHA와 함께 명시한다.

## 기존 키 재사용과 법적 확인

사용자는 기존 심사가 유료 운세 판매를 포함한다고 확인했다. 같은 사업자·도메인의 일반 단건 운세라는 전제에서 기존 상점 재사용을 진행한다. 이는 법적 적합성에 대한 확정 의견이나 개별 PG 계약 검토 완료를 의미하지 않는다.

- [PortOne 서비스 추가 안내](https://help.portone.io/category/procedure/service-addition)는 다른 업종·품목과 다른 결제 방식의 추가 심사를 설명한다. 실제 계약의 URL 변경 통지 의무와 서비스 범위는 운영 판매 전 최종 확인해야 한다. 신규 신청·계약 변경을 임의로 제출하지 않는다.
- [전자상거래법 제13조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1027062829)에 따라 사업자 신원, 가격·공급 방식과 시기, 약관·철회·환불 및 분쟁처리 안내가 필요하다. 사이트 고지 외에도 계약내용 교부 흐름은 운영 전에 확인해야 한다.
- [제17조](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1022341869)의 디지털 콘텐츠 철회 제한은 법정 요건이 있다. 생성·열람만으로 자동 환불 불가라고 주장하지 않도록 안내를 수정했다.
- 개인정보 안내의 과거 "저장하지 않는 준비 기능" 설명을 실제 서버 저장에 맞췄다. Cloudflare/Google Gemini 처리, 국외 이전의 적법 근거·고지, 보유기간·삭제 운영절차의 최종 확정은 운영 공개 전 남은 사항이다. 이번에 확인되지 않은 정책을 새로 약속하지 않는다.

법적 검토와 별도로 실제 결제 성공 여부는 테스트로 입증한다. production 배포 및 운영 판매는 별도 사용자 명시 승인이 필요하다.

# Code Destiny / 영냥이 분리 운영 인계

## 승인 경계

운영 배포·운영 라우트·실결제는 승인되지 않았다. `ALLOW_LIVE_LLM=false`, 모든 상품 `enabled=false`를 유지한다.
영냥이 결제는 Code Destiny 결제창(`/checkout/?featureKey=yeongnyangi-…`)에서만 일어난다.
이 워커는 PG를 직접 다루지 않으며 CD 증빙 API(`yeongnyangi-entitlement`)로 권리를 부여한다. 별도 PG 계약·MID·PortOne 연동은 폐기했다.

## 구조와 경로

기존 `rei1237/codedestiny`와 `rei1237/SoulCat`은 별도 저장소다.
기존 Pages/DNS/API/MongoDB/결제/약관은 유지한다. 영냥이는 독립 Worker/D1을 사용한다.

| 경로 | 소유자 |
|---|---|
| `/`, 기존 `/fortune/…`, 기존 `/api/*` | 기존 Code Destiny |
| `/fortune/`, `/room/`, `/library/` | 영냥이 정확한 pathname만 |
| `/api/yeongnyangi/*` | 영냥이 API |
| `/_soulcat/_next/static/*`, `/_soulcat/assets/*`, `/_soulcat/ephe/*` | 고정 Pages 배포 자산 |
| `/_soulcat/version.json` | 고정 Pages SHA |
| `/terms/`, `/privacy/`, `/refund/` | 기존 문서 및 canonical 유지 |

접두 Worker route에 걸린 다른 경로는 원래 origin으로 통과한다. slash 301은 query를
보존한다. 정적 upstream에는 cookie·authorization·query를 전달하지 않는다.
모든 영냥이 화면은 noindex이고 기존 sitemap/robots를 대체하지 않는다.
앱 사이 이동은 일반 상대경로 링크다. 분석 SDK를 추가하지 않아 pageview를 중복 발행하지 않는다.

## 인증과 상품

Service Binding으로 기존 `/api/auth/me`만 호출한다. 기존 쿠키 중 인증 쿠키만 전달하고
사용자 ID는 서버 응답에서 검증한다. JWT/Atlas 비밀값은 복제하지 않는다.
DB 장애 시 token fallback 응답은 차단한다. 기존 쿠키 domain/path/SameSite는 변경하지 않는다.
staging binding은 `code-destiny-web-staging`이며 운영 binding과 분리된다.
D1 사용자 키는 `codedestiny:<검증된 ID>`로 임시 preview 사용자와 분리한다.
기존 이용권·월정석·주문·결과는 이관하지 않는다.

5개 운세 체계의 상담 상품은 서버 catalog에 있는 고등어 1,000원, 연어 3,000원,
광어 5,000원, 참치 10,000원이다. 충전 화폐가 아니며 기존 이용권·월정석이 적용되지 않는다.
주문·권리 부여는 `POST orders`가 CD 증빙을 조회·소비한 뒤 `grantProofOrder`로 처리한다(payments id `cd:<proofId>`).
취소·환불·실 PG 웹훅은 CD 결제 정책과 CD 워커가 맡고, 이 워커에는 결제 웹훅·PG 조회 경로가 없다.

## Cloudflare 준비 상태

- SoulCat Pages: main 자동 운영 배포를 대시보드에서 비활성화했다. preview 자동 배포는 유지한다.
- staging 전용 D1 `soulcat-fortune-staging`을 생성하고 0001 migration만 적용했다.
- `wrangler.worker.jsonc`: workers.dev 및 preview_urls 비활성화, staging 기존 도메인 경로만 등록.
- production 환경은 routes와 DB가 없으므로 승인 후 별도 운영 설정이 필요하다.
- 정적 origin은 8자리 불변 Pages 배포 ID로만 지정한다. rolling alias는 런타임이 거부한다.
- 운영 DNS·기존 Worker·기존 DB·운영 키는 변경하지 않는다.

## 재현 및 staging 전달

```powershell
npm ci
npm run typecheck
npm test
npm run test:domains
npm run build
npx wrangler deploy --config wrangler.worker.jsonc --env staging --dry-run --outdir .integration/worker
# 검증·커밋 후 다시 build하여 HEAD를 version.json에 기록한다.
npm run build
# 반드시 main이 아닌 preview branch를 사용한다.
npx wrangler pages deploy out --project-name soulcat --branch integration-preview --commit-dirty=false
# 위 명령으로 나온 불변 URL을 아래 인자로 사용한다.
node scripts/deploy-staging.mjs https://DEPLOYMENT_ID.soulcat.pages.dev
```

배포 스크립트는 clean tree, Pages SHA=HEAD, 실 LLM off 기본값, staging route/service를 확인한다.
릴리스 증거에는 SoulCat SHA/Pages ID/Worker version과 기존 저장소 Pages/Worker SHA를 각각 기록한다.
preview 성공을 운영 배포 성공으로 보고하지 않는다. 실제 모바일, 로그인된 사용자,
실결제(CD 결제창 경유), 운영 DB는 별도 증거 없이는 검증하지 못함으로 기록한다.

## 별도 PG 신청 (폐기)

영냥이 전용 KG이니시스 계약/MID를 위한 PortOne 신규 신청은 최종 확인 화면에서 제출하지 않았고, 이후 결제를 CD 결제창으로 일원화하면서 폐기했다.
워커의 PortOne 코드·SDK·`PAYMENTS_ENABLED`·activation 결제 항목은 제거했다. `PORTONE_*` staging secret 삭제는 사용자 1회 승인 후 별도로 진행한다.
새 PG 계약·신청·서류 업로드·본인 인증은 자동 진행하지 않으며, 필요해지면 사용자 명시 승인이 있는 별도 변경으로 다룬다.

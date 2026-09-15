import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {sourceRelease} from './source-release.mjs';
// deploy-staging.mjs 와 같은 고정 Pages preview 계약. 격리 검사는 운영 쪽으로 반전한다.
const pin = process.argv[2];
if (!/^https:\/\/[a-f0-9]{8}\.soulcat\.pages\.dev$/.test(pin || ""))
  throw new Error("Supply the verified immutable SoulCat Pages preview URL.");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain")) throw new Error("Commit and verify the working tree first.");
const sha = git("rev-parse", "HEAD");
const config = JSON.parse(readFileSync("wrangler.worker.jsonc", "utf8"));
const prod = config.env.production;
const db = prod.d1_databases?.[0];
const queues = [...(prod.queues?.producers || []), ...(prod.queues?.consumers || [])];
if (prod.name !== "soulcat-service-production" || prod.vars.APP_ENV !== "production" || prod.vars.PUBLIC_ORIGIN !== "https://code-destiny.com" ||
    !prod.routes?.length || prod.routes.some(r => !r.pattern.startsWith("code-destiny.com/") || r.zone_name !== "code-destiny.com") ||
    !prod.services?.length || prod.services.some(s => s.service.includes("staging")) ||
    prod.d1_databases.length !== 1 || db.database_name !== "soulcat-fortune-production" || !/^[0-9a-f-]{36}$/.test(db.database_id || "") ||
    // 기존 soulcat-fortune(172413ab…)과 staging D1 은 재사용하지 않는다.
    db.database_id.startsWith("172413ab") || config.env.staging.d1_databases.some(d => d.database_id === db.database_id) ||
    !queues.length || queues.some(q => q.queue !== "soulcat-book-production" || (q.dead_letter_queue && q.dead_letter_queue !== "soulcat-book-production-dlq")))
  throw new Error("Production isolation failed");
if (prod.vars.ALLOW_LIVE_LLM !== "false" || prod.vars.LLM_PROVIDER !== "mock") throw new Error("Keep committed defaults disabled");
const version = await fetch(`${pin}/version.json`).then(r => {
  if (!r.ok) throw new Error("Pages version unavailable");
  return r.json();
});
if (version.sha !== sha) throw new Error("Pages SHA mismatch");
if (version.dirty || version.sourceDigest !== sourceRelease().sourceDigest) throw new Error("Pages source content mismatch");
// 정적 HTML 의 로그인 링크는 빌드 시 NEXT_PUBLIC_CODE_DESTINY_ORIGIN 으로 굳는다. 없으면 staging 으로 폴백한다.
const home = await fetch(`${pin}/yeongnyangi/`).then(r => {
  if (!r.ok) throw new Error("Pages home unavailable");
  return r.text();
});
if (home.includes("staging.code-destiny.com")) throw new Error("Pages build points at staging; rebuild with NEXT_PUBLIC_CODE_DESTINY_ORIGIN=https://code-destiny.com");
// Activation settings are read from a local file, never command-line secrets or Git.
const extraVars = [];
const activationFile = process.argv[3];
if (activationFile) {
  const {validateProductionActivation} = await import('./production-activation.mjs');
  const activation = JSON.parse(readFileSync(activationFile, 'utf8'));
  validateProductionActivation(activation);
  for (const [key,value] of Object.entries(activation)) extraVars.push('--var', `${key}:${value}`);
}
execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "deploy", "--config", "wrangler.worker.jsonc", "--env", "production",
  ...extraVars, "--var", `RELEASE_SHA:${sha}`, "--var", `RELEASE_SOURCE_DIGEST:${version.sourceDigest}`, "--var", `SOULCAT_PAGES_ORIGIN:${pin}`], { stdio: "inherit" });

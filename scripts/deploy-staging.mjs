import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {sourceRelease} from './source-release.mjs';
const pin = process.argv[2];
if (!/^https:\/\/[a-f0-9]{8}\.soulcat\.pages\.dev$/.test(pin || ""))
  throw new Error("Supply the verified immutable SoulCat Pages preview URL.");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain")) throw new Error("Commit and verify the working tree first.");
const sha = git("rev-parse", "HEAD");
const version = await fetch(`${pin}/version.json`).then(r => {
  if (!r.ok) throw new Error("Pages version unavailable");
  return r.json();
});
if (version.sha !== sha || version.paymentsEnabled !== false) throw new Error("Pages SHA/payment gate mismatch");
if(version.dirty || version.sourceDigest!==sourceRelease().sourceDigest)throw new Error('Pages source content mismatch');
const config = JSON.parse(readFileSync("wrangler.worker.jsonc", "utf8"));
const stage = config.env.staging;
if (stage.vars.PAYMENTS_ENABLED !== "false" || stage.vars.ALLOW_LIVE_LLM !== "false" ||
    stage.routes.some(r => !r.pattern.startsWith("staging.code-destiny.com/")) ||
    stage.services.some(s => !s.service.endsWith("-staging"))) throw new Error("Staging isolation failed");
execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "deploy", "--config", "wrangler.worker.jsonc", "--env", "staging",
  "--var", `RELEASE_SHA:${sha}`, "--var", `RELEASE_SOURCE_DIGEST:${version.sourceDigest}`, "--var", `SOULCAT_PAGES_ORIGIN:${pin}`], { stdio: "inherit" });

// Optional local launcher. Only the two named KASI settings enter the child process.
import fs from "node:fs";
import { spawn } from "node:child_process";
const osKeys =
  /^(path|pathext|systemroot|windir|comspec|temp|tmp|userprofile|appdata|localappdata|homedrive|homepath|programfiles|programfiles\(x86\)|programdata|processor_architecture|number_of_processors)$/i;
const env = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => osKeys.test(key)),
  ),
  LLM_PROVIDER: "mock",
  ALLOW_LIVE_LLM: "false",
};
const entries = [];
for (const line of fs
  .readFileSync("D:/Development/code-destiny/.env.local", "utf8")
  .split(/\r?\n/)) {
  const m = line.match(/^\s*(KASI_SERVICE_KEY|KASI_API_BASE_URL)\s*=\s*(.*)$/);
  if (m) entries.push([m[1], m[2].trim().replace(/^(['"])(.*)\1$/, "$2")]);
}
// Wrangler reads environment secrets through CLOUDFLARE_INCLUDE_PROCESS_ENV.
for (const [key, value] of entries) env[key] = value;
env.CLOUDFLARE_INCLUDE_PROCESS_ENV = "true";
const child = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "pages",
    "dev",
    "out",
    "--port",
    "8790",
    "--ip",
    "127.0.0.1",
    "--binding",
    "APP_ENV=local",
  ],
  { env, stdio: "inherit" },
);
child.on("exit", (code) => (process.exitCode = code ?? 1));

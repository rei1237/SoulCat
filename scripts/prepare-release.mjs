import { cp, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {sourceRelease} from './source-release.mjs';

const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const output = process.argv[2] || 'out';
await mkdir(`${output}/_soulcat`, { recursive: true });
for (const folder of ["_next", "assets", "ephe"]) {
  await cp(`${output}/${folder}`, `${output}/_soulcat/${folder}`, { recursive: true });
}
await writeFile(`${output}/version.json`, JSON.stringify({ ...sourceRelease(), service: "soulcat" }) + "\n");
await writeFile(`${output}/_headers`, [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  X-Robots-Tag: noindex, nofollow",
  "/yeongnyangi/library/*",
  "  X-Robots-Tag: noindex, nofollow",
  "/share/*",
  "  X-Robots-Tag: noindex, nofollow",
  "/api/*",
  "  X-Robots-Tag: noindex, nofollow",
  "",
].join("\n"));
console.log(`SoulCat static release prepared: ${sha}`);

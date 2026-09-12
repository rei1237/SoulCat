import { cp, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
await mkdir("out/_soulcat", { recursive: true });
for (const folder of ["_next", "assets", "ephe"]) {
  await cp(`out/${folder}`, `out/_soulcat/${folder}`, { recursive: true });
}
await writeFile("out/version.json", JSON.stringify({ sha, service: "soulcat", paymentsEnabled: false }) + "\n");
await writeFile("out/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n");
console.log(`SoulCat static release prepared: ${sha}`);

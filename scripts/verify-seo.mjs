import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const output = process.argv[2] || "out";
const required = [
  "index.html",
  "fortune/index.html",
  "free-fortune/index.html",
  "1000-won-fortune/index.html",
  "saju/index.html",
  "sukuyo/index.html",
  "ziwei/index.html",
  "vedic/index.html",
  "astrology/index.html",
  "yeongnyangi/index.html",
  "sitemap.xml",
  "robots.txt",
  "_headers",
];

const failures = [];
for (const file of required) {
  if (!existsSync(`${output}/${file}`)) failures.push(`missing ${file}`);
}

async function text(file) {
  return readFile(`${output}/${file}`, "utf8");
}

if (existsSync(`${output}/_headers`)) {
  const headers = await text("_headers");
  if (/^\/\*\s*[\r\n]\s*X-Robots-Tag:\s*noindex/im.test(headers)) {
    failures.push("_headers applies noindex to every route");
  }
  if (!/\/share\/\*/.test(headers) || !/X-Robots-Tag:\s*noindex, nofollow/i.test(headers)) {
    failures.push("_headers must keep share pages noindex");
  }
}

for (const file of required.filter((name) => name.endsWith("index.html"))) {
  if (!existsSync(`${output}/${file}`)) continue;
  const html = await text(file);
  if (!/<link rel="canonical"/.test(html)) failures.push(`${file} has no canonical`);
  if (/<meta name="robots" content="noindex/.test(html)) {
    failures.push(`${file} is unexpectedly noindex`);
  }
  if (!/<meta (name|property)="og:title"|<meta property="og:title"/.test(html)) {
    failures.push(`${file} has no Open Graph title`);
  }
}

if (existsSync(`${output}/sitemap.xml`)) {
  const sitemap = await text("sitemap.xml");
  for (const path of ["/free-fortune/", "/1000-won-fortune/", "/saju/", "/yeongnyangi/"]) {
    if (!sitemap.includes(path)) failures.push(`sitemap missing ${path}`);
  }
}

if (existsSync(`${output}/robots.txt`)) {
  const robots = await text("robots.txt");
  if (!/Sitemap:/i.test(robots)) failures.push("robots.txt missing sitemap");
  if (!/Disallow:\s*\/share\//i.test(robots)) failures.push("robots.txt must disallow /share/");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("SEO release checks passed.");

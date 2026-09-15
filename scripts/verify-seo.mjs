import { readFile,stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=process.argv[2]||'out';
assert.ok((await stat(`${output}/assets/og-yeongnyangi.jpg`)).size > 1000);
// Legal copies canonicalize to the Code Destiny documents and stay out of the sitemap.
const legalCanonical={'terms/':'terms/','privacy/':'privacy/','refund/':'refund-policy/'};
const routes=['','fortune/','room/','1000-won-fortune/','free-fortune/','saju/','sukuyo/','ziwei/','vedic/','astrology/','tarot/','about/','ggulggul-fortune/','terms/','privacy/','refund/','contact/'];
for(const route of routes){
  const path=`yeongnyangi/${route}index.html`;
  const html=await readFile(`${output}/${path}`,'utf8');
  const canonical=legalCanonical[route]?`https://code-destiny.com/${legalCanonical[route]}`:`https://code-destiny.com/yeongnyangi/${route}`;
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}"`),`${path}: canonical`);
  // Staging stays noindex through the edge X-Robots-Tag header, not page metadata.
  assert.doesNotMatch(html,/<meta name="robots" content="noindex/,`${path}: robots meta must allow indexing`);
  assert.match(html,/<meta property="og:title"/);
  assert.match(html,/og-yeongnyangi.jpg/);
  assert.ok(!html.includes('soulcat.pages.dev'),`${path}: preview canonical leak`);
}
assert.match(await readFile(`${output}/yeongnyangi/library/index.html`,'utf8'),/<meta name="robots" content="noindex/);
const sitemap=await readFile(`${output}/yeongnyangi/sitemap.xml`,'utf8');
for(const route of ['','fortune/','room/','1000-won-fortune/','free-fortune/','saju/','about/','contact/'])assert.ok(sitemap.includes(`<loc>https://code-destiny.com/yeongnyangi/${route}</loc>`),`sitemap: ${route}`);
for(const route of ['library/','ggulggul-fortune/','terms/','privacy/','refund/'])assert.ok(!sitemap.includes(`/yeongnyangi/${route}`),`sitemap must exclude ${route}`);
const robots=await readFile(`${output}/yeongnyangi/robots.txt`,'utf8');
assert.doesNotMatch(robots,/Disallow: \/\s/);
assert.match(robots,/Sitemap: https:\/\/code-destiny\.com\/yeongnyangi\/sitemap\.xml/);
assert.match(await readFile(`${output}/_headers`,'utf8'),/X-Robots-Tag: noindex, nofollow/);
console.log('SoulCat namespace, canonical, sitemap, OG and index policy verified.');

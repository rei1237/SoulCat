import { readFile,stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=process.argv[2]||'out';
assert.ok((await stat(`${output}/assets/og-yeongnyangi.jpg`)).size > 1000);
const routes=['','fortune/','room/','1000-won-fortune/','free-fortune/','saju/','sukuyo/','ziwei/','vedic/','astrology/','tarot/','about/','terms/','privacy/','refund/','contact/'];
for(const route of routes){
  const path=`yeongnyangi/${route}index.html`;
  const html=await readFile(`${output}/${path}`,'utf8');
  assert.ok(html.includes(`<link rel="canonical" href="https://code-destiny.com/yeongnyangi/${route}"`),`${path}: canonical`);
  assert.match(html,/<meta name="robots" content="noindex/);
  assert.match(html,/<meta property="og:title"/);
  assert.match(html,/og-yeongnyangi.jpg/);
  assert.ok(!html.includes('soulcat.pages.dev'),`${path}: preview canonical leak`);
}
const sitemap=await readFile(`${output}/yeongnyangi/sitemap.xml`,'utf8');
for(const route of ['','1000-won-fortune/','saju/'])assert.ok(sitemap.includes(`https://code-destiny.com/yeongnyangi/${route}`));
assert.ok(!sitemap.includes('/library/'));
assert.match(await readFile(`${output}/yeongnyangi/robots.txt`,'utf8'),/Disallow: \/\s/);
assert.match(await readFile(`${output}/_headers`,'utf8'),/X-Robots-Tag: noindex, nofollow/);
console.log('SoulCat namespace, canonical, sitemap, OG and staging noindex verified.');

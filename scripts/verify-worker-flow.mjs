import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:8790';
const token = randomBytes(32).toString('hex'), hash = createHash('sha256').update(token).digest('hex');
const id = `test-${Date.now()}`;
const p = { birthDate: '1997-02-10', birthTime: '14:30', gender: 'female', calendarType: 'solar', birthPlace: { latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' } };
let sql = `INSERT INTO users VALUES ('${id}',${Date.now()});\nINSERT INTO sessions VALUES ('${hash}','${id}',${Date.now() + 3600000});\n`;
const domains = ['saju','sukuyo','vedic','astrology','ziwei'];
for (const d of domains) {
  const key = `${id}-${d}`;
  sql += `INSERT INTO profiles VALUES ('${key}','${id}','${d}','${JSON.stringify({ personA: p, personB: { ...p, birthDate: '1992-06-12' }, question: '개발용 검증' })}',${Date.now()});\n`;
  sql += `INSERT INTO orders VALUES ('${key}','${id}','${key}','${d}_mackerel',1000,'KRW','${key}','${key}','PAID',${Date.now()});\n`;
  sql += `INSERT INTO entitlements VALUES ('${key}','${key}','${id}','${d}_mackerel','ACTIVE',${Date.now()});\n`;
}
await fs.mkdir('.wrangler', { recursive: true });
await fs.writeFile('.wrangler/mock-flow.sql', sql);
execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--file', '.wrangler/mock-flow.sql'], { stdio: 'pipe' });
const headers = { cookie: `soulcat_session=${token}`, origin: base, 'content-type': 'application/json' };
const proof = [];
for (const d of domains) {
  const response = await fetch(`${base}/api/fortune/generate`, { method: 'POST', headers, body: JSON.stringify({ productId: `${d}_mackerel`, profileId: `${id}-${d}` }) });
  assert.equal(response.status, 202, await response.clone().text());
  const pending = await response.json();
  let status;
  for (let attempt = 0; attempt < 40; attempt++) {
    status = await (await fetch(`${base}/api/fortune/status?id=${pending.id}`, { headers })).json();
    if (status.result || ['FAILED','UNCERTAIN'].includes(status.status)) break;
    await new Promise(r => setTimeout(r, 250));
  }
  assert.equal(status.status, 'SUCCEEDED', `${d}: ${JSON.stringify(status)}`);
  assert.match(status.result.title, /개발 검증용/);
  const denied = await fetch(`${base}/api/fortune/status?id=${pending.id}`);
  assert.equal(denied.status, 401);
  proof.push({ domain: d, persisted: true, privateResult: true, provider: 'mock' });
}
await fs.writeFile('docs/worker-flow-verification.json', JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof));

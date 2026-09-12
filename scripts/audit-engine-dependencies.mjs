import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = 'D:/Development/code-destiny';
const files = new Set(), external = new Set();
function walk(relative) {
  relative = relative.replaceAll('\\', '/');
  if (files.has(relative)) return;
  files.add(relative);
  const content = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const m of content.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (m[1].startsWith('.')) {
      const next = path.normalize(path.join(path.dirname(relative), m[1]));
      if (fs.existsSync(path.join(root, next))) walk(next); else external.add(m[1]);
    } else external.add(m[1]);
  }
}
['worker/lib/life-book-ai-saju.js', 'worker/lib/ziwei-ai-chart.js', 'worker/lib/sukuyo-astronomy.js', 'worker/lib/sukuyo-relation-core.js', 'worker/lib/vedic-ai-chart.js'].forEach(walk);
if (process.argv.includes('--extract')) {
  const manifest = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file));
    const dest = path.join('server/vendor/code-destiny', file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
    manifest.push({ file, sha256: createHash('sha256').update(content).digest('hex') });
  }
  fs.writeFileSync('server/vendor/code-destiny/package.json', JSON.stringify({ type: 'module', private: true }));
  fs.writeFileSync('docs/engine-provenance.json', JSON.stringify({ source: root, sourceCommit: '09544df6453584376931d695b53c5a7d27bd0143', files: manifest }, null, 2));
  console.log(`Extracted ${manifest.length} unchanged source files.`);
} else console.log(JSON.stringify({ files: [...files], external: [...external] }, null, 2));

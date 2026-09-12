import fs from 'node:fs';
// Install only the runtime files needed for the supported contemporary date range.
for (const file of ['seas_18.se1', 'sepl_18.se1', 'semo_18.se1', 'sefstars.txt']) {
  fs.mkdirSync('public/ephe', { recursive: true });
  const source = `D:/Development/code-destiny/public/ephe/${file}`;
  fs.copyFileSync(source, `public/ephe/${file}`);
}
for (const dir of ['public/js/vendor/sweph-wasm/wasm', 'server/vendor/code-destiny/public/js/vendor/sweph-wasm/wasm']) {
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync('node_modules/sweph-wasm/dist/wasm/swisseph.wasm', `${dir}/swisseph.wasm`);
}
fs.copyFileSync('node_modules/sweph-wasm/LICENSE', 'public/ephe/SWISS-LICENSE.txt');

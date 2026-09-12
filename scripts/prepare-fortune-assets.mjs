import sharp from 'sharp';
import fs from 'node:fs';
const root = 'C:/Users/user/Desktop/사주보는 고양이 영냥이';
const files = {
  'fish/mackerel': '가격별생선/고등어-Photoroom.webp',
  'fish/salmon': '가격별생선/연어-Photoroom.webp',
  'fish/flounder': '가격별생선/광어-Photoroom.webp',
  'fish/tuna': '가격별생선/참치-Photoroom.webp',
  'fortune/saju': '각 운세 진입화면/사주 진입.webp',
  'fortune/sukuyo': '각 운세 진입화면/숙요 진입.webp',
  'fortune/vedic': '각 운세 진입화면/베다 진입.webp',
  'fortune/astrology': '각 운세 진입화면/점성술 진입.webp',
  'fortune/ziwei': '각 운세 진입화면/자미두수 진입.webp',
  'fortune/love': '카테고리별운세/연애운 카테고리.webp',
  'fortune/work': '카테고리별운세/직업운 카테고리.webp',
  'fortune/money': '카테고리별운세/재물운 카테고리.webp',
  'fortune/luck': '각운세보는영냥이/영냥이 사주보는 대운.webp',
  'fortune/loading': '각운세보는영냥이/영냥이 사주보는 2.webp',
};
const manifestPath = 'docs/fortune-asset-manifest.json';
const illustrationsOnly = process.argv.includes('--illustrations-only');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
function record(entry) {
  const index = manifest.findIndex(item => item.output === entry.output);
  if (index === -1) manifest.push(entry);
  else manifest[index] = entry;
}
for (const [id, relative] of Object.entries(illustrationsOnly ? {} : files)) {
  const output = `public/assets/${id}.webp`;
  fs.mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
  const meta = await sharp(`${root}/${relative}`).resize(id.startsWith('fish') ? 240 : 560, undefined, { withoutEnlargement: true }).webp({ quality: 82 }).toFile(output);
  record({ source: `${root}/${relative}`, output, width: meta.width, height: meta.height });
}
// Generated artwork has separate, versioned inputs. Legacy preparation cannot
// overwrite these derivatives with the former illustrated UI cards.
const generation = JSON.parse(fs.readFileSync('docs/fortune-art-originals/prompts.json', 'utf8'));
for (const [id, prompt] of Object.entries(generation.prompts)) {
  const source = `docs/fortune-art-originals/${id}.png`;
  const output = `public/assets/fortune/${id}-illustration.webp`;
  const original = await sharp(source).metadata();
  const meta = await sharp(source).resize(560, 560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(output);
  record({ source, output, width: meta.width, height: meta.height, bytes: meta.size,
    generated: true, tool: generation.tool, reference: generation.reference,
    originalWidth: original.width, originalHeight: original.height, prompt });
  fs.writeFileSync(`${output}.json`, JSON.stringify({ source, reference: generation.reference, prompt }, null, 2));
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

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
const manifest = [];
for (const [id, relative] of Object.entries(files)) {
  const output = `public/assets/${id}.webp`;
  fs.mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
  const meta = await sharp(`${root}/${relative}`).resize(id.startsWith('fish') ? 240 : 560, undefined, { withoutEnlargement: true }).webp({ quality: 82 }).toFile(output);
  manifest.push({ source: `${root}/${relative}`, output, width: meta.width, height: meta.height });
}
fs.writeFileSync('docs/fortune-asset-manifest.json', JSON.stringify(manifest, null, 2));

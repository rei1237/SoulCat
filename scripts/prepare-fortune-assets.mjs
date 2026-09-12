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
const loadingFiles = {
  'fortune/loading-default': {
    source: '각운세보는영냥이/신들린 영냥이4-Photoroom.webp',
  },
  'fortune/loading-saju': {
    source: '각운세보는영냥이/영냥이 사주보는 3.webp',
    crop: [0, 0, 255, 264],
  },
  'fortune/loading-sukuyo': {
    source: '각운세보는영냥이/타로보는 영냥이4-Photoroom.webp',
  },
  'fortune/loading-vedic': {
    source: '각운세보는영냥이/신들린 영냥이4-Photoroom.webp',
  },
  'fortune/loading-astrology': {
    source: '각운세보는영냥이/점성술보는 영냥이4.webp',
    crop: [0, 0, 463, 354],
  },
  'fortune/loading-ziwei': {
    source: '각운세보는영냥이/자미두수보는 영냥이4.webp',
    crop: [0, 0, 511, 366],
  },
  'fortune/loading-love': {
    source: '각운세보는영냥이/타로보는 영냥이4-Photoroom.webp',
  },
  'fortune/loading-luck': {
    source: '각운세보는영냥이/영냥이 사주보는 대운.webp',
    crop: [0, 0, 255, 264],
  },
  'fortune/loading-work': {
    source: '각운세보는영냥이/핵심 포인트 짚는 영냥이.webp',
    crop: [0, 0, 283, 286],
  },
  'fortune/loading-money': {
    source: '각운세보는영냥이/주산하는 영냥이-Photoroom.webp',
  },
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
for (const [id, config] of Object.entries(illustrationsOnly ? {} : loadingFiles)) {
  const output = `public/assets/${id}.webp`;
  fs.mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
  let pipeline = sharp(`${root}/${config.source}`);
  if (config.crop) {
    pipeline = pipeline.extract({
      left: config.crop[0],
      top: config.crop[1],
      width: config.crop[2],
      height: config.crop[3],
    });
  }
  const meta = await pipeline
    .resize(520, 520, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 84, effort: 5 })
    .toFile(output);
  record({
    source: `${root}/${config.source}`,
    output,
    width: meta.width,
    height: meta.height,
    bytes: meta.size,
    crop: config.crop || null,
    loading: true,
  });
  fs.writeFileSync(
    `${output}.json`,
    JSON.stringify(
      {
        source: `${root}/${config.source}`,
        crop: config.crop || null,
        prompt: 'User-supplied artwork. Mechanical crop/resize only. No image generation. White fur is preserved.',
      },
      null,
      2,
    ),
  );
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

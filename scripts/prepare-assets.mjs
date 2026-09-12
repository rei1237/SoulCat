import sharp from "sharp";
import { mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const source =
  process.env.SOULCAT_ASSET_DIR ||
  "C:/Users/user/Desktop/사주보는 고양이 영냥이";
const output = path.resolve("public/assets");
await mkdir(output, { recursive: true });
await mkdir("docs", { recursive: true });
const manifest = [];
async function asset(name, file, width, crop, canvas) {
  let pipeline = sharp(path.join(source, file));
  if (crop)
    pipeline = pipeline.extract({
      left: crop[0],
      top: crop[1],
      width: crop[2],
      height: crop[3],
    });
  const origin = `User-supplied artwork: ${file}; mechanical crop ${JSON.stringify(crop || null)} and resize only; no generated art.`;
  await pipeline
    .resize(canvas ? { width: canvas[0], height: canvas[1], fit: "contain", background: "#ffffff", withoutEnlargement: true } : { width, withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .withXmp(
      `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" dc:source="${origin.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"/></rdf:RDF></x:xmpmeta>`,
    )
    .toFile(path.join(output, name + ".webp"));
  const meta = await sharp(path.join(output, name + ".webp")).metadata();
  manifest.push({
    file: name + ".webp",
    source: file,
    crop: crop || null,
    width: meta.width,
    height: meta.height,
    bytes: (await stat(path.join(output, name + ".webp"))).size,
    alpha: meta.hasAlpha,
  });
}
await asset("hero-480", "사주 보는 고양이 영냥이.webp", 480);
await asset("hero-800", "사주 보는 고양이 영냥이.webp", 800);
await asset("avatar", "사주 보는 고양이 영냥이.webp", 112, [130, 0, 920, 710]);
await asset("room-780", "영냥이 고양이 방.webp", 780);
await asset("room-1440", "영냥이 고양이 방.webp", 1440);
await asset("story-room", "영냥이의 방.webp", 1000);
await asset("story-curse", "천기누설벌.webp", 900);
await asset("story-mirror", "영냥이의방 부서짐.webp", 900);
await asset("surprised", "고양이 된 영냥이.webp", 480);
const cards = [
  ["saju", 26, 24],
  ["tarot", 536, 24],
  ["astrology", 1050, 24],
  ["sukuyo", 26, 536],
  ["vedic", 536, 536],
];
for (const [name, x, y] of cards)
  await asset(name, "각종운세 진입.webp", 480, [x, y, 460, 300]);
await asset("ziwei", "자미두수 보는 영냥이.webp", 480, [7, 0, 475, 450]);
await asset("login", "회원가입 로그인.webp", 440, [590, 0, 450, 570]);
await asset("signup", "회원가입 로그인.webp", 440, [0, 0, 565, 572]);
await asset("night-read", "밤 영냥이.webp", 340, [916, 90, 300, 325]);
await asset("day-drink", "커피 마시는 영냥이.webp", 300, [8,100,250,278]);
await asset("expression-calm", "낮 영냥이.webp", 160, [15, 353, 165, 155]);
await asset("expression-wink", "낮 영냥이.webp", 160, [350, 353, 165, 155]);
await asset("expression-happy", "낮 영냥이.webp", 160, [840, 353, 165, 155]);
// Six supplied walk poses on an ivory stage; the white fur is never keyed out.
const strideFrames = [];
for (let i = 0; i < 6; i++) {
  const crop = [
    [7, 518, 220, 177],
    [237, 518, 210, 177],
    [464, 518, 210, 177],
    [687, 518, 215, 177],
    [914, 518, 207, 177],
    [1130, 518, 204, 177],
  ][i];
  strideFrames.push({
    input: await sharp(path.join(source, "낮 영냥이.webp"))
      .extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] })
      .resize(240, 210, { fit: "contain", background: "#ffffff" })
      .toBuffer(),
    left: i * 240,
    top: 0,
  });
}
await sharp({
  create: { width: 1440, height: 210, channels: 3, background: "#ffffff" },
})
  .composite(strideFrames)
  .webp({ quality: 85 })
  .withXmp(
    '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" dc:source="User supplied 낮 영냥이.webp; third row six walking poses; mechanical crop and resize only."/></rdf:RDF></x:xmpmeta>',
  )
  .toFile(path.join(output, "walk-strip.webp"));
manifest.push({
  file: "walk-strip.webp",
  source: "낮 영냥이.webp",
  crop: "six measured poses at y=518,height=177; x/width: 7/220,237/210,464/210,687/215,914/207,1130/204; each fitted to 240x210",
  width: 1440,
  height: 210,
  bytes: (await stat(path.join(output, "walk-strip.webp"))).size,
  alpha: false,
});
await asset("recommend-love", "각운세카드.webp", 400, [398, 735, 350, 266]);
await asset("recommend-wealth", "각운세카드.webp", 400, [1164, 209, 350, 334]);
await asset("recommend-year", "각운세카드.webp", 400, [784, 744, 350, 257]);
await asset("recommend-past", "각운세카드.webp", 400, [26, 746, 340, 259]);
// Individually supplied transparent prologue art. Originals remain untouched.
const prologue = "영냥이 프롤로그 스토리/";
await asset("prologue-human-calm", prologue + "영냥이 인간시절 스프라이트-Photoroom.webp", 292, [0, 0, 292, 262]);
await asset("prologue-human-smile", prologue + "영냥이 인간시절 스프라이트-Photoroom.webp", 292, [292, 0, 292, 262]);
for (const [name, file] of [
  ["curse", "고양이로변하는4"],
  ["changing", "고양이로변하는7"],
  ["changed", "고양이로변하는11"],
  ["protest", "신에게따지는영냥이"],
  ["resigned", "체념한영냥이"],
  ["fish", "고등어를 받는 영냥이"],
  ["fish-scent", "고등어냄새맡는 영냥이"],
  ["cat", "영냥이 과거 회상1"],
]) await asset("prologue-" + name, prologue + file + "-Photoroom.webp", 520);
// Measured individually: variable-width poses must never be played as a raw sheet.
const walkCrops = [[32,508,200,191],[235,508,220,191],[494,508,190,191],[707,508,200,191],[930,508,200,191],[1135,508,190,191]];
for (const [index, crop] of walkCrops.entries()) await asset(`walk-pose-${index + 1}`, "낮 영냥이.webp", 240, crop, [240, 230]);
await asset("room-sleep", "밤 영냥이.webp", 320, [1219,126,316,284]);
await asset("room-study", "밤 영냥이.webp", 320, [916,98,300,315]);
await writeFile("docs/asset-manifest.json", JSON.stringify(manifest, null, 2));
// Portable provenance sidecars accompany formats whose metadata is not read by all tools.
for (const item of manifest) {
  const sidecar = path.join(output, `${item.file}.json`);
  const prompt = `User-supplied original: ${item.source}. Mechanical crop/resize only. Crop: ${JSON.stringify(item.crop)}. No image generation.`;
  const existing = await readFile(sidecar, "utf8").then(JSON.parse).catch(() => null);
  if (existing?.prompt !== prompt) await writeFile(sidecar, JSON.stringify({ prompt, createdAt: new Date().toISOString() }, null, 2));
}
// A contact sheet is development evidence only; never shipped to visitors.
const originals = (await readdir(source)).filter((x) => x.endsWith(".webp"));
const cells = await Promise.all(
  originals.map(async (file, i) => ({
    input: await sharp(path.join(source, file))
      .resize(220, 160, { fit: "contain", background: "#e7dfe9" })
      .png()
      .toBuffer(),
    left: (i % 5) * 230,
    top: Math.floor(i / 5) * 185,
  })),
);
await sharp({
  create: {
    width: 1150,
    height: Math.ceil(cells.length / 5) * 185,
    channels: 3,
    background: "#e7dfe9",
  },
})
  .composite(cells)
  .jpeg({ quality: 80 })
  .toFile("docs/asset-contact-sheet.jpg");
await writeFile(
  "docs/asset-contact-sheet-index.json",
  JSON.stringify(originals, null, 2),
);
console.log(JSON.stringify(manifest, null, 2));

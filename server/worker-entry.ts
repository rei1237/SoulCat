import wasm from "@resvg/resvg-wasm/index_bg.wasm";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { handleEdge, EdgeEnv } from "./edge";
import { ShareSummary, shareSvg } from "./shares";
import { deliverOutbox, runBookStep, recoverPaidBooks } from "./fortune/books";
import {
  MockChapterProvider,
  StructuredChapterProvider,
} from "./providers/chapter";
import { createProvider } from "./providers/provider-factory";
let initialized: Promise<void> | undefined;
const assets = new Map<string, Uint8Array>();
async function asset(url: string) {
  if (assets.has(url)) return assets.get(url)!;
  const r = await fetch(url);
  if (!r.ok) throw new Error("SHARE_ASSET_UNAVAILABLE");
  const b = new Uint8Array(await r.arrayBuffer());
  assets.set(url, b);
  return b;
}
function base64(bytes: Uint8Array) {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}
export async function renderShare(
  summary: ShareSummary,
  vertical: boolean,
  origin: string,
) {
  initialized ??= initWasm(wasm);
  await initialized;
  const [font, cat, fish] = await Promise.all([
    asset(origin + "/_soulcat/assets/share/noto-kr.otf"),
    asset(origin + "/_soulcat/assets/share/cat.png"),
    asset(origin + `/_soulcat/assets/share/${summary.tier}.png`),
  ]);
  const svg = shareSvg(
    summary,
    vertical,
    "data:image/png;base64," + base64(cat),
    "data:image/png;base64," + base64(fish),
  );
  const renderer = new Resvg(svg, {
    font: { fontBuffers: [font], defaultFontFamily: "Noto Sans CJK KR" },
  });
  try {
    const result = renderer.render();
    try {
      return result.asPng();
    } finally {
      result.free();
    }
  } finally {
    renderer.free();
  }
}
function provider(env: EdgeEnv, requestId: string) {
  if(env.APP_ENV==='production' && (env.LLM_PROVIDER!=='gemini'||env.ALLOW_LIVE_LLM!=='true'))throw new Error('LIVE_LLM_DISABLED');
  return (env.LLM_PROVIDER || "mock") === "mock"
    ? new MockChapterProvider()
    : new StructuredChapterProvider(createProvider(env,{db:env.DB!,requestId}));
}
export default {
  fetch(
    request: Request,
    env: EdgeEnv,
    ctx: { waitUntil(task: Promise<unknown>): void },
  ) {
    return handleEdge(request, { ...env, renderShare }, (task) =>
      ctx.waitUntil(task),
    );
  },
  async queue(
    batch: {
      messages: { body: { requestId: string }; ack(): void; retry(): void }[];
    },
    env: EdgeEnv,
  ) {
    if (!env.DB || !env.BOOK_QUEUE) throw new Error("BOOK_STORAGE_UNAVAILABLE");
    for (const message of batch.messages) {
      try {
        await runBookStep(env.DB, message.body.requestId, provider(env,message.body.requestId));
        message.ack();
      } catch {
        message.retry();
      }
    }
    await deliverOutbox(env.DB, env.BOOK_QUEUE);
  },
  async scheduled(_event: unknown, env: EdgeEnv) {
    if (env.DB && env.BOOK_QUEUE) {
      await recoverPaidBooks(env.DB, {});
      await deliverOutbox(env.DB, env.BOOK_QUEUE);
    }
  },
};

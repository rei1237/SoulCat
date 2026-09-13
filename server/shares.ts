import {packages} from "./payments/catalog";
import { Database } from "./db/types";
import { bookStatus } from "./fortune/books";
import { FortuneError } from "./fortune/shared/contracts";
export interface ShareSummary {
  nickname: string;
  tier: string;
  title: string;
  headline: string;
  comment: string;
  keywords: string[];
  variant: string;
}
export const shareVariants = [
  "summary",
  "wealth",
  "love",
  "keywords",
  "comment",
  "helper",
  "relationship",
  "timing",
] as const;
export async function listShares(db: Database, userId: string, id: string) {
  await bookStatus(db, userId, id);
  const { results } = await db
    .prepare(
      "SELECT id,created_at,summary_json FROM fortune_shares WHERE request_id=? AND user_id=? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 100",
    )
    .bind(id, userId)
    .all<{ id: string; created_at: number; summary_json: string }>();
  return results.map((r) => ({
    shareId: r.id,
    url: `/share/yeongnyangi/${r.id}`,
    nickname: JSON.parse(r.summary_json).nickname,
    createdAt: r.created_at,
  }));
}
export async function createShare(
  db: Database,
  userId: string,
  id: string,
  options: Record<string, unknown>,
) {
  const book = await bookStatus(db, userId, id);
  if (!book || book.status !== "SUCCEEDED" || !book.summary)
    throw new FortuneError("SHARE_NOT_READY", 409);
  const nickname =
    typeof options.nickname === "string"
      ? options.nickname.trim().slice(0, 16)
      : "";
  const variant = shareVariants.includes(
    options.variant as (typeof shareVariants)[number],
  )
    ? String(options.variant)
    : "summary";
  let headline = book.summary.strongest,
    comment = book.summary.comment;
  const theme = (
    {
      wealth: "wealth",
      love: "love",
      helper: "relations",
      relationship: "love",
      timing: "timing",
    } as Record<string, string>
  )[variant];
  if (theme) {
    const chapter = book.chapters.find((c) => c.theme === theme);
    if (!chapter) throw new FortuneError("SHARE_VARIANT_UNAVAILABLE", 400);
    const row = await db
      .prepare(
        "SELECT content_json FROM fortune_chapters WHERE request_id=? AND chapter_id=?",
      )
      .bind(id, chapter.id)
      .first<{ content_json: string }>();
    if (row) {
      const c = JSON.parse(row.content_json);
      headline = c.summary;
      comment = c.persona;
    }
  }
  if (variant === "keywords") headline = book.summary.keywords.join(" · ");
  if (variant === "comment") headline = book.summary.comment;
  const summary: ShareSummary = {
    nickname: nickname || "어떤 손님",
    tier: book.tier,
    title: "영냥이가 본 나의 운명",
    headline: String(headline).slice(0, 160),
    comment: options.showComment === false ? "" : String(comment).slice(0, 160),
    keywords:
      options.showKeywords === false ? [] : book.summary.keywords.slice(0, 3),
    variant,
  };
  const shareId = crypto.randomUUID().replaceAll("-", "");
  await db
    .prepare(
      "INSERT INTO fortune_shares (id,request_id,user_id,summary_json,created_at) VALUES (?,?,?,?,?)",
    )
    .bind(shareId, id, userId, JSON.stringify(summary), Date.now())
    .run();
  return { shareId, url: `/share/yeongnyangi/${shareId}`, summary };
}
export async function revokeShare(db: Database, userId: string, id: string) {
  await db
    .prepare("UPDATE fortune_shares SET revoked_at=? WHERE id=? AND user_id=?")
    .bind(Date.now(), id, userId)
    .run();
}
export async function publicSummary(
  db: Database,
  id: string,
): Promise<ShareSummary | null> {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const row = await db
    .prepare(
      "SELECT s.summary_json FROM fortune_shares s JOIN fortune_requests r ON r.id=s.request_id JOIN entitlements e ON e.id=r.entitlement_id WHERE s.id=? AND s.revoked_at IS NULL AND e.status='ACTIVE'",
    )
    .bind(id)
    .first<{ summary_json: string }>();
  return row ? JSON.parse(row.summary_json) : null;
}
export const escapeMarkup = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function shareSvg(
  s: ShareSummary,
  vertical = false,
  cat = "",
  fish = "",
) {
  const w = vertical ? 1080 : 1200,
    h = vertical ? 1920 : 630;
  const lines = (text: string, n: number) =>
    Array.from(text).reduce<string[]>((a, c, i) => {
      const k = Math.floor(i / n);
      a[k] = (a[k] || "") + c;
      return a;
    }, []);
  const name=packages[s.tier as keyof typeof packages]?.name||'운명서';
  const text = (v: string, x: number, y: number, size: number) =>
    `<text x="${x}" y="${y}" font-family="Noto Sans CJK KR" font-size="${size}" fill="#32213e">${escapeMarkup(v)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#211432"/><rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="28" fill="#fff3e2" stroke="#bc9159" stroke-width="3"/>${cat ? `<image href="${cat}" x="${vertical ? 310 : 870}" y="${vertical ? 110 : 70}" width="${vertical ? 460 : 260}" height="${vertical ? 460 : 260}"/>` : ""}${text("CODE DESTINY · 영냥이", 64, 100, 26)}${text(`${s.nickname}의 운명서`, 64, vertical ? 660 : 180, 46)}${lines(
    s.headline,
    vertical ? 23 : 29,
  )
    .slice(0, 4)
    .map((line, i) => text(line, 64, (vertical ? 780 : 265) + i * 55, 34))
    .join("")}${lines(s.comment, vertical ? 25 : 34)
    .slice(0, 3)
    .map((line, i) => text(line, 64, (vertical ? 1160 : 450) + i * 40, 26))
    .join(
      "",
    )}${fish ? `<image href="${fish}" x="64" y="${h - 125}" width="100" height="70"/>` : ""}${text(`${name} 운명서`, 190, h - 73, 27)}${text("영냥이가 내 운명도 봐주기", vertical ? 64 : 700, h - 73, 25)}</svg>`;
}
export function shareHtml(s: ShareSummary, url: string) {
  const e = escapeMarkup;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${e(s.title)}</title><meta property="og:title" content="${e(s.nickname)}의 운명서"><meta property="og:description" content="${e(s.headline)}"><meta property="og:type" content="website"><meta property="og:url" content="${e(url)}"><meta property="og:image" content="${e(url)}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head><body style="margin:0;background:#211432;color:#fff3e2;font-family:sans-serif"><main style="max-width:700px;margin:auto;padding:24px"><img style="width:100%;height:auto" width="1200" height="630" src="${e(url)}/og.png" alt="${e(s.headline)}"><h1>${e(s.nickname)}의 운명서</h1><p>${e(s.headline)}</p><p>${e(s.comment)}</p><a style="display:inline-block;padding:18px;color:#fff3e2" href="/yeongnyangi/fortune/">영냥이가 내 운명도 봐주기</a></main></body></html>`;
}

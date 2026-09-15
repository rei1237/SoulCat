import { Database } from "./db/types";

// 코드 데스티니 회원 탈퇴가 Service Binding 으로 부르는 삭제. 이 계정이 남긴 행을 전부 지운다.
// D1 은 외래 키를 강제하므로 자식 → 부모 순서여야 하고, 한 batch(트랜잭션)라 중간 실패는 전부 되돌린다.
// 🔴 llm_reservations 는 request_id NOT NULL 외래 키라 요청과 함께 지워진다 — 그날 예산 합계가 그만큼 줄어든다.
// 🔴 payment_webhooks(사용자 열 없음)·place_search_*(공용 캐시)는 대상이 아니다.
const REQUESTS = "SELECT id FROM fortune_requests WHERE user_id=?1";
const ORDERS = "SELECT id FROM orders WHERE user_id=?1";
const CHARTS = "SELECT id FROM chart_snapshots WHERE user_id=?1 OR profile_id IN (SELECT id FROM profiles WHERE user_id=?1)";
const STATEMENTS = [
  `DELETE FROM fortune_shares WHERE user_id=?1 OR request_id IN (${REQUESTS})`,
  `DELETE FROM fortune_reading_progress WHERE request_id IN (${REQUESTS})`,
  `DELETE FROM fortune_outbox WHERE request_id IN (${REQUESTS})`,
  `DELETE FROM fortune_chapters WHERE request_id IN (${REQUESTS})`,
  `DELETE FROM fortune_books WHERE request_id IN (${REQUESTS})`,
  `DELETE FROM fortune_results WHERE request_id IN (${REQUESTS})`,
  `DELETE FROM llm_reservations WHERE request_id IN (${REQUESTS})`,
  "DELETE FROM fortune_requests WHERE user_id=?1",
  `DELETE FROM entitlements WHERE user_id=?1 OR order_id IN (${ORDERS})`,
  `DELETE FROM order_chart_links WHERE order_id IN (${ORDERS})`,
  `DELETE FROM order_specs WHERE order_id IN (${ORDERS})`,
  `DELETE FROM payments WHERE order_id IN (${ORDERS})`,
  "DELETE FROM orders WHERE user_id=?1",
  `DELETE FROM chart_domain_contexts WHERE chart_id IN (${CHARTS})`,
  "DELETE FROM chart_snapshots WHERE user_id=?1 OR profile_id IN (SELECT id FROM profiles WHERE user_id=?1)",
  "DELETE FROM profiles WHERE user_id=?1",
  "DELETE FROM daily_messages WHERE user_id=?1",
  "DELETE FROM anchovy_ledger WHERE user_id=?1",
  "DELETE FROM free_readings WHERE user_id=?1",
  "DELETE FROM sessions WHERE user_id=?1",
  "DELETE FROM users WHERE id=?1",
];

export async function deleteAccount(db: Database, userId: string) {
  const results = await db.batch(STATEMENTS.map(sql => db.prepare(sql).bind(userId))) as { meta?: { changes?: number } }[];
  return { deletedRows: results.reduce((sum, r) => sum + (Number(r?.meta?.changes) || 0), 0) };
}

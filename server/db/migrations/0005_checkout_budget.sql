-- Additive migration: existing paid orders and result contracts are preserved.
ALTER TABLE orders ADD COLUMN store_id TEXT;
ALTER TABLE orders ADD COLUMN channel_key TEXT;
ALTER TABLE orders ADD COLUMN pay_method TEXT;
ALTER TABLE orders ADD COLUMN return_path TEXT;
ALTER TABLE orders ADD COLUMN pg_status TEXT;
ALTER TABLE orders ADD COLUMN cancelled_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN verify_token TEXT;
ALTER TABLE orders ADD COLUMN verify_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN verified_at INTEGER NOT NULL DEFAULT 0;
-- Live orders only: legacy/mock duplicates are not silently deleted by migration.
CREATE UNIQUE INDEX live_checkout_unique ON orders(user_id,profile_id,product_id)
WHERE store_id IS NOT NULL AND status IN ('PENDING','PAID');
CREATE TABLE payment_webhooks (id TEXT PRIMARY KEY, completed_at INTEGER);
CREATE TABLE llm_reservations (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES fortune_requests(id), day TEXT NOT NULL,
 reserved INTEGER NOT NULL CHECK(reserved>0), charged INTEGER CHECK(charged>=0),
 state TEXT NOT NULL DEFAULT 'RESERVED', created_at INTEGER NOT NULL
);
CREATE INDEX llm_request_cost ON llm_reservations(request_id);
CREATE INDEX llm_day_cost ON llm_reservations(day);
ALTER TABLE fortune_requests ADD COLUMN resume_after INTEGER NOT NULL DEFAULT 0;

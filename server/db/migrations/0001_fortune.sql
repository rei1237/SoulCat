PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), domain TEXT NOT NULL,
  input_json TEXT NOT NULL CHECK(json_valid(input_json)), created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), profile_id TEXT NOT NULL REFERENCES profiles(id),
  product_id TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0), currency TEXT NOT NULL CHECK(currency='KRW'),
  payment_id TEXT NOT NULL UNIQUE, idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING','PAID','CANCELLED','FAILED','REFUNDED')),
  created_at INTEGER NOT NULL, UNIQUE(user_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL,
  verified_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  user_id TEXT NOT NULL REFERENCES users(id), product_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ACTIVE','REVOKED')), created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fortune_requests (
  id TEXT PRIMARY KEY, entitlement_id TEXT NOT NULL UNIQUE REFERENCES entitlements(id),
  user_id TEXT NOT NULL REFERENCES users(id), profile_id TEXT NOT NULL REFERENCES profiles(id), product_id TEXT NOT NULL,
  domain TEXT NOT NULL, question TEXT NOT NULL,
  calculated_context TEXT CHECK(calculated_context IS NULL OR json_valid(calculated_context)),
  provider TEXT, model TEXT, prompt_version TEXT,
  status TEXT NOT NULL CHECK(status IN ('PENDING','RUNNING','FAILED','SUCCEEDED','UNCERTAIN')),
  attempt_id TEXT, lease_until INTEGER, failure_code TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fortune_results (
  request_id TEXT PRIMARY KEY REFERENCES fortune_requests(id),
  structured_result TEXT NOT NULL CHECK(json_valid(structured_result)),
  provider TEXT NOT NULL, model TEXT NOT NULL, prompt_version TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_owner ON profiles(user_id, created_at);
CREATE INDEX IF NOT EXISTS requests_owner ON fortune_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS orders_owner ON orders(user_id, created_at);

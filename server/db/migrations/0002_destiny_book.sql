CREATE TABLE chart_snapshots (
 id TEXT PRIMARY KEY, profile_id TEXT NOT NULL UNIQUE REFERENCES profiles(id), user_id TEXT NOT NULL REFERENCES users(id),
 domain TEXT NOT NULL, engine_version TEXT NOT NULL, as_of TEXT NOT NULL,
 contexts_json TEXT NOT NULL CHECK(json_valid(contexts_json)), chart_json TEXT NOT NULL CHECK(json_valid(chart_json)), created_at INTEGER NOT NULL
);
ALTER TABLE fortune_requests ADD COLUMN book_version TEXT;
ALTER TABLE fortune_requests ADD COLUMN chart_id TEXT REFERENCES chart_snapshots(id);
CREATE TABLE fortune_books (
 request_id TEXT PRIMARY KEY REFERENCES fortune_requests(id), tier TEXT NOT NULL, manifest_json TEXT NOT NULL,
 analysis_json TEXT NOT NULL, summary_json TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE fortune_chapters (
 request_id TEXT NOT NULL REFERENCES fortune_books(request_id), chapter_id TEXT NOT NULL,
 ordinal INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','generating','completed','failed')),
 content_json TEXT, raw_json TEXT, attempt_id TEXT, lease_until INTEGER, failure_code TEXT, attempts INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(request_id,chapter_id)
);
CREATE TABLE fortune_outbox (
 request_id TEXT PRIMARY KEY REFERENCES fortune_books(request_id), sent_at INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE fortune_reading_progress (
 request_id TEXT PRIMARY KEY REFERENCES fortune_books(request_id), last_chapter TEXT, read_json TEXT NOT NULL DEFAULT '[]', updated_at INTEGER NOT NULL
);
CREATE TABLE fortune_shares (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES fortune_books(request_id), user_id TEXT NOT NULL REFERENCES users(id),
 summary_json TEXT NOT NULL, revoked_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX chapters_state ON fortune_chapters(request_id,status,ordinal);
CREATE INDEX shares_owner ON fortune_shares(user_id,request_id);

CREATE TABLE anchovy_ledger (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 day TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('attendance','unlock')),
 amount INTEGER NOT NULL CHECK((kind='attendance' AND amount=1) OR (kind='unlock' AND amount=-1)),
 created_at INTEGER NOT NULL,
 UNIQUE(user_id,day,kind)
);
CREATE TABLE free_readings (
 user_id TEXT NOT NULL REFERENCES users(id),
 day TEXT NOT NULL,
 category TEXT NOT NULL,
 input_json TEXT NOT NULL CHECK(json_valid(input_json)),
 result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),
 claim TEXT NOT NULL,
 lease_until INTEGER NOT NULL,
 PRIMARY KEY(user_id,day,category)
);
CREATE TABLE place_search_cache (query TEXT PRIMARY KEY, result_json TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE place_search_gate (id INTEGER PRIMARY KEY CHECK(id=1), next_at INTEGER NOT NULL);
INSERT INTO place_search_gate VALUES (1,0);

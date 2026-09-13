CREATE TABLE order_specs (
 order_id TEXT PRIMARY KEY REFERENCES orders(id), spec_json TEXT NOT NULL CHECK(json_valid(spec_json))
);
CREATE TABLE daily_messages (
 user_id TEXT NOT NULL REFERENCES users(id), profile_key TEXT NOT NULL, domain TEXT NOT NULL, day TEXT NOT NULL, version TEXT NOT NULL,
 content_json TEXT NOT NULL CHECK(json_valid(content_json)), PRIMARY KEY(user_id,profile_key,domain,day,version)
);

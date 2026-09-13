CREATE TABLE chart_domain_contexts (
 chart_id TEXT NOT NULL REFERENCES chart_snapshots(id), domain TEXT NOT NULL,
 context_json TEXT NOT NULL CHECK(json_valid(context_json)), PRIMARY KEY(chart_id,domain)
);
CREATE TABLE order_chart_links (
 order_id TEXT PRIMARY KEY REFERENCES orders(id), chart_id TEXT NOT NULL REFERENCES chart_snapshots(id), manifest_version TEXT NOT NULL
);

import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { createOrder, grantPaidOrder } from "../server/payments/orders";
import { prepareGeneration, runGeneration } from "../server/fortune/generation";
import { MockLLMProvider } from "../server/providers/mock";
import { verifyPayment } from "../server/payments/portone";
import { handleApi } from "../server/api";
import type { Database, Statement } from "../server/db/types";
function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(fs.readFileSync("server/db/migrations/0001_fortune.sql", "utf8"));
  class SqlStatement implements Statement {
    values: unknown[] = [];
    constructor(public sql: string) {}
    bind(...values: unknown[]) {
      this.values = values;
      return this;
    }
    async first<T>() {
      return (
        (sqlite.prepare(this.sql).get(...(this.values as never[])) as T) ?? null
      );
    }
    async all<T>() {
      return {
        results: sqlite
          .prepare(this.sql)
          .all(...(this.values as never[])) as T[],
      };
    }
    async run() {
      return {
        meta: {
          changes: Number(
            sqlite.prepare(this.sql).run(...(this.values as never[])).changes,
          ),
        },
      };
    }
  }
  const db: Database = {
    prepare: (sql) => new SqlStatement(sql),
    batch: async (statements) => {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const input = JSON.stringify({
    personA: {
      birthDate: "1997-02-10",
      birthTime: "14:30",
      gender: "female",
      calendarType: "solar",
    },
    question: "일",
  });
  sqlite.prepare("INSERT INTO users VALUES (?,?)").run("alice", Date.now());
  sqlite.prepare("INSERT INTO users VALUES (?,?)").run("bob", Date.now());
  sqlite
    .prepare("INSERT INTO profiles VALUES (?,?,?,?,?)")
    .run("profile-a", "alice", "saju", input, Date.now());
  sqlite
    .prepare("INSERT INTO profiles VALUES (?,?,?,?,?)")
    .run("profile-b", "bob", "saju", input, Date.now());
  return { db, sqlite };
}
const config = {
  PORTONE_STORE_ID: "store-test",
  PORTONE_CHANNEL_KEY: "channel-test",
};
test("server catalog, ownership, duplicate orders and duplicate entitlement", async () => {
  const { db, sqlite } = setup();
  const a = await createOrder(
    db,
    "alice",
    "saju_mackerel",
    "profile-a",
    "same-request-key-123",
  );
  const b = await createOrder(
    db,
    "alice",
    "saju_mackerel",
    "profile-a",
    "same-request-key-123",
  );
  assert.equal(a.id, b.id);
  assert.equal(a.amount, 1000);
  await assert.rejects(
    () =>
      createOrder(
        db,
        "bob",
        "saju_mackerel",
        "profile-a",
        "other-request-key123",
      ),
    /PROFILE_NOT_FOUND/,
  );
  await assert.rejects(
    () =>
      createOrder(
        db,
        "alice",
        "saju_tuna",
        "profile-a",
        "same-request-key-123",
      ),
    /IDEMPOTENCY_CONFLICT/,
  );
  const paid = {
    id: a.payment_id,
    status: "PAID",
    amount: { total: 1000 },
    currency: "KRW",
    storeId: "store-test",
    channel: { key: "channel-test" },
  };
  for (const altered of [
    { ...paid, amount: { total: 1 } },
    { ...paid, status: "FAILED" },
    { ...paid, status: "CANCELLED" },
    { ...paid, id: "forged" },
    { ...paid, currency: "USD" },
  ])
    assert.throws(() => verifyPayment(altered, a, config));
  await grantPaidOrder(db, a, paid, config);
  await grantPaidOrder(db, a, paid, config);
  assert.equal(
    (
      sqlite.prepare("SELECT count(*) AS n FROM entitlements").get() as {
        n: number;
      }
    ).n,
    1,
  );
});
test("paid + AI failure retains entitlement; retry saves one result; parallel clicks call provider once", async () => {
  const { db, sqlite } = setup();
  const order = await createOrder(
    db,
    "alice",
    "saju_mackerel",
    "profile-a",
    "generation-order-key",
  );
  await grantPaidOrder(
    db,
    order,
    {
      id: order.payment_id,
      status: "PAID",
      amount: { total: 1000 },
      currency: "KRW",
      storeId: "store-test",
      channel: { key: "channel-test" },
    },
    config,
  );
  const request = await prepareGeneration(
    db,
    "alice",
    "saju_mackerel",
    "profile-a",
  );
  assert.equal(
    (await prepareGeneration(db, "alice", "saju_mackerel", "profile-a")).id,
    request.id,
  );
  await runGeneration(db, request.id, new MockLLMProvider("error"));
  assert.equal(
    (
      sqlite.prepare("SELECT status FROM entitlements").get() as {
        status: string;
      }
    ).status,
    "ACTIVE",
  );
  assert.equal(
    (
      sqlite.prepare("SELECT status FROM fortune_requests").get() as {
        status: string;
      }
    ).status,
    "FAILED",
  );
  let calls = 0;
  const provider = {
    generate: async (...args: Parameters<MockLLMProvider["generate"]>) => {
      calls++;
      return new MockLLMProvider().generate(...args);
    },
  };
  await Promise.all([
    runGeneration(db, request.id, provider),
    runGeneration(db, request.id, provider),
  ]);
  await runGeneration(db, request.id, provider);
  assert.equal(calls, 1);
  assert.equal(
    (
      sqlite.prepare("SELECT count(*) AS n FROM fortune_results").get() as {
        n: number;
      }
    ).n,
    1,
  );
  assert.equal(
    (
      sqlite.prepare("SELECT status FROM fortune_requests").get() as {
        status: string;
      }
    ).status,
    "SUCCEEDED",
  );
  await assert.rejects(
    () => prepareGeneration(db, "bob", "saju_mackerel", "profile-a"),
    /PROFILE_NOT_FOUND/,
  );
});
test("transactions roll back and APIs refuse anonymous/private cache access", async () => {
  const { db, sqlite } = setup();
  await assert.rejects(() =>
    db.batch([
      db.prepare("INSERT INTO users VALUES (?,?)").bind("rollback", 1),
      db.prepare("INSERT INTO missing_table VALUES (1)"),
    ]),
  );
  assert.equal(
    sqlite.prepare("SELECT * FROM users WHERE id='rollback'").get(),
    undefined,
  );
  const response = await handleApi(
    new Request("http://localhost/api/library"),
    { DB: db },
    () => {},
  );
  assert.equal(response.status, 401);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  const crossOrigin = await handleApi(
    new Request("http://localhost/api/session", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: "{}",
    }),
    { DB: db, APP_ENV: "local" },
    () => {},
  );
  assert.equal(crossOrigin.status, 403);
});
test("ambiguous provider timeout never auto-generates twice or revokes the purchase", async () => {
  const { db, sqlite } = setup();
  const order = await createOrder(
    db,
    "alice",
    "saju_mackerel",
    "profile-a",
    "timeout-request-key",
  );
  await grantPaidOrder(
    db,
    order,
    {
      id: order.payment_id,
      status: "PAID",
      amount: { total: 1000 },
      currency: "KRW",
      storeId: "store-test",
      channel: { key: "channel-test" },
    },
    config,
  );
  const request = await prepareGeneration(
    db,
    "alice",
    "saju_mackerel",
    "profile-a",
  );
  await runGeneration(db, request.id, new MockLLMProvider("timeout"));
  let calls = 0;
  await runGeneration(db, request.id, {
    generate: async (r) => {
      calls++;
      return new MockLLMProvider().generate(r);
    },
  });
  assert.equal(calls, 0);
  assert.equal(
    (
      sqlite.prepare("SELECT status FROM fortune_requests").get() as {
        status: string;
      }
    ).status,
    "UNCERTAIN",
  );
  assert.equal(
    (
      sqlite.prepare("SELECT status FROM entitlements").get() as {
        status: string;
      }
    ).status,
    "ACTIVE",
  );
});

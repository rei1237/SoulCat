import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import type { Database, Statement } from "../../server/db/types";
export function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of fs
    .readdirSync("server/db/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sqlite.exec(fs.readFileSync("server/db/migrations/" + file, "utf8"));
  class Query implements Statement {
    values: unknown[] = [];
    constructor(public sql: string) {}
    bind(...v: unknown[]) {
      this.values = v;
      return this;
    }
    async first<T>() {
      return (
        (sqlite.prepare(this.sql).get(...(this.values as never[])) as T) || null
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
    prepare: (sql) => new Query(sql),
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const out = [];
        for (const statement of statements) {
          const s = statement as Query;
          out.push({
            meta: {
              changes: Number(
                sqlite.prepare(s.sql).run(...(s.values as never[])).changes,
              ),
            },
          });
        }
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, sqlite };
}
export const profile = {
  birthDate: "1997-02-10",
  birthTime: "14:30",
  calendarType: "solar" as const,
  gender: "female" as const,
  birthPlace: { latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
};
export function seed(sqlite: DatabaseSync, domain = "saju") {
  sqlite.prepare("INSERT INTO users VALUES (?,?)").run("alice", Date.now());
  sqlite.prepare("INSERT INTO users VALUES (?,?)").run("bob", Date.now());
  sqlite
    .prepare("INSERT INTO profiles VALUES (?,?,?,?,?)")
    .run(
      "p",
      "alice",
      domain,
      JSON.stringify({
        personA: profile,
        readingMode: "personal",
        question: "일",
      }),
      Date.now(),
    );
}

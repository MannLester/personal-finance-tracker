import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { Connection, createStore } from "../src/store-core";
import { emptyState, backup, restore } from "../src/finance";
function adapter(db: DatabaseSync, fail = false): Connection {
  const c: Connection = {
    execAsync: async (sql) => {
      db.exec(sql);
    },
    getFirstAsync: async <T>(sql: string, ...params: any[]) =>
      (db.prepare(sql).get(...params) as T) ?? null,
    runAsync: async (sql, ...params) => {
      const result = db.prepare(sql).run(...params);
      if (fail && sql.startsWith("UPDATE"))
        throw Error("Simulated disk write failure");
      return { changes: Number(result.changes) };
    },
    withExclusiveTransactionAsync: async (task) => {
      db.exec("BEGIN IMMEDIATE");
      try {
        await task(c);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return c;
}
test("SQLite initialization, committed persistence on reopen, stale write rejection and backups", async () => {
  const dir = mkdtempSync(join(process.cwd(), ".storage-test-"));
  try {
    const path = join(dir, "test.db");
    let db = new DatabaseSync(path);
    let store = createStore(async () => adapter(db));
    assert.equal((await store.load()).revision, 0);
    const s = emptyState();
    s.accounts.push({
      id: "bank",
      name: "Bank",
      platform: "BPI",
      kind: "bank",
      opening: 2000000,
      archived: false,
      checked: null,
    });
    s.goals.push({
      id: "trip",
      name: "Isabela",
      target: 500000,
      deadline: "",
      archived: false,
    });
    s.allocations.push({
      id: "a",
      goal: "trip",
      account: "bank",
      amount: 500000,
    });
    await store.save(s, 0);
    await assert.rejects(() => store.save(s, 0));
    db.close();
    db = new DatabaseSync(path);
    store = createStore(async () => adapter(db));
    assert.deepEqual((await store.load()).data, s);
    const invalid = structuredClone(s);
    invalid.allocations[0].amount = 3000000;
    await assert.rejects(() => store.save(invalid, 1));
    assert.deepEqual((await store.load()).data, s);
    const failing = createStore(async () => adapter(db, true));
    await assert.rejects(() => failing.save(emptyState(), 1, true));
    assert.deepEqual((await store.load()).data, s);
    const restored = restore(backup(s));
    await store.save(restored, 1, true);
    assert.deepEqual((await store.load()).data, s);
    db.close();
  } finally {
    assert.equal(dirname(dir), process.cwd());
    rmSync(dir, { recursive: true, force: true });
  }
});
test("SQLite preserves corruption, supports explicit restore, and rejects unsupported schemas", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const store = createStore(async () => adapter(db));
    await store.load();
    db.exec(`UPDATE app_state SET data='{}'`);
    await assert.rejects(() => store.load());
    assert.equal(
      (db.prepare("SELECT data FROM app_state").get() as any).data,
      "{}",
    );
    await store.save(emptyState(), 0, true);
    assert.deepEqual((await store.load()).data, emptyState());
    db.exec("PRAGMA user_version=99");
    await assert.rejects(() => createStore(async () => adapter(db)).load());
  } finally {
    db.close();
  }
});
test("v1 migration preserves data, seeds once, stores privacy separately, and respects exact restore", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const s = emptyState();
    s.accounts.push({
      id: "real",
      name: "My BPI",
      platform: "BPI",
      kind: "bank",
      opening: 123456,
      archived: false,
      checked: null,
    });
    db.exec(
      "CREATE TABLE app_state(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL);PRAGMA user_version=1;",
    );
    db.prepare("INSERT INTO app_state VALUES(1,4,?)").run(JSON.stringify(s));
    const store = createStore(async () => adapter(db));
    const migrated = await store.load();
    assert.equal(migrated.revision, 4);
    assert.equal(
      migrated.data.accounts.find((a) => a.id === "real")?.opening,
      123456,
    );
    assert.equal(migrated.data.accounts.length, 6);
    assert.equal(await store.getPrivacy(), false);
    await store.setPrivacy(true);
    assert.equal(await store.getPrivacy(), true);
    await store.save(emptyState(), 4, true);
    const reopened = createStore(async () => adapter(db));
    assert.deepEqual((await reopened.load()).data, emptyState());
    assert.equal(await reopened.getPrivacy(), true);
  } finally {
    db.close();
  }
});

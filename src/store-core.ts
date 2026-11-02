import { seedAccounts } from "./brands";
import { State, emptyState, validate, reserved, balance } from "./finance";
export type Snapshot = { revision: number; data: State };
export const initial: Snapshot = { revision: 0, data: emptyState() };
export interface Connection {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null>;
  runAsync(sql: string, ...params: any[]): Promise<{ changes: number }>;
  withExclusiveTransactionAsync(
    task: (tx: Connection) => Promise<void>,
  ): Promise<void>;
}
export function createStore(open: () => Promise<Connection>) {
  let connection: Promise<Connection> | undefined;
  async function db() {
    if (!connection)
      connection = (async () => {
        const d = await open();
        await d.execAsync("PRAGMA journal_mode=WAL;");
        await d.withExclusiveTransactionAsync(async (tx) => {
          const version = await tx.getFirstAsync<{ user_version: number }>(
            "PRAGMA user_version",
          );
          if (version?.user_version === 0) {
            const existing = await tx.getFirstAsync(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='app_state'",
            );
            if (existing)
              throw Error(
                "Unrecognized database. Existing records were preserved.",
              );
            await tx.execAsync(
              "CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));",
            );
            await tx.runAsync(
              "INSERT INTO app_state VALUES (1,0,?)",
              JSON.stringify(emptyState()),
            );
            await tx.execAsync("PRAGMA user_version=1;");
          } else if (![1, 2].includes(version?.user_version ?? -1))
            throw Error(
              "Unsupported database version. Update the app; records were preserved.",
            );
          if ((version?.user_version ?? 0) < 2) {
            const row = await tx.getFirstAsync<{ data: string }>(
              "SELECT data FROM app_state WHERE id=1",
            );
            if (!row) throw Error("Missing local state");
            const state = JSON.parse(row.data);
            validate(state);
            await tx.runAsync(
              "UPDATE app_state SET data=? WHERE id=1",
              JSON.stringify(seedAccounts(state)),
            );
            await tx.execAsync(
              "CREATE TABLE preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL); PRAGMA user_version=2;",
            );
          }
        });
        return d;
      })().catch((e) => {
        connection = undefined;
        throw e;
      });
    return connection;
  }
  async function read(d: Connection): Promise<Snapshot> {
    const row = await d.getFirstAsync<{ revision: number; data: string }>(
      "SELECT revision,data FROM app_state WHERE id=1",
    );
    if (!row)
      throw Error(
        "Local records are missing. Restore a backup; the database was not reset.",
      );
    const data = JSON.parse(row.data);
    validate(data);
    return { revision: row.revision, data };
  }
  async function load() {
    return read(await db());
  }
  async function save(
    data: State,
    revision: number,
    restoring = false,
  ): Promise<Snapshot> {
    validate(data);
    const d = await db();
    let savedRevision = revision + 1;
    await d.withExclusiveTransactionAsync(async (tx) => {
      const meta = restoring
        ? await tx.getFirstAsync<{ revision: number }>(
            "SELECT revision FROM app_state WHERE id=1",
          )
        : null;
      if (restoring && !meta)
        await tx.runAsync(
          "INSERT INTO app_state VALUES(1,0,?)",
          JSON.stringify(emptyState()),
        );
      const current = restoring
        ? { revision: meta?.revision ?? 0, data: emptyState() }
        : await read(tx);
      if (restoring) revision = current.revision;
      savedRevision = revision + 1;
      if (current.revision !== revision)
        throw Error("Records changed. Reopen them before retrying.");
      if (!restoring)
        for (const a of data.accounts.filter((a) => a.kind !== "investment")) {
          const next = reserved(data, a.id);
          if (next > reserved(current.data, a.id) && next > balance(data, a))
            throw Error("Not enough available money for reservations.");
        }
      const result = await tx.runAsync(
        "UPDATE app_state SET data=?,revision=revision+1 WHERE id=1 AND revision=?",
        JSON.stringify(data),
        revision,
      );
      if (result.changes !== 1)
        throw Error("Records changed. Reopen them before retrying.");
    });
    return { revision: savedRevision, data };
  }
  async function getPrivacy() {
    const d = await db();
    const row = await d.getFirstAsync<{ value: string }>(
      "SELECT value FROM preferences WHERE key='hideAmounts'",
    );
    return row?.value === "true";
  }
  async function setPrivacy(hidden: boolean) {
    const d = await db();
    await d.runAsync(
      "INSERT OR REPLACE INTO preferences VALUES('hideAmounts',?)",
      String(hidden),
    );
  }
  return { load, save, getPrivacy, setPrivacy };
}

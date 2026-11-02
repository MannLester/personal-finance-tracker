import { openDatabaseAsync } from "expo-sqlite";
import { createStore, Connection } from "./store-core";
export { initial } from "./store-core";
export type { Snapshot } from "./store-core";
const store = createStore(
  async () =>
    (await openDatabaseAsync("mann-finance.db")) as unknown as Connection,
);
export const load = store.load;
export const save = store.save;

export const getPrivacy = store.getPrivacy;
export const setPrivacy = store.setPrivacy;

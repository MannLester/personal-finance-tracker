import { test } from "node:test";
import assert from "node:assert/strict";
import { seedAccounts, brandKey } from "../src/brands";
import { emptyState, summary, restore, backup } from "../src/finance";
test("six starters, separate Maya accounts and repeated seeding without duplicates", () => {
  const s = seedAccounts(emptyState());
  assert.equal(s.accounts.length, 6);
  assert.equal(s.accounts.filter((a) => brandKey(a) === "maya").length, 2);
  assert.deepEqual(seedAccounts(s), s);
  assert.equal(
    s.accounts.reduce((n, a) => n + a.opening, 0),
    0,
  );
  assert.deepEqual(restore(backup(s)), s);
});
test("existing archived accounts and balances survive starter migration", () => {
  const s = emptyState();
  s.accounts.push({
    id: "mine",
    name: "Salary",
    platform: "BPI",
    kind: "bank",
    opening: 123456,
    archived: true,
    checked: null,
  });
  const next = seedAccounts(s);
  assert.equal(next.accounts.filter((a) => brandKey(a) === "bpi").length, 1);
  assert.equal(next.accounts.find((a) => a.id === "mine")?.opening, 123456);
  assert.equal(next.accounts.find((a) => a.id === "mine")?.archived, true);
});
test("cash flow excludes transfers/adjustments and includes transfer fees", () => {
  const s = seedAccounts(emptyState());
  s.transactions.push({
    id: "t",
    kind: "transfer",
    source: s.accounts[0].id,
    destination: s.accounts[1].id,
    amount: 1000,
    fee: 10,
    date: "2026-01-01",
    category: "",
    note: "",
  });
  assert.equal(summary(s, "2026-01").income, 0);
  assert.equal(summary(s, "2026-01").expenses, 10);
});

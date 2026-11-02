import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  Account,
  State,
  totals,
  summary,
  balance,
  cents,
  validate,
  backup,
  restore,
  dueDate,
} from "../src/finance";
const account = (
  id: string,
  kind: Account["kind"] = "bank",
  opening = 0,
): Account => ({
  id,
  name: id,
  platform: "BPI",
  kind,
  opening,
  archived: false,
  checked: null,
});
function sample(): State {
  const s = emptyState();
  s.accounts = [
    account("bank", "bank", 2000000),
    account("fund", "investment"),
  ];
  s.goals = [
    {
      id: "trip",
      name: "Isabela",
      target: 500000,
      deadline: "",
      archived: false,
    },
  ];
  s.allocations = [
    { id: "reserve", goal: "trip", account: "bank", amount: 500000 },
  ];
  s.transactions = [
    {
      id: "invest",
      kind: "contribution",
      source: "bank",
      destination: "fund",
      amount: 300000,
      fee: 0,
      date: "2026-01-01",
      category: "",
      note: "",
    },
  ];
  return s;
}
test("agreed available-money example and no double counting", () => {
  const s = sample();
  validate(s);
  assert.deepEqual(totals(s), {
    cash: 1700000,
    investments: 300000,
    reserved: 500000,
    available: 1200000,
    assets: 2000000,
  });
  assert.equal(summary(s, "2026-01").expenses, 0);
});
test("fees, transfer edits and deletes affect correct accounts", () => {
  const s = sample();
  s.accounts.push(account("wallet", "wallet"));
  s.transactions.push({
    id: "move",
    kind: "transfer",
    source: "bank",
    destination: "wallet",
    amount: 10000,
    fee: 100,
    date: "2026-01-02",
    category: "",
    note: "",
  });
  assert.equal(totals(s).assets, 1999900);
  assert.equal(summary(s, "2026-01").expenses, 100);
  s.transactions.at(-1)!.amount = 20000;
  assert.equal(balance(s, s.accounts[2]), 20000);
  s.transactions.pop();
  assert.equal(totals(s).assets, 2000000);
});
test("valuation covers prior activity; subsequent contributions and earnings remain distinct", () => {
  const s = sample();
  s.valuations = [
    { id: "v", account: "fund", amount: 310000, date: "2026-01-02" },
  ];
  s.transactions.push({
    ...s.transactions[0],
    id: "next",
    amount: 100000,
    date: "2026-02-01",
  });
  s.transactions.push({
    id: "interest",
    kind: "earnings",
    source: null,
    destination: "fund",
    amount: 1000,
    fee: 0,
    date: "2026-02-02",
    category: "",
    note: "",
  });
  assert.equal(balance(s, s.accounts[1]), 411000);
  assert.equal(summary(s, "2026-02").contributions, 100000);
  assert.equal(summary(s, "2026-02").income, 0);
});
test("reconciliation excluded from cashflow; archive preserves assets; negative availability visible", () => {
  const s = sample();
  s.transactions.push({
    id: "fix",
    kind: "adjustment",
    source: null,
    destination: "bank",
    amount: -1500000,
    fee: 0,
    date: "2026-01-02",
    category: "",
    note: "Bank check",
  });
  s.accounts[0].archived = true;
  assert.equal(totals(s).available, -300000);
  assert.equal(summary(s, "2026-01").income, 0);
  assert.equal(summary(s, "2026-01").expenses, 0);
});
test("money parsing, month-end dates, backup validation", () => {
  assert.equal(cents("1000.01"), 100001);
  assert.throws(() => cents("1.001"));
  assert.equal(
    dueDate(
      { id: "r", account: "fund", day: 31, suggested: 0, completed: [] },
      "2028-02",
    ),
    "2028-02-29",
  );
  assert.deepEqual(restore(backup(sample())), sample());
  assert.throws(() => restore('{"version":9}'));
  const s = sample();
  s.transactions[0].destination = "missing";
  assert.throws(() => validate(s));
});

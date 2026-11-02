export type Account = {
  id: string;
  name: string;
  platform: string;
  platformKey?: string;
  kind: "cash" | "bank" | "wallet" | "savings" | "investment";
  opening: number;
  archived: boolean;
  checked: string | null;
};
export type Transaction = {
  id: string;
  kind:
    | "income"
    | "expense"
    | "transfer"
    | "contribution"
    | "earnings"
    | "adjustment";
  source: string | null;
  destination: string | null;
  amount: number;
  fee: number;
  date: string;
  category: string;
  note: string;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  deadline: string;
  archived: boolean;
};
export type Allocation = {
  id: string;
  goal: string;
  account: string;
  amount: number;
};
export type Valuation = {
  id: string;
  account: string;
  amount: number;
  date: string;
};
export type Reminder = {
  id: string;
  account: string;
  day: number;
  suggested: number;
  completed: string[];
};
export type State = {
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  allocations: Allocation[];
  valuations: Valuation[];
  reminders: Reminder[];
  categories: string[];
};
export const emptyState = (): State => ({
  accounts: [],
  transactions: [],
  goals: [],
  allocations: [],
  valuations: [],
  reminders: [],
  categories: ["Food", "Transportation", "Bills", "Shopping", "Other"],
});
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function cents(value: string): number {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value.trim()))
    throw Error("Enter a peso amount with up to two decimal places.");
  const n = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(n) || Math.abs(n) > 1e12)
    throw Error("Amount is too large.");
  return n;
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    n / 100,
  );
export function movement(t: Transaction, account: string) {
  return (
    (t.destination === account ? t.amount : 0) -
    (t.source === account ? t.amount + t.fee : 0)
  );
}
export function balance(s: State, a: Account): number {
  const valuation =
    a.kind === "investment"
      ? s.valuations
          .filter((v) => v.account === a.id)
          .sort((x, y) => y.date.localeCompare(x.date))[0]
      : undefined;
  return (
    (valuation?.amount ?? a.opening) +
    s.transactions
      .filter((t) => !valuation || t.date > valuation.date)
      .reduce((n, t) => n + movement(t, a.id), 0)
  );
}
export const reserved = (s: State, id: string) =>
  s.allocations
    .filter(
      (x) =>
        x.account === id && !s.goals.find((g) => g.id === x.goal)?.archived,
    )
    .reduce((n, x) => n + x.amount, 0);
export const available = (s: State, a: Account) =>
  balance(s, a) - reserved(s, a.id);
export function totals(s: State) {
  const cash = s.accounts
    .filter((a) => a.kind !== "investment")
    .reduce((n, a) => n + balance(s, a), 0);
  const investments = s.accounts
    .filter((a) => a.kind === "investment")
    .reduce((n, a) => n + balance(s, a), 0);
  const held = s.accounts
    .filter((a) => a.kind !== "investment")
    .reduce((n, a) => n + reserved(s, a.id), 0);
  return {
    cash,
    investments,
    reserved: held,
    available: cash - held,
    assets: cash + investments,
  };
}
export function summary(s: State, month: string) {
  let income = 0,
    expenses = 0,
    contributions = 0;
  const categories: Record<string, number> = {};
  for (const t of s.transactions.filter((t) => t.date.startsWith(month))) {
    if (
      t.kind === "income" ||
      (t.kind === "earnings" &&
        s.accounts.find((a) => a.id === t.destination)?.kind !== "investment")
    )
      income += t.amount;
    if (t.kind === "expense") {
      expenses += t.amount;
      categories[t.category || "Other"] =
        (categories[t.category || "Other"] || 0) + t.amount;
    }
    if (t.fee) {
      expenses += t.fee;
      categories["Transfer fees"] = (categories["Transfer fees"] || 0) + t.fee;
    }
    if (t.kind === "contribution") contributions += t.amount;
  }
  return { income, expenses, contributions, categories };
}
export function dueDate(r: Reminder, month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(Math.min(r.day, new Date(y, m, 0).getDate())).padStart(2, "0")}`;
}
export function validate(s: State): void {
  if (
    !s ||
    ![
      "accounts",
      "transactions",
      "goals",
      "allocations",
      "valuations",
      "reminders",
      "categories",
    ].every((k) => Array.isArray((s as any)[k]))
  )
    throw Error("Invalid backup structure.");
  const fields = (
    rows: unknown[],
    strings: string[],
    booleans: string[] = [],
    nullable: string[] = [],
  ) => {
    for (const row of rows) {
      if (!row || typeof row !== "object") throw Error("Invalid record.");
      const record = row as Record<string, unknown>;
      if (
        strings.some((k) => typeof record[k] !== "string") ||
        booleans.some((k) => typeof record[k] !== "boolean") ||
        nullable.some(
          (k) => record[k] !== null && typeof record[k] !== "string",
        )
      )
        throw Error("Invalid record fields.");
    }
  };
  fields(
    s.accounts,
    ["id", "name", "platform", "kind"],
    ["archived"],
    ["checked"],
  );
  fields(
    s.transactions,
    ["id", "kind", "date", "category", "note"],
    [],
    ["source", "destination"],
  );
  fields(s.goals, ["id", "name", "deadline"], ["archived"]);
  fields(s.allocations, ["id", "goal", "account"]);
  fields(s.valuations, ["id", "account", "date"]);
  fields(s.reminders, ["id", "account"]);
  const amount = (n: unknown, negative = false) => {
    if (
      typeof n !== "number" ||
      !Number.isSafeInteger(n) ||
      Math.abs(n) > 1e12 ||
      (!negative && n < 0)
    )
      throw Error("Invalid money amount.");
  };
  const date = (d: string) => {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
      new Date(d + "T00:00:00Z").toISOString().slice(0, 10) !== d
    )
      throw Error("Use a valid YYYY-MM-DD date.");
  };
  const account = (id: string | null) => {
    const a = s.accounts.find((a) => a.id === id);
    if (!a) throw Error("Select an existing account.");
    return a;
  };
  for (const rows of [
    s.accounts,
    s.transactions,
    s.goals,
    s.allocations,
    s.valuations,
    s.reminders,
  ]) {
    if (new Set(rows.map((x) => x.id)).size !== rows.length)
      throw Error("Duplicate record.");
    for (const row of rows)
      if (typeof row.id !== "string" || !row.id)
        throw Error("Missing record ID.");
  }
  for (const a of s.accounts) {
    if (
      !a.name.trim() ||
      !["cash", "bank", "wallet", "savings", "investment"].includes(a.kind)
    )
      throw Error("Account name and type are required.");
    amount(a.opening, true);
    if (a.checked) date(a.checked);
  }
  for (const t of s.transactions) {
    date(t.date);
    if (t.date > today())
      throw Error("Record actual transactions dated today or earlier.");
    amount(t.amount, t.kind === "adjustment");
    amount(t.fee);
    if (
      ![
        "income",
        "expense",
        "transfer",
        "contribution",
        "earnings",
        "adjustment",
      ].includes(t.kind)
    )
      throw Error("Invalid transaction type.");
    if (t.kind !== "adjustment" && t.amount <= 0)
      throw Error("Amount must be positive.");
    if (t.source) account(t.source);
    if (t.destination) account(t.destination);
    if (t.source && t.source === t.destination)
      throw Error("Choose different accounts.");
    if (["expense", "transfer", "contribution"].includes(t.kind) && !t.source)
      throw Error("Choose a source.");
    if (t.kind !== "expense" && !t.destination)
      throw Error("Choose a destination.");
    if (["income", "earnings", "adjustment"].includes(t.kind) && t.source)
      throw Error("This entry only needs a destination.");
    if (t.kind === "expense" && t.destination)
      throw Error("An expense only needs a source.");
    if (
      t.kind === "contribution" &&
      (account(t.source).kind === "investment" ||
        account(t.destination).kind !== "investment")
    )
      throw Error("Choose cash as source and an investment as destination.");
    if (t.fee && !["transfer", "contribution"].includes(t.kind))
      throw Error("Fees belong to transfers or contributions.");
    if (t.kind === "adjustment" && !t.note.trim())
      throw Error("Explain the balance adjustment.");
  }
  for (const g of s.goals) {
    amount(g.target);
    if (g.target <= 0 || !g.name.trim())
      throw Error("Goal name and positive target required.");
    if (g.deadline) date(g.deadline);
  }
  for (const a of s.allocations) {
    amount(a.amount);
    if (
      account(a.account).kind === "investment" ||
      !s.goals.some((g) => g.id === a.goal && !g.archived)
    )
      throw Error("Choose an active goal and cash account.");
  }
  for (const v of s.valuations) {
    date(v.date);
    amount(v.amount);
    if (v.date > today() || account(v.account).kind !== "investment")
      throw Error(
        "Choose an investment and a valuation date no later than today.",
      );
    if (
      s.valuations.filter((x) => x.account === v.account && x.date === v.date)
        .length > 1
    )
      throw Error("Only one valuation per investment per day.");
  }
  for (const r of s.reminders) {
    account(r.account);
    amount(r.suggested);
    if (
      account(r.account).kind !== "investment" ||
      !Number.isInteger(r.day) ||
      r.day < 1 ||
      r.day > 31 ||
      !Array.isArray(r.completed) ||
      r.completed.some((m) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(m))
    )
      throw Error("Invalid reminder.");
  }
  if (
    s.categories.some((c) => typeof c !== "string" || !c.trim()) ||
    new Set(s.categories).size !== s.categories.length
  )
    throw Error("Invalid categories.");
}
export function backup(s: State) {
  validate(s);
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), data: s },
    null,
    2,
  );
}
export function restore(text: string): State {
  const file = JSON.parse(text);
  if (file.version !== 1) throw Error("Unsupported backup version.");
  validate(file.data);
  return file.data;
}

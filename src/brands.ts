import { Account, State } from "./finance";
export const brands: Record<
  string,
  { name: string }
> = {
  gcash: { name: "GCash" },
  maya: { name: "Maya" },
  bpi: { name: "BPI" },
  metrobank: { name: "Metrobank" },
  "security-bank": { name: "Security Bank" },
};
export function brandKey(a: Account) {
  if (a.platformKey && brands[a.platformKey]) return a.platformKey;
  const text = (a.platform + " " + a.name).toLowerCase();
  return (
    Object.keys(brands).find((k) => text.includes(k.replace("-", " "))) ?? ""
  );
}
export function seedAccounts(state: State): State {
  const next = { ...state, accounts: [...state.accounts] };
  for (const [key, name, kind] of [
    ["gcash", "GCash", "wallet"],
    ["maya", "Maya Wallet", "wallet"],
    ["maya", "Maya Savings", "savings"],
    ["bpi", "BPI", "bank"],
    ["metrobank", "Metrobank", "bank"],
    ["security-bank", "Security Bank", "bank"],
  ] as const) {
    const matches = next.accounts.filter(
      (a) =>
        brandKey(a) === key &&
        a.kind !== "investment" &&
        (key !== "maya" ||
          a.kind === kind ||
          a.name
            .toLowerCase()
            .includes(kind === "wallet" ? "wallet" : "savings")),
    );
    if (matches.length) {
      if (matches.length === 1)
        next.accounts = next.accounts.map((a) =>
          a.id === matches[0].id ? { ...a, platformKey: key } : a,
        );
      continue;
    }
    next.accounts.push({
      id: "starter-" + name.toLowerCase().replaceAll(" ", "-"),
      name,
      platform: brands[key].name,
      platformKey: key,
      kind,
      opening: 0,
      archived: false,
      checked: null,
    });
  }
  return next;
}

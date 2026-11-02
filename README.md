# Personal Finance Tracker

A **local-first, offline Android finance tracker** with manual inputs and an editable transaction log. Track money spread across banks, wallets, savings goals, and investments without connecting banking accounts.

Your records live in SQLite on your phone. Daily use requires no internet, registration, backend, or bank API. You enter the numbers and check them against your banking apps.

> Early V0 source checkpoint. Automated checks pass; physical-device layout, accessibility, backup/restore, and installed-update checks are not yet fully verified.

## Features

- **Accounts:** branded cards for GCash, Maya Wallet, Maya Savings, BPI, Metrobank, and Security Bank, plus custom accounts. Starter balances are zero; no real or demo money is preloaded.
- **Manual inputs and logs:** record income, expenses, transfers, investment contributions, interest/dividends, and balance adjustments. Search, filter, edit, or delete records. This is an editable personal ledger, not an immutable audit log.
- **Clear balances:** actual, reserved, available, and total tracked assets without counting money twice.
- **Savings and investments:** reserve cash for goals, track variable contributions, enter valuations, and use monthly in-app reminders.
- **Visual summaries:** cash-flow charts, ranked spending categories, contribution charts, and goal progress.
- **Display privacy:** an eye toggle hides financial amounts and plots. It does not encrypt stored records or backups.

## Manual tracking

1. Set starting balances. Do not also record the same opening money as income.
2. Log income and spending against the account involved.
3. Enter a transfer once with its source, destination, and optional fee. Only the fee counts as spending.
4. Use a card's pencil to reconcile with the actual banking-app balance. Differences become dated adjustments, excluded from income and spending.

Available cash equals actual cash/bank/wallet/savings balances minus active goal reservations. Investments contribute to total assets, but not available cash. Goals reserve existing money without making bank transfers; release a reservation before spending goal money and record the purchase separately. Archived accounts retain their balances and history.

Investment valuations are end-of-day totals covering activity through the selected date; only later dates' movements are added. Reconfirm valuations after adding same-day activity or correcting earlier records. Record dividends into the account that receives them. Reminders never assume a payment happened or move money.

## Local storage, backup and recovery

Records are saved transactionally in app-private SQLite storage. There is no cloud sync, automatic bank import, or automatic Android cloud backup.

- **Export:** Settings > Export backup opens Android's share interface for version-1 JSON. Save it outside the app, preferably somewhere independent of the phone. Opening or dismissing the share sheet does not confirm a file was saved.
- **Restore:** Settings > Restore backup validates the file and asks before replacing financial records. Invalid files and failed writes leave existing records unchanged.
- **Recovery:** uninstalling, clearing app data, or losing the phone can lose entries since the last independently saved backup. Normal signed updates are intended to preserve records.

Backups contain plain-text financial history. Protect them yourself. Local storage relies on the Android app sandbox and phone lock; V0 has no separate PIN or database encryption.

## Run from source

Use Node.js **22.22 or newer** and npm. Tests use Node's built-in SQLite driver.

```sh
git clone https://github.com/MannLester/personal-finance-tracker.git
cd personal-finance-tracker
npm ci
npm start
```

Native modules need a compatible Expo development environment or Android build. Development previews may need your computer/network; the standalone installed APK works offline for daily use.

```sh
npm run typecheck
npm test
npx expo install --check
npm audit --omit=dev
npm run export:android
```

Android export produces a JavaScript bundle in `dist/`, not an APK. Tests cover financial calculations, SQLite persistence and upgrades, backup compatibility, and starter accounts. They do not replace phone testing.

## Build an Android APK

```sh
npm run build:android
```

Cloud builds require internet and an authorized Expo account. This checkout retains the existing personal Expo owner/project link. Other users should create their own EAS project and update `expo.owner`, `expo.slug`, and `expo.extra.eas.projectId` before building with their own account.

For an existing installation, retain its Android package ID and signing key, and increase `android.versionCode` for updates. Display and repository names can change without changing installation identity.

This checkpoint publishes source; no new public APK is attached. The previous personal APK predates this rename/version metadata update.

## Versions and checkpoints

| Reference | Purpose |
| --- | --- |
| [`main`](https://github.com/MannLester/personal-finance-tracker/tree/main) | Latest development, potentially ahead of a release. |
| [`version/0`](https://github.com/MannLester/personal-finance-tracker/tree/version/0) | V0 maintenance line, which can advance with fixes. |
| [`v0.1.0`](https://github.com/MannLester/personal-finance-tracker/tree/v0.1.0) | Fixed, reproducible V0 source checkpoint. |

Use the tag for the exact checkpoint:

```sh
git switch --detach v0.1.0
npm ci
```

Or download the [V0 source ZIP](https://github.com/MannLester/personal-finance-tracker/archive/refs/tags/v0.1.0.zip). To develop changes from it, use `git switch -c my-changes v0.1.0`.

Future released major versions get `version/1`, `version/2`, etc. when they actually exist. Exact releases use immutable `vMAJOR.MINOR.PATCH` tags. See [CHANGELOG.md](CHANGELOG.md) for version history and [AGENTS.md](AGENTS.md) for development/release rules.

## Project notes

Built with React Native, Expo, TypeScript, and SQLite. Bank/platform marks identify accounts only; the project is independent of those providers. See [asset sources](assets/brands/SOURCES.md).

Local `/docs` contains private working documentation and is excluded from Git. Never commit financial records, backups, credentials, APKs, or signing keys.

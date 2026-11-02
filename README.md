# Mann Finance

Personal Android finance tracker built with Expo, React Native, TypeScript and SQLite. All financial records stay on your phone. No sign-in, Supabase setup, environment variables, or internet connection is required for daily use.

## Run and build

Use Node 22.22 or newer (tests use Node's built-in SQLite), then run npm ci and npm start for development. To create a standalone APK, run npm run build:android with your Expo account. The existing EAS project is @gssjsbs/mann-personal-finance-tracker. Preserve its Android application ID and signing key for updates; increment android.versionCode for subsequent versions. Cloud builds need internet; installed daily tracking does not.

## Your records

Create your accounts and starting balances, then record income, spending, transfers and investment contributions. Starting balances must not also be recorded as income. Accounts emphasize available money, with actual and reserved balances below. Investments are included in total assets but excluded from available cash. Transfers are not income or spending; their fees are expenses.

Savings goals reserve existing cash without moving it between banks. Release reservations before spending goal money, and record the actual expense separately. Finishing a goal releases reservations without generating an expense. Reconciliation checks actual bank balances, not available money. Archived accounts retain balances and history.

Investment valuations are end-of-day totals covering all transactions through the selected date. Only subsequent dates' movements are added. Reconfirm a valuation after adding same-day activity or correcting covered history. Record dividends into their actual receiving account, and do not record a valuation as earnings. Reminder suggestions are optional; actual contributions may vary. Recording a contribution and marking the current month's reminder complete are separate actions. Reminders appear inside the app without push notifications.

## Manual backup and restore

Settings > Export backup opens Android's share interface for a version-1 JSON file. Save it outside the app, preferably on another device or storage you control. Opening or dismissing the share sheet does not mean a file was saved. Backups contain plain-text financial history; store them privately.

Settings > Restore backup validates the file and asks before replacing all records in a single SQLite transaction. Compatible version-1 backups from the previous implementation still work. Invalid files and failed writes leave existing records unchanged. Local corruption is not silently reset; the load-error screen offers retry and explicit restore where the schema remains usable.

No automatic cloud or Android backup is configured. Uninstalling, clearing app data, or losing your phone can lose records since your last independently saved backup. Normal signed app updates preserve the database. Standard app-private storage and your phone lock provide access protection; no separate PIN or database encryption is added.

## Verification

Run npm run typecheck, npm test, npx expo install --check, npm audit --omit=dev, and npm run export:android. Tests run the actual storage SQL against SQLite through Node's driver, plus financial calculation tests. The Expo native adapter and Android file-sharing behavior still need testing on a phone. The dist directory is a JavaScript bundle, not an APK.

On your phone, verify airplane-mode first launch, daily entry, restart persistence, variable contributions, reminders, reconciliation, backup/restore and updating an installed app without losing records. Local working documentation is in ignored /docs and must not be committed.

## Wallet redesign

Dark-only mint wallet layout with branded two-column account tiles. The eye button hides amounts and monetary plots across screens. Account pencils reconcile actual balances through adjustments; tap a tile for account details. New starter accounts begin at zero, with Maya Wallet and Maya Savings separate. Migration preserves existing accounts; restores do not recreate starter records. Cash-flow and contribution charts show the last six calendar months; spending categories use ranked bars. All logo assets and icon fonts are bundled offline.

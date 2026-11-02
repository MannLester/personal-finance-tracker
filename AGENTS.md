# Project instructions

The active project boundary is this directory. Do not inspect parent or sibling projects.

The user has approved the v0 scope and technical plan for an Android-only, fully offline personal finance tracker. React Native/Expo, TypeScript and local SQLite are the approved stack. Keep changes focused on simple CRUD and financial correctness; avoid introducing additional infrastructure or features without approval.

`project-ideation`, `project-documentation`, and `mvp-scoping` are suspended while under construction, until the user explicitly re-enables them. Follow the documentation and approval rules directly without invoking these skills.

Maintain local `/docs` throughout development. Never commit `/docs/**`, credentials, backups or signing keys. Use modular commits if the user requests committing/pushing; no commits or pushes are implicitly requested by implementation work.

Run `npm run typecheck`, `npm test`, `npx expo install --check`, and `npm run export:android` for meaningful application changes. A JavaScript export is not an APK or evidence of successful physical-device testing.

The approved visual redesign uses a dark mint wallet theme, branded account grid, offline charts, balance reconciliation pencils and global display privacy. Preserve existing user data on schema upgrades, seed missing starter accounts only once, and keep version-1 financial backups compatible.

## Identity and version-control strategy

- Public project/app name: Personal Finance Tracker. Repository: `MannLester/personal-finance-tracker`. Preserve the Android package ID, signing key and existing Expo link for installation updates unless a separate identity is explicitly requested.
- `main` contains the latest coherent, verified development and can be ahead of a release. Use short-lived feature/fix branches when useful and merge approved work back into `main`.
- Keep one `version/<major>` maintenance branch per released major line, starting with `version/0`. It can advance with compatible fixes while preserving that line's scope. A branch is a moving reference, not an exact checkpoint.
- Develop the next major on `main`, retaining older maintenance branches. Create `version/1`, `version/2`, etc. only when each first checkpoint is ready; do not create empty placeholder branches.
- Exact checkpoints use annotated, immutable `vMAJOR.MINOR.PATCH` tags, starting with `v0.1.0`. Never move, delete or reuse a published tag. Users should check out its tag/commit for reproducible source.
- Use semantic versions: patch for compatible fixes, minor for compatible features, major for a new major product/compatibility line. During V0, still identify breaking changes and migrations explicitly; never silently discard existing data.
- Keep `package.json`, lockfile root metadata and `expo.version` synchronized for checkpoints. Android `versionCode` is separate and must increase for every distributed APK update, including maintenance builds.
- Before tagging, inventory files/hunks and review each staged diff, create modular commits using the established prefixes, update README and CHANGELOG with behavior/limitations/migrations, complete applicable checks, and audit every proposed commit for excluded files. Never commit `/docs/**`, credentials, financial records, backups, databases, build output or signing keys.
- Create a new major's maintenance branch from its verified `main` checkpoint commit. Apply maintenance fixes on the relevant version branch, carry applicable fixes forward to `main`, update changelog/version metadata, and tag the verified maintenance commit. Do not merge next-major features into an older version line.
- Push intended branches and annotated tags explicitly after reviewing the ordered commit lists. Ordinary implementation does not authorize a new checkpoint/release: tagging or publication requires a user request or an already approved release task.
- Distinguish source checkpoints from APK releases. Attach binaries only if built from the tagged source and verified; never relabel an older APK as a newer release. Do not force-push shared branches or rewrite published history without explicit authorization.

# Project instructions

The active project boundary is this directory. Do not inspect parent or sibling projects.

The user has approved the v0 scope and technical plan for an Android-only, fully offline personal finance tracker. React Native/Expo, TypeScript and local SQLite are the approved stack. Keep changes focused on simple CRUD and financial correctness; avoid introducing additional infrastructure or features without approval.

`project-ideation`, `project-documentation`, and `mvp-scoping` are suspended while under construction, until the user explicitly re-enables them. Follow the documentation and approval rules directly without invoking these skills.

Maintain local `/docs` throughout development. Never commit `/docs/**`, credentials, backups or signing keys. Use modular commits if the user requests committing/pushing; no commits or pushes are implicitly requested by implementation work.

Run `npm run typecheck`, `npm test`, `npx expo install --check`, and `npm run export:android` for meaningful application changes. A JavaScript export is not an APK or evidence of successful physical-device testing.

The approved visual redesign uses a dark mint wallet theme, branded account grid, offline charts, balance reconciliation pencils and global display privacy. Preserve existing user data on schema upgrades, seed missing starter accounts only once, and keep version-1 financial backups compatible.

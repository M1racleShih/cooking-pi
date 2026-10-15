# Working on cooking-pi

- Read README.md and docs/decisions.md before changing the default recipes.
- Keep the native Pi directory and original extension worktrees untouched. Test with dedicated temporary agent directories and workspaces.
- Never import credentials, real sessions, account profiles, private endpoints, caches, backups, generated skills or unchecked logs.
- Runtime dependencies are pinned in package.json and package-lock.json. Disable install scripts. A new version requires resource-load and terminal verification.
- Keep setup, conflict detection, backups and uninstall preservation covered by meaningful tests. Preserve the caller's working directory.
- The HUD snapshot is attributable third-party source. Retain licenses and update ORIGIN.json if its runtime files change; prefer a suitable independent upstream release when possible.
- Run npm run verify. Changes to runtime behavior or extension combinations also require npm run test:tui. Fixtures must not contact providers or access production data.
- Do not automatically spawn other agents or publish external changes unless the human has authorized that scope.

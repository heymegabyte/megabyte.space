# fire-320 — retained commit-guard fixture recovery

Inspected current git state, fetched origin/main, recent GitHub Actions history, and failed
receipts for runs 40240495517 and 40228684435. Origin/main remains the incoming d441f11c;
7faa7d71 is its ancestor. The latest failed worktree is clean. Run 40228684435 retains
an uncommitted three-line test extension; copied its actual patch into this assigned
worktree without mutating the retained tree. No unpublished result commit was found in
those two failed receipts/worktree tips.

The extension tests Git copy records whose source AND destination contain Unicode,
tabs and newlines, for parent watched paths and fork paths. Existing tests covered each
path independently. Exact C-entry assertions and an independent following edit guard
against framing bugs and unrelated-failure false positives. Focused suite passes 17/17.
No production implementation changed. This closes retained verification work, not a
new product capability or a migration acceptance item.

Read-only adversarial review found no blocking issue. It confirmed exact-entry assertions
matter because a modified copy source also makes the fork dirty. The ignored nested-Git
fixtures do not prove real submodule gitlink/remote publication behavior.

Fresh declared-remote gate fetches unchanged fork 0eeb9053ea9e22644ba1c0e43addc1f7834e271c.
Official upstream advertises bd10b0ece6842b8f486b3467eab6cc3b9c920920 (unchanged from the
previous inventory). No adoption or expanded source-review coverage is claimed.
The deployment receipt still names 80b7209e from 2026-10-09; detector reports drift.
That is a receipt comparison, not evidence of the actual live Worker SHA.

No deployment, authenticated journey, native-client acceptance, storage reconciliation,
visual review or matrix score was performed. Migration acceptance remains open.

Validation after frozen root install via `corepack pnpm install --frozen-lockfile`:
full root script suite 137/137; scripts TypeScript gate green; `git diff --check` green.
Initial full-suite attempt lacked jsonc-parser; the install resolved that prerequisite.
The Volta pnpm shim was unavailable; corepack used the repo-pinned pnpm 11.17.0.
Fork dependencies/builds were not needed for this test-only recovery and are not credited.

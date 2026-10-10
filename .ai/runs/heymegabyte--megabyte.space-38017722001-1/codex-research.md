# Fire-302 independent control-plane research

ADR 0002 and docs/MIGRATION.md supersede legacy absorption work. Selected one bounded WS-6 migration-readiness inventory, no production mutation or submodule move.

GitHub API and Git ls-remote agree on official main 7ec49d8c865917c7be0401938eadc7218ed9d398. Compare from legacy pin 80b7209e reports diverged: 222 upstream-side commits, 207 legacy-side commits, merge base 6478a1448a11524e2f7c2575ad66fab0bc47c433. GitHub returned 300 changed files; this is a capped list, not a complete diff. Release and tag endpoints both returned empty arrays. These are observations, not a reviewed release recommendation.

Configured fork URL returns Repository not found for ordinary clone and existing gh credential-helper clone; gh repository API returns 404. Cannot distinguish deletion, visibility or authorization. Retained initialized worktrees were inspected read-only; none could resolve the exact current pin with cat-file. Canonical cloudflare-os lacks its own Git marker and Git falls back to parent: parent HEAD is not fork evidence. Upstream commit API resolves the legacy SHA, but that alone does not establish supported Git-fetch provenance or authorize URL replacement.

Recent success commits 231603f6 and 45d22cb1 are in main. Latest failed retained result 6e13c5d9 is also an origin/main ancestor and its worktree is clean; no salvage/reimplementation needed. Older failure receipts record incomplete product acceptance, not permission to credit production verification.

Cloudflare global key availability check passes without reading/printing its value; BA E2E email/password and direct DeepSeek key availability checks fail. Source initialization blocks frozen fork install/build/check. No paid compute fallback, Browser Harness, production requests, deployment, visual score, or journey credit.

Loop improvement: consult active migration ADR before selecting legacy backlog; unavailable declared fork is a provenance blocker even when an upstream API resolves a SHA. Next: restore authorized fork access or explicitly approve a verified provenance change, then complete source review and frozen installs before protected evaluation. Existing migration decisions remain pending.

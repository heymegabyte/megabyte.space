# Independent source migration review — fire-303

Recorded before reading the Claude review. Research only; no pin or production changes.

## Ground truth

The declared fork URL now clones successfully. The current outer gitlink is
`1739f1915af71f12c4bb3802458502c6453ba450`, not the previous inventory's `80b7209e`.
Official upstream HEAD fetched directly from `cloudflare/cloudflare-os` is
`7ec49d8c865917c7be0401938eadc7218ed9d398`. Full local Git comparison:
1,336 paths; 317,084 insertions; 68,043 deletions; 208 legacy-only / 222 upstream-only
commits; merge base `6478a1448a11524e2f7c2575ad66fab0bc47c433`.
`source-diff-name-status.txt` is the complete uncapped path inventory, not a complete
semantic audit. These refs must remain immutable in follow-up checks.

## Migration decisions

1. **Fresh stack, not an in-place upgrade.** Official router removes BA_GATE, AUTH,
   AUTH_ENABLED and fork login HTML (`packages/router/src/index.ts`). Official
   `packages/workshop-backend/src/access.ts` removes verifyBetterAuthSession but
   retains issuer/audience verification with jose. The legacy auth rail must stay
   with the legacy worker identities; no reuse of its cookies as official OS auth.
   Eval/apex require independently verified Access allow/deny and admin enforcement.
2. **Build/config adapter review required before a pin move.** Upstream adds a scripts
   workspace, package-addressable `@gadgets/scripts`, cloudflare.config.ts generators
   and release-manifest binding templates (`scripts/release/manifest-lib.ts`).
   Wrangler files become generated inputs. Catalog changes include capnweb 0.12,
   capnweb-validate 0.3, vite-plus 1.0 and newer Wrangler/test-pool versions;
   gatekeeper task caching moves beneath cache and commands become gadgets-* bins.
   Starter-owned custom/error gatekeepers and deployment generation must be tested
   against the exact candidate without changing the production pin. Mirror catalog
   and lockfiles together; current-pin unit success is not candidate compatibility.
3. **Preserve DO identities.** Upstream Workshop migration list retains PendingLogin and adds
   UserDirectoryDurableObject (`packages/workshop-backend/cloudflare.config.ts`).
   Overseer storage version is 5, including Yjs-code-log to Git conversion and later
   action-index, workpiece-type and blueprint-upstream backfills
   (`src/storage-schema/overseer-migrations.ts`). New fresh worker names isolate state;
   these migrations do not authorize attaching legacy DOs or downgrading them.
4. **Approval behavior is a new review surface.** Legacy-only approvalStore.ts is
   absent upstream. Official autoApprovalRule requires author autoApprovable=true,
   an action-kind tag, no restricted-data latch, and a stored user-enabled rule.
   AutoApprovalDrainer stops at a manual gate and attributes application to enabledBy
   (`src/auto-approval.ts`). This differs from the legacy deploy-only allowlist;
   neither policy should silently substitute for the other. Native Google creation
   and approver-account actions need focused tests before integration acceptance.

## Evidence limits

Both current-pin locked installs succeeded using corepack pnpm 11.17.0. Plain pnpm
is unavailable via Volta; recursive child commands need a run-local shim. No global
configuration was changed. Current-pin deploy unit tests: 26 pass; fire/deploy-state
regressions: 17 pass. Full check result is recorded separately. No candidate build,
paid inference, authenticated browser journey, visual score or deployment is claimed.
Prior successful commits and the latest failed retained commit are in origin/main;
retained worktrees are clean. No salvage or cleanup was needed.


## Recovery and independent-review reconciliation

All failed retained receipts were inspected. `8770b90e` is not an ancestor of main,
so it is not credited as published by SHA. Its three changes were replayed on main
as `4884a465`, `aa97e8fb`, `366fe8ac`; the guard/test files match exactly and the
fire-273 ledger entry is present. No missing verified slice remains to recover.
Other failed result commits are ancestors of origin/main; all retained trees are clean.

Claude subscription review via `cr` completed, but its tool sandbox blocked upstream
Git reads. Its path-only inferences are recorded with that limitation in
`claude-review.txt`, not treated as an independent source audit. Main-thread exact
source inspection corroborates config generation/auth removal/storage-version and
approval changes; candidate runtime acceptance still needs a complete source review.
One nuance: PendingLogin already exists in the current fork migration history;
upstream's migration list includes it and adds UserDirectory at v3. Do not describe
PendingLogin as newly introduced relative to this fork. Generated wrangler files
are committed upstream; generation changes alone do not prove the starter breaks.


## Final current-pin verification

Full `pnpm check` (via run-local Corepack launcher) exited 0: submodule resolution,
65 reachable static routes, component/accent checks, scripts typecheck, 106 scripts
tests, 52 workspace tests, Context/Scheduler apps, frontend and worker typechecks/builds,
and six Wrangler Worker dry-runs. This validates the current legacy pin only. The
launcher was removed after completion. Deprecation/large-chunk and validator skipped
cross-package-file warnings remain; no inference or product deployment was performed.
Fresh GitHub release/tag queries returned zero entries. Deployment receipt drift remains
unresolved; anonymous HTTP 200 is not version proof. No generated source changed.

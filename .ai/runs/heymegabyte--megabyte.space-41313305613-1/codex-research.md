# Fire-344 independent research

- Fetched `origin/main` remains bb2e1770; retained 73485952 and 10579d46 are not
  ancestors. Inspected their actual clean retained worktrees and documentation diffs.
- Recovered documentation commits as 2c1f1f10 and 8873da23 without transplanting
  old bookkeeping. Independent read-only reviewer found no blocker.
- Normal Git/gh retrieval stalled; an unset session-bus variable also stalled.
  A process-local unavailable-bus probe produced terminal results without changing
  credential files, helper configuration, remote or pin. HTTP 401 for `gh api user`
  under that probe does not establish the normal session's auth status.
- Git bootstrap completed at the exact committed pin 240899ec34e822a0afa695e3c7b48a41c2db9c4c.
  Own-workspace preflight and strict committed-source guard pass; the source tree
  is clean. The separate declared-remote exact-SHA fetch also passed.
- Both frozen installs completed with pnpm 11.17.0. The ambient Volta pnpm shim
  failed with exit 126, so the documented pinned npx launcher was used. No global
  toolchain setting changed.
- Focused regression suite: 74/74 passed. Full wrapper result is recorded separately
  only after terminal completion. No production, native-client, authenticated
  browser, storage-reconciliation or visual acceptance follows from these checks.

The useful loop improvement is the bounded session-bus differential diagnostic,
with explicit credential-resolution limits. Remaining journal recovery is a
separate slice after the complete source/build gate; no historical fixture report
is credited as fresh acceptance.

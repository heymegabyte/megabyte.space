# Fire-359 independent provenance review

Assigned base b9d32289 is an ancestor of freshly fetched origin/main. GitHub Actions
reports 42020651185 success and 41963669270 failure. Inspected both local reports,
retained worktree inventory and current source; recovered collector files already
exist on main, so no transplant is warranted.

## Findings from current call sites

- Collector checkpoint payloads contain whole partial snapshots. Journal append
  accepts plan/intent/outcome events. The two callbacks are not interchangeable.
- Production deployWorker invokes Wrangler without journal imports or intent
  append; record-deploy reads post-command HEAD/gitlink and writes a local receipt.
  Passing offline tests cannot credit provider-call protection or source identity.
- Collector detaches allowlisted primitives before validation and persistence;
  JSON checkpoint reopening is covered. No additional serialization blocker found
  within the existing trusted-adapter boundary. This is not hostile-input security.
- Confirmation checks compare deployment/version/allocation identity and timestamp
  ordering; matching sweeps cannot establish atomic freshness or detect ABA.
- Historical present-tense unrecovered wording can mislead readers after fire-358.
  Correct it while preserving dated evidence and current acceptance boundaries.

## Fresh evidence

Focused collector/assessor/journal/crash suite: 80/80 pass. Node syntax checks and
whitespace check pass. Bounded sequential exact-pin initialization succeeds;
check-fork-workspace reports expected and actual 240899ec34e822a0afa695e3c7b48a41c2db9c4c.
Both outer and fork began clean. No frozen installs or full build were run.
The existing receipt differs from the pin, which does not identify deployed source.

## Execution boundaries

This is a documentation/current-state review only. No OpenSpec authorship, runtime
code, production changes, remote provider acceptance, migration, browser journey,
visual score or deployment credit. Smallest relevant skill: operating-system;
canonical skill-router returned no additional selected skills for this scope.
DeepSeek documentation delegation timed out at 75 seconds with no edits; the
lead applied the narrow correction after confirming it had terminated.
A cr -p review attempt was rejected because routing selected Codex, where -p is
a profile flag. Retried with explicit cr --provider codex exec --sandbox read-only;
its terminal outcome is recorded separately in review-synthesis and run report.

# Fire-351 — recovery and terminal verification

## Independent orientation

Assigned base and fetched origin/main both resolve to bb2e1770. Live GitHub history
reports failures for 41562457005 and 41512626351. Retained 21477422 is not an
ancestor of fetched main. Reviewed its actual documentation-only chain and
recovered nine commits as 21de140c..d679c6eb, excluding old bookkeeping.
The latest retained worktree has uncommitted provenance wording, BACKLOG and
research; inspected read-only. Reapplied only historical-fire wording clarification.
Its unverified acceptance ticks were not inherited.

ADR 0002 and docs/MIGRATION.md govern the migration scope. No product code,
submodule pin/remote, credentials, production configuration or receipt changed.
The legacy provider-policy path is absent; incoming subscription restrictions apply.

## Observed verification

Exact declared fork 240899ec initialized successfully. Own-workspace identity and
exact declared-remote fetch both passed. Focused fork/provenance/lease/clean-tree
fixtures passed 49/49 with exit 0. Root frozen offline install completed with
pnpm 11.17.0 in 1m 17.9s, exit 0. Fork frozen offline install also exited 0 in 1m 13s. The post-install script
suite passed 200/200, exit 0. A run-local PATH shim preserves pnpm 11.17.0
for child shells; its version probe passed. Wrapper outcome is recorded below.

Invocation cgroup memory.max is 2 GiB; limiting fleet ancestor is 10 GiB.
Default Node heap is 846 MiB. No host settings or heap limits were changed.

## Convergence and review

Independent read-only adversarial review found no documentation blocker and
confirmed historical evidence remains scoped. It separately reviewed the new
report-checkpoint rule with no blocker. The improvement creates an initial
non-secret report after orientation and updates terminal outcomes before closing;
incomplete remains incomplete if interrupted. No deployment, authenticated
journey, native-client, storage, visual or migration acceptance is claimed.

## Terminal wrapper outcome

The bounded `pnpm check` exited 124 after 150 seconds. Local identity, declared
remote, interconnect and script typechecking passed; nested script tests passed
200/200 and four workspace test tasks passed (23 + 25 + 2 + 2 tests). It reached
Context `build:app` and transformed 5,043 modules before timeout SIGTERM. This
proves neither a source defect nor full build/Worker dry-run acceptance. No heap
retry was attempted. Keep full wrapper, journal recovery and runtime gates open.

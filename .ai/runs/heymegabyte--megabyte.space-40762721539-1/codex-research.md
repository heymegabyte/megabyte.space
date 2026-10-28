# Fire-327 recovery assessment — 2026-10-28

Fetched origin/main is 835464fe, the incoming base. Failed Actions runs 40617245413,
40655654286 and 40713865613 retained unpublished offline rollout metadata assessment
work. Latest retained tree has additional uncommitted command/artifact edits; those
were inspected read-only and left untouched. The committed helper/tests are recovered
via 22d1d93e as 420ba7f9. The terminal-evidence loop improvement is recovered via
7a79cf7a as 5203f011. Prior bookkeeping is not imported because it describes another
run's checks and recovered SHAs.

Independent assessment: this pure helper validates complete declared scope, exact
version/account/manifest observations and a single 100% allocation. It cannot prove
source bytes, authenticate observations or detect changes after collection. It caps
all accepted evidence labels at metadata-only. It does not integrate deployment or
write historical receipts. All 29 focused tests passed freshly. A separate read-only
adversarial reviewer found no concrete scoped defect and independently passed 29/29.

The frozen installs and full wrapper outcome are tracked in this run's agent-report,
not inherited from failed receipts. The initial bare pnpm invocation exited 126;
the pinned npx launcher is used instead. The declared fork initialized successfully
at unchanged e89c7af7. Receipt mismatch with 80b7209e remains advisory only.

Next unmet unit: immutable snapshot/artifact manifest and durable journal; concurrent
rollout observation invalidation/re-read; approved isolated metadata round-trip.
No deployment, upstream adoption, production mutation, authenticated journey, storage
reconciliation or visual acceptance is claimed. Modifier scores remain unchanged.

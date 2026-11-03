# Fire-353 — retained terminal evidence reconciliation

Fetched origin/main contains assigned base 54f7ab22. GitHub run 41682661910
failed without a result commit beyond that base. Its retained tree has an
uncommitted timeout-budget instruction and research files; no implementation
commit needs cherry-picking. Read those files without modifying that tree.
Recover only the three-line loop guidance, not stale pending-check claims.

The retained check.log terminates with frontend Node heap exhaustion and
pnpm exit 1. This is historical failed build evidence, superseding its report
checkpoint saying running; it is not this run's test result. Prior focused and
workspace passes do not close the full wrapper gate. Fire-351's distinct
150-second timeout remains recorded separately and accurately.

Fresh exact-pin bootstrap at 240899ec, own Git identity, declared-remote fetch
and fork/lease fixtures (11/11) pass. Fork clean. No frozen installs or full
wrapper invoked this fire. Invocation cgroup memory.max is 2147483648 bytes;
observed current 1566941184 bytes; default Node heap 846 MiB. Parent fleet limit
10 GiB does not override this invocation limit. Host available memory about
2.3 GiB and swap about 11 GiB used do not establish safe build headroom.
No process-local heap increase or host configuration mutation attempted.

Scope is recovery/documentation, not migration acceptance. No production,
source receipt, pin, deployment config, browser/native-client, storage or visual
credit. ADR 0002 remains governing; do not redeploy to silence receipt drift.
Next wave: measure adequate invocation and parent headroom before a bounded
full-wrapper retry; finish both installs first. Terminal result must reach the
report before closing. Retained journal acceptance stays separate.

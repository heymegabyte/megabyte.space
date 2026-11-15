# Fire-381 — PagerDuty candidate deployment and authority review

Observed 2026-11-15 UTC. Research only, scoped to official candidate
`ea926546cc340da28acf0a0c4b10361acedf2ca6`, fetched directly from
`https://github.com/cloudflare/cloudflare-os.git`. The declared fork remains at
`240899ec34e822a0afa695e3c7b48a41c2db9c4c`; no pin or configuration changed.
The candidate is the fire-380 inventory target, not a newly selected release.
Source file hashes are recorded in `source-evidence.json`.

## Recovery and observed checks

Fetched origin/main contains e70bcd73. Live Actions history shows prior run
43722249898 succeeded and 43684358849 failed. The latter has no agent report;
its summary and clean retained worktree show no work to recover. The current
assigned snapshot was preserved. Fork preflight passes at the exact gitlink.
Focused fork/provenance/lease/bookkeeping regressions pass 57/57 this iteration.
These are wrapper fixtures, not execution of the candidate's PagerDuty suites.

## Deployment compatibility

The wrapper's `scripts/deploy.ts:40` explicit EXTRA_GATEKEEPERS list omits
PagerDuty. Both router HTTP services and Workshop `GatekeeperVendor` services
are derived from that list (around line 603); configurator builds, base-config
loading, generated-config writes and deployment cleanup also follow it. Thus
candidate presence alone does not install or expose this vendor. This is an
adoption gap, not a defect to fix by automatically adding account footprint.

Candidate `cloudflare.config.ts:18` and generated `wrangler.jsonc` agree on v0
SQLite classes UserAccount, PagerDutyGatekeeperImpl and PagerDutyHookDriver.
The main is `.wrangler/validate/src/pagerduty.ts`; the source exports the DO
classes and GatekeeperVendor entrypoint. Package test:run and Vite task wiring
require generated configurator assets before separate Node and workerd legs.
Those source declarations do not prove Wrangler acceptance or provisioning.

A list-only wrapper addition would still be insufficient: candidate
`src/pagerduty-env.ts:60` defaults BASE_URL to localhost, and
`src/pagerduty.ts:294` builds connection links from it. `setCommon()` only sets
account/name/routing/observability, not this variable; the candidate router
forwards the original request and does not inject the Worker environment.
Require an explicit protected evaluation BASE_URL with `/gatekeeper/pagerduty`,
and prove connection/callback origins before enabling the vendor. Do not mistake
PUBLIC_BASE_URL on Workshop for BASE_URL on the integration Worker.

## Authority and failure boundaries

Candidate `src/pagerduty-env.ts:137` requests incident and schedule write scopes
plus read scopes. deploy-inputs.json covers CLIENT_ID and CLIENT_SECRET; the
optional webhook secret is outside that wizard. OAuth registration, secrets,
new Worker/storage and any Access exception remain separate approval boundaries.
No account, credential or provider setup was attempted.

`src/pagerduty-hooks.ts:289` refuses an unset webhook secret (404), requires
HMAC-SHA256 on the capped 256 KiB raw body, rejects invalid signatures (401),
and parses JSON only afterward. It accepts events no older than the retention
window; the handler has no explicit future-time upper bound. This observation
is not a claim of an exploitable unsigned replay: modifying the timestamp would
invalidate the signature. Test skew and retention behavior before adoption.
Tenant filtering occurs both in driver selection and facet delivery; delivery
re-reads incident access as the hook owner and verifies binding scope before
callback. Workerd hooks fixtures include signature, oversize, replay, disable,
disconnect, EU and cross-account-ID collision cases, but were inspected only.

`src/pagerduty.ts:563` clears local credentials before awaiting hook removal.
Removal is best effort, with a caught warning and no retry in that method;
review revocation during in-flight delivery and failed cleanup independently
from the sequential disconnect fixture. Source documentation describes provider
revocation limitations; no live provider behavior was verified here.
`src/pagerduty-actions.ts:343` separates raising urgency from lowering it:
raising is not auto-approvable. Other notifications and override-for-others
also require approval; resolved-incident acknowledgement is checked again at
apply time. Preserve those distinctions in delayed-approval acceptance.

## Acceptance left open

Rehearse the full candidate with both frozen installs, generated config and
configurator outputs, Node/workerd suites, explicit-origin callback checks,
held-capability disconnect/cleanup failure and delayed action scope changes.
An Access webhook exception must be separately reviewed; candidate README setup
text is not authorization to weaken the edge gate. No frontend/browser/native
or real PagerDuty acceptance, wrapper build, deployment or visual review ran.
Existing migration and measured wrapper-capacity gates remain open. No visual
scores changed and no OpenSpec architectural artifacts were authored.

Loop improvement: evaluate vendor discovery, Worker wiring and per-vendor public
origin separately. A new upstream package or green mocked hook test does not
prove the deployed integration is discoverable, reachable or safely configured.

## Independent throughput review and synthesis

A bounded OpenCode `deepseek/deepseek-chat` read-only review completed through the
fleet's direct DeepSeek launcher (exit 0). Sanitized source findings above were
checked by the parent independently; raw worker output remains in the run log,
not committed as authoritative evidence. It confirmed migration exports and
configurator prerequisites. Two worker conclusions were rejected: dependencies
missing at the old fork HEAD are not proof of missing packages in the full
candidate tree, and the wrapper already runs build:configurator for listed extra
gatekeepers before Wrangler. A cherry-pick-only transplant would lack candidate
packages, but that is not the approved full-candidate migration strategy.
Upstream release-manifest wiring is distinct from this wrapper's explicit list;
compatibility with one does not establish compatibility with the other.

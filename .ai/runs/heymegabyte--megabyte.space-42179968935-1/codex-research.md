# Fire-361 — official upstream compatibility inventory

Mode: research, existing starter, replacement migration pending. No source adoption,
production mutation, release publication or historical receipt rewrite.

## Provenance and recovery

Assigned wrapper base: `459e85808bf6a54e4d8bf521541e7adf981a4e50`.
Fetched `origin/main` contains that result. GitHub Actions lists prior run
42136438907 as successful and 41963669270 as failed. The retained failed tree
still contains collector files, but their recovery is already in main; do not
copy them again. Its wrapper-check.log ends in JavaScript heap exhaustion and
ELIFECYCLE exit 1, superseding its agent-report's stale `running` checkpoint.

Declared fork URL `https://github.com/heymegabyte/cloudflare-os.git` initialized at
the exact committed `240899ec34e822a0afa695e3c7b48a41c2db9c4c`. Own-Git preflight
passes. The fork worktree is clean; the gitlink stays unchanged.

Official repository HEAD queried through GitHub on 2026-11-06 is
`2726e932a3fbfcfffa04ee093a881604009f2034`, commit time 2026-11-06T02:05:18Z.
The releases endpoint returned an empty array; that establishes no release entries
in this response, not absence of development or suitability of HEAD. Both this
candidate and prior inventoried official `bd10b0ece6842b8f486b3467eab6cc3b9c920920`
were fetched directly from `https://github.com/cloudflare/cloudflare-os.git`.
Local ancestry passes. This official-to-official range is incremental review
coverage; it is not the legacy-fork-to-candidate migration diff.

## Targeted independent source findings

1. Observer enforcement is a coordinated core/connector contract change, not a
   UI-only update. `packages/gatekeeper-kit/USAGE.md` now requires explicit
   subresources and `verifyObserverAccess`; `[]` means unrestricted, never an
   already-checked membership baseline. Inspect `src/observer-tracker.ts`, backend
   `src/observer-ledger.ts` and migrated connectors together. Candidate acceptance
   must include concurrent admission, role/gadget scope, hook-origin observations,
   persistent legacy requirements, and retained capabilities across restart.
   `observer-scope-restart.test.ts` names retained capability cases, but none of
   these candidate tests were executed here.
2. `58f20092` makes action kind and auto-approval verdict mandatory in
   `packages/gatekeeper-kit/src/actions.ts`; `fc2105c3` applies opt-out policy.
   `76765e5e` makes some GitLab force pushes and Calendar invitations eligible for
   user-enabled rules. Eligibility is not default authorization. GitLab verdicts
   in `gitlab-action-types.ts` refuse protected/default or unknown target status
   and bot/unknown assignee cases. Calendar uses a separate invitation kind in
   `calendar-verdict.ts`. Require opt-in/opt-out, restricted-workspace, unknown
   metadata and negative external-send tests before adoption. Do not conflate
   this native policy with the legacy fork's deploy-only approval allowlist.
3. Workshop `cloudflare.config.ts` and generated `wrangler.jsonc` both add
   migration `v4` / `AdminAuditDurableObject`. The wrapper starts from upstream
   base Wrangler config, but this is not generated-candidate validation. Rehearse
   derived bindings/migrations, retention floor, actor identity and failed-write
   audit semantics; no storage compatibility or rollback claim follows from the
   source inventory.
4. New `packages/gatekeeper-microsoft/cloudflare.config.ts` declares five v0
   SQLite classes and an AI binding. Defaults include SharePoint write/all-sites,
   Outlook send and Calendar schedule; organization tenancy requires an allowlist.
   The current wrapper's fixed extras list does not deploy Microsoft. Its presence
   upstream does not authorize provisioning, OAuth scope expansion or adding it
   to the legacy app.
5. `f40e88dd` puts Workers AI DeepSeek V4.1 Flash first in the cloudflare catalog
   (`workshop-shared/src/api.ts`) and adds provider/model ordering. `15786118`
   adds `ADMIN_CONFIG_SEED`, filtered by `ADMIN_CONFIG_SEED_FIELDS`, with saved
   Models-tab settings taking precedence. Verify fresh and existing-state behavior,
   configured provider availability and actual billing route separately. Current
   deployment.jsonc still enables openai/cloudflare/anthropic for the legacy app;
   that is not an approved fresh-OS Workers-AI-only configuration.
6. Backend `src/env.d.ts` and `docs/notifications.md` distinguish open-tab
   notifications from central push. Push needs installation identity/signing and
   service configuration; browser push additionally needs VAPID. Durable unread
   state and badges do not prove external delivery. Preserve explicit unavailable
   behavior and native/browser acceptance rather than inventing credentials.
7. The workspace catalog changes Wrangler, workers-types, Miniflare, Vite+ and
   other dependency versions. Preserve both workspace lockfile installs and
   shared catalog compatibility checks; old candidate rehearsal at bd10b0ec does
   not test this candidate. No candidate install/build/runtime gate ran here.

## Fresh local verification and resource limits

The existing offline assessor/collector/journal/crash tests pass 81/81. They
establish helper fixture behavior, not candidate compatibility or production
integration. Fork/lease fixture results are recorded separately in the run report.

Measured current invocation cgroup memory.max = 2147483648 bytes; ancestor fleet
limit = 10737418240 bytes. Invocation usage was about 1.12 GB, ancestor usage
about 2.39 GB; Node default heap limit was 887095296 bytes. Host available memory
does not override the invocation cap. Given prior terminal heap exhaustion, this
research-only iteration does not repeat the full wrapper build or enlarge limits.

## Acceptance boundary

Complete local Git inventory and targeted review are distinct from full audit,
candidate execution, source-byte attestation and migration acceptance. Keep all
prior candidate gates, durable collector/uploader integration, authenticated
journeys, native clients, live state reconciliation and visual scores open.

Loop improvement: refresh an official-to-official range from the last inventoried
official SHA, record it independently from the active fork pin, and explicitly
retain the full fork-to-candidate migration review. An empty GitHub releases
response or unchanged active pin must never stand in for a release scout.

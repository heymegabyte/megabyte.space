# ADR 0002 — Relaunch megabyte.space on a fresh official Cloudflare OS

**Status:** ACCEPTED (Brian, 2026-10-09) · execution PENDING (phased, approval-gated at cutover)
**Supersedes:** the "megabyte.space = ADVANCED PLAYGROUND; absorb projectsites.dev into the OS" direction
in `CLAUDE.md` + the WS-DEMO/beautify slice loop. That direction is RETIRED for the APEX.

## Decision

**megabyte.space becomes Cloudflare OS first, Megabyte Space second.** Deploy a FRESH, minimally-branded
official Cloudflare OS at the apex. PRESERVE the current heavily-customized app (fork + 60 Resources panels
+ ProjectSites absorption + Better-Auth force-login + all experiments) at **`demo.megabyte.space`** as a
long-term, fully-operational legacy reference. Do NOT recreate the legacy desktop, do NOT absorb
ProjectSites.dev, do NOT build another OS on top of the OS.

This is a **deployment / migration / restoration / stabilization** project — NOT feature development. No
30-ideas-per-category ideation; no scope expansion. Implement only fixes that materially improve security,
reliability, performance, maintainability, deploy quality, a11y, or UX WITHOUT changing the native OS product.

## Current-state audit (2026-10-09, read-only)

- Outer repo `main` = the LEGACY app: starter-wrapper layers (router worker `megabyte-os`, `packages/home`,
  `scripts/`, customized `workshop-frontend`) + the `cloudflare-os` submodule pinned at the **FORK**
  `heymegabyte/cloudflare-os@megabyte-os` `80b7209e` (NOT official upstream).
- Submodule remotes: `origin` = fork, `upstream` = `cloudflare/cloudflare-os` (official). `.gitmodules`
  branch = `megabyte-os`.
- Live topology (per CLAUDE.md, to re-verify at execution): apex `megabyte.space` served by router
  `megabyte-os` + `-backend`/`-context`/`-scheduler`/`-custom`/`-errors` + isolated `megabyte-auth`
  (Better Auth, D1 `718b44ef-a33a-4aba-8300-8b70a21dbfd1`). Force-login inlined at the router. NO Cloudflare
  Access in the human path (BA-5). `os.megabyte.space` retired.
- No `legacy/megabyte-space-v1` branch, no pre-migration tag yet.
- Wrangler auth: scoped `CLOUDFLARE_API_TOKEN` lacks Workers scopes → global-key fallback
  (`CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL=blzalewski@gmail.com` + `CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59`).
  `scripts/deploy-authed.mjs` injects this.

## Target topology (two independent apps, isolated state)

| | Production (apex) | Legacy demo |
|---|---|---|
| Host | `megabyte.space` (no permanent redirect away) | `demo.megabyte.space` |
| App | FRESH official Cloudflare OS, pinned upstream, minimal branding | CURRENT customized app, unchanged |
| Submodule | `cloudflare-os` @ **official upstream** reviewed pin | fork `megabyte-os` (as-is) |
| Workers | NEW identities (fresh state) | CURRENT workers (state preserved) |
| State | fresh D1/KV/R2/DO | current D1/KV/R2/DO (identity preserved) |
| Auth | Cloudflare Access (preferred) OR native | Access-protected (not public) |

**State-identity rule:** renaming a Worker does NOT preserve its DO/D1/KV/R2. The current workers KEEP
their names+state and just move their custom domain apex→demo; the fresh OS gets NEW worker names + NEW
resources. Never let production use legacy state or vice-versa.

## Git strategy

1. Tag current HEAD immutably: `pre-fresh-os-relaunch-20261009` (+ push fork `megabyte-os` tag).
2. Branch the current app: `legacy/megabyte-space-v1` (independently buildable + deployable to demo).
3. Rebuild `main` as the clean OS: submodule → official upstream reviewed pin; minimal `deployment.jsonc`.
4. Preserve ALL history (no repo deletion). A separate repo only if deployment isolation genuinely requires it.

## Phased execution (do NOT skip order; cutover is approval-gated)

- **Phase 1 — Audit & snapshot (SAFE, mostly done here):** inventory workers/bindings/DNS/Access/D1/KV/R2/DO
  + secrets; record deployed commit; back up stateful resources (D1 export, R2 inventory, DO list); record
  resource collisions + rollback. Read the official operator skill
  `cloudflare-os-starter/.agents/skills/cloudflare-os-operator/SKILL.md` (authoritative; fetch current).
- **Phase 2 — Deploy legacy → demo (SAFE):** branch `legacy/megabyte-space-v1`; move the CURRENT workers'
  custom domain apex→`demo.megabyte.space` (DNS + `deployment.jsonc` customDomain); fix absolute URLs /
  callback URLs / cookies / BA redirect_uri for the demo host; protect with Cloudflare Access; VERIFY it
  loads + auths + renders + data intact + reproducible. Record screenshots + version ids. **Do not proceed
  to replacement until demo is verified.**
- **Phase 3 — Prepare fresh OS (SAFE, isolated):** on `main`, re-point `cloudflare-os` submodule → official
  upstream reviewed pin; configure minimal `deployment.jsonc` (account, NEW worker identities, fresh KV/R2,
  Access issuer+audience, verified admin allowlist, native AI via AI Gateway/Workers AI — NO OpenAI/Anthropic
  keys by default, observability, context isolation, error reporter); `pnpm check`; validate on a TEMPORARY
  PROTECTED eval host (never public pre-auth). Apply branding via `/admin` (Site name "Megabyte Space", logo,
  cyan accent, dark-first) — NOT by editing upstream UI.
- **Phase 4 — Production cutover (APPROVAL-GATED, DESTRUCTIVE):** after Phases 2-3 pass + Brian's go → assign
  apex to the fresh OS workers; verify DNS/TLS/routing/auth/Workshop; confirm demo still works; confirm
  deployed commit == expected pin; keep rollback ready (re-point apex back to legacy workers).
- **Phase 5 — Stabilize & close:** browser acceptance (prod + demo golden paths), fix critical defects,
  logs+security review, confirm prod/demo state isolation, remove only verified temp artifacts, commit docs
  (README, docs/MIGRATION.md, docs/OPERATIONS.md, docs/AI-SUBSCRIPTIONS.md), final report.

## Mutation summary — needs Brian's explicit go (one-way doors)

1. **Apex cutover** — moving `megabyte.space` from the current customized workers to the fresh-OS workers
   (reversible via re-pointing, but customer-facing + DNS). → Phase 4 gate.
2. **DNS** — creating `demo.megabyte.space` + moving custom-domain assignments. (Zone mutation beyond the
   documented rulesets.)
3. **Fresh resource creation** — new D1/KV/R2/DO for the fresh OS (cost + account footprint).
4. **AI billing** — confirm NO OpenAI/Anthropic keys are set on the fresh OS by default; baseline = Workers
   AI (keyless) via AI Gateway; metered inference only with explicit spend authorization (see
   `docs/AI-SUBSCRIPTIONS.md`).

Everything in Phases 1-3 (audit, backups, demo deploy, isolated fresh-OS prep + protected eval) is
standing-authorized + reversible → execute autonomously. Phase 4 cutover pauses for the single go-ahead.

## Secondary (non-blocking) — subscription-backed AI

Research ChatGPT (Codex CLI / SIWC token-sharing / self-hosted VMs) + Claude Code Pro/Max (official binary,
authorized flow, NO token extraction, NO API-key fallback). Prefer an authorized CLI on the existing
Proxmox Ubuntu VM over a new proxy. Output: `docs/AI-SUBSCRIPTIONS.md` (verified vs plausible vs prohibited
vs cost). Do NOT gate the relaunch on this. Do NOT build another AI window yet.

## Acceptance criteria

See the directive §16. Done only when: legacy preserved + demo live + important data intact + apex runs
clean official OS (no old custom windows) + native OS tested + auth on both + state isolated + checks pass +
browser smoke green + visual defects fixed + AI billing controlled + subscription feasibility documented +
git/branches/tags/versions/rollback documented + README accurate. Report completed vs blocked with evidence;
never invent success.

## Why a fresh focused session executes Phases 2-5

This ADR was authored at the tail of a long slice-loop session (context-heavy). A production migration with
destructive cutover must run with clean context for safety (no mid-cutover saturation wedge) — per Brian's
"manage context so a /clear isn't necessary". Phase 1 audit + this brief are done; Phases 2-5 start fresh.

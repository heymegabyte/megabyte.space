# MIGRATION — relaunch megabyte.space on a fresh official Cloudflare OS

**Governing brief:** `docs/decisions/0002-fresh-cloudflare-os-relaunch.md` (ADR 0002, ACCEPTED 2026-10-09).
**Authoritative execution procedure:** `.agents/skills/cloudflare-os-operator/SKILL.md` (operator skill — the ADR cites it as authoritative; its approval gates govern HOW).
**Status:** Phase 1 CLOSED (audit + git safety net done). Phases 2–5 PENDING a single batched go-ahead (first prod mutation is approval-gated per the operator skill + ADR mutation summary).

This is a **deployment / migration / stabilization** project — NOT feature development. No scope expansion, no absorption, no new OS-on-OS. Implement only fixes that improve security/reliability/perf/maintainability/a11y/UX **without changing the native OS product**.

---

## 1. Verified current state (fire-300, 2026-10-09T21:50Z, read-only)

- **Apex `https://megabyte.space`** → HTTP 200, `<title>Sign in · Megabyte OS</title>`. The CURRENT customized app is live: router-inlined Better-Auth force-login gate (BA-5 — no Cloudflare Access in the human path). `server: cloudflare`.
- **`demo.megabyte.space`** → NXDOMAIN (does not resolve). Not created yet.
- **Git safety net (ADR git-strategy steps 1–2) — DONE:**
  - Outer-repo tag `pre-fresh-os-relaunch-20261009` ✅
  - Branch `legacy/megabyte-space-v1` ✅ (local + `origin`)
  - Submodule `cloudflare-os` pinned at the **fork** `heymegabyte/cloudflare-os@megabyte-os` `80b7209e` (tag `pre-fresh-os-relaunch-20261009`).
- **Salvage gate** `scripts/check-fire-committed.mjs` → CLEAN (no stranded deployed-but-uncommitted work).
- **Wrangler auth:** scoped `CLOUDFLARE_API_TOKEN` lacks Workers scopes (code 10000) → global-key fallback: `unset CLOUDFLARE_API_TOKEN; export CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) CLOUDFLARE_EMAIL=blzalewski@gmail.com CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59`. `scripts/deploy-authed.mjs` injects this.

## 2. Resource / state-identity inventory (from `deployment.jsonc` + CLAUDE.md; re-verify live at execution)

**Account:** `84fa0d1b16ff8086dd958c468ce7fd59`. **AI Gateway:** `megabyte-space` (keyless Workers AI; `providers: ["cloudflare"]`).

**LEGACY workers — KEEP names (renaming strands DO/D1/KV/R2 state per operator skill §5):**

| Worker | Role | State owned |
|---|---|---|
| `megabyte-os` | Router — owns the apex `customDomain: megabyte.space` | none (routing only) |
| `megabyte-os-backend` | Workshop | **DO identity for ALL Workshop DOs** (workspaces/gadgets) |
| `megabyte-os-context` | Context Gatekeeper | Context collection DOs + KV |
| `megabyte-os-scheduler` | Scheduler Gatekeeper | schedule DOs |
| `megabyte-os-custom` | Custom Gatekeeper | — |
| `megabyte-os-errors` | Error Reporter | — |
| `megabyte-auth` | isolated Better-Auth rail (force-login) | D1 `718b44ef-a33a-4aba-8300-8b70a21dbfd1` |

**Config oddity (do not touch casually — `context.sharingDomain` is an approval-gated boundary):** `deployment.jsonc` `context.sharingDomain = "https://os.megabyte.space"` — a literal pointing at the RETIRED `os.` host. It is pinned (not `null`), so it does NOT auto-follow a hostname move. Leave as-is on the legacy branch; the fresh OS gets its own boundary.

**FRESH OS workers — NEW names (fresh auto-provisioned DO/KV/R2; zero collision with legacy state).** Proposed default (confirm in §6): `mbspace-os` / `-backend` / `-context` / `-scheduler` / `-custom` / `-errors`. Fresh OS auth = **Cloudflare Access** (ADR-preferred; the clean official product has NO `megabyte-auth` worker + NO router-inlined login).

**Only shared contention point = the custom domain `megabyte.space` + its DNS.** Everything else is isolated by distinct worker names. This is why the cutover (Phase 4) is the one approval-gated, briefly-contended step.

## 3. Target topology (ADR)

| | Production (apex) | Legacy demo |
|---|---|---|
| Host | `megabyte.space` | `demo.megabyte.space` |
| App | FRESH official Cloudflare OS, upstream pin, minimal branding | CURRENT customized app, unchanged |
| Submodule | `cloudflare-os` @ reviewed **official upstream** | fork `megabyte-os` (as-is) |
| Workers | NEW identities (`mbspace-os*`), fresh state | CURRENT workers, state preserved |
| Auth | Cloudflare Access | Access-protected (not public) |

**State-identity rule:** never let production use legacy state or vice-versa. Current workers keep names+state; fresh OS gets new names+resources.

## 4. Sequencing — zero-downtime refinement of the ADR phases

> **Improvement over ADR Phase 2 as literally written.** The ADR says "move the current workers' custom domain apex→demo." Per the CLAUDE.md gotcha, changing `customDomain` in `deployment.jsonc` + `pnpm deploy` **detaches the apex**, so a literal read dark-outs `megabyte.space` from Phase 2 until Phase 4. Instead we ADD demo as a second custom domain out-of-band and keep the apex attached until the cutover — apex downtime shrinks to the Phase-4 reassignment window only.

**Phase 2 — Stand up demo, apex untouched (reversible):**
1. Add `demo.megabyte.space` as an **additional** custom domain on the live `megabyte-os` router via the Cloudflare API/dashboard (a Worker can hold multiple custom domains). DNS+TLS auto-created; legacy now serves at BOTH apex + demo.
2. **Do NOT `pnpm deploy` the `legacy/megabyte-space-v1` branch during the transition** — its `deployment.jsonc` has a single `customDomain`; a declarative redeploy would detach the manually-added demo domain. Keep that branch's `customDomain = megabyte.space` so an accidental redeploy re-asserts the apex, never demo.
3. Demo-host correctness on the legacy app: add `demo.megabyte.space` to Better-Auth `trustedOrigins` + OAuth `redirect_uri`s (`…/api/auth/callback/{github,google}`), confirm the session cookie is host-scoped (works on demo), fix any absolute apex URLs. (Simpler fallback: front demo with Cloudflare Access and accept reduced in-app auth fidelity — decide in §6.)
4. Protect demo with **Cloudflare Access** (ADR: demo is not public). Narrow policy — operators/admins only.
5. **Verify demo:** loads, auths, renders, existing data intact (display-vs-store). Record screenshots + version IDs. **Do not proceed to cutover until demo is verified.**

**Phase 3 — Prepare fresh OS on an isolated protected eval host (reversible):**
1. On `main`: re-point `cloudflare-os` submodule → a **reviewed official-upstream** ref (never a blind "latest" — review per the operator skill / upgrade reference). Record old→new SHA.
2. Minimal `deployment.jsonc` on `main`: NEW worker names (`mbspace-os*`); route = `workersDev: true` + explicit `publicBaseUrl` for the eval host (operator skill §4 — never public pre-auth); Access app covering the eval host; fresh KV/R2 auto-provision; AI keyless (`providers:["cloudflare"]`, NO OpenAI/Anthropic keys); errorReporting private; Custom Gatekeeper disabled until reviewed.
3. `pnpm check` (validates config + dry-runs every Worker) → `node scripts/deploy.ts` (or `pnpm deploy`) to the eval host → verify behind Access. Apex + demo untouched.
4. Branding via `/admin` post-deploy (Site name "Megabyte Space", cyan accent, dark-first, logo) — NOT by editing upstream UI.

**Phase 4 — Production cutover (APPROVAL-GATED, DESTRUCTIVE — ADR one-way door #1):**
1. Inventory last-known-good deployment/version IDs for BOTH stacks (rollback anchors): `pnpm exec wrangler deployments list --name <worker>` per worker.
2. Confirm fresh OS green on eval + demo green.
3. **Detach** `megabyte.space` from `megabyte-os` router (API), keeping `demo.megabyte.space` attached (legacy now serves demo only).
4. Switch fresh-OS `deployment.jsonc` route workersDev→`customDomain: megabyte.space`; `pnpm deploy` the fresh stack (Router last — deploy is NOT atomic).
5. **Verify** per operator skill §11: TLS, Router proxy (`/api`→Workshop, `/gatekeeper/<name>`), Access redirect/allow/deny (incognito + admin + non-admin + denied identity), `/admin` gate, no backend has a public route/Preview URL, data persists across reload, model picker non-empty with one low-cost request, schedules fire. Confirm demo still works + state isolated.
6. **Rollback:** re-attach `megabyte.space` to `megabyte-os` router → legacy instantly serves apex; fresh stack stays deployed but unrouted (harmless). Never delete/downgrade storage as rollback.

**Phase 5 — Stabilize & close:** browser acceptance (prod + demo golden paths), fix critical defects, logs+security review, confirm prod/demo state isolation, remove only verified temp artifacts, commit docs (this file + `docs/OPERATIONS.md` + `docs/AI-SUBSCRIPTIONS.md`), final report (operator skill §12 template).

## 5. Mutation summary — needs Brian's explicit go (operator skill hard stop + ADR one-way doors)

Before the FIRST prod mutation (the Phase-2 demo custom-domain add), approve:
- **Account/hostname:** `84fa0d1b16ff8086dd958c468ce7fd59` · `demo.megabyte.space` (new) then `megabyte.space` (cutover).
- **DNS:** create `demo.megabyte.space`; at cutover, reassign the `megabyte.space` custom domain `megabyte-os`→fresh router. *(Zone mutation beyond documented rulesets — ADR #2.)*
- **Fresh resources:** new D1/KV/R2/DO for `mbspace-os*` (cost + account footprint — ADR #3). Scale-to-zero; minimal.
- **Access:** create/extend an Access application for demo + for the fresh apex. *(Trust boundary — operator skill.)*
- **AI billing:** NONE by default — keyless Workers AI via AI Gateway `megabyte-space`; NO OpenAI/Anthropic keys on the fresh OS (ADR #4). Metered inference only with explicit spend authorization (→ `docs/AI-SUBSCRIPTIONS.md`).
- **Submodule pin move:** fork `80b7209e` → reviewed official-upstream ref (provenance change — requires review).
- **Last-known-good IDs + rollback limits:** captured at Phase 4 step 1.
- **`pnpm check` evidence:** attached per deploy.

## 6. Decision batch (operator skill §2 — collect once). Defaults proposed; Brian confirms or vetoes.

1. **Fresh worker names** — default `mbspace-os` / `mbspace-os-backend` / `mbspace-os-context` / `mbspace-os-scheduler` / `mbspace-os-custom` / `mbspace-os-errors`. (Must NOT be `megabyte-os*` — collides + strands legacy state.) → confirm or supply.
2. **Fresh-apex Access** — reuse the existing "Megabyte OS" Access app (AUD `b455c445…e8fa`, issuer `manhattan.cloudflareaccess.com`, already in `deployment.jsonc`) as the human gate, OR create a fresh app? Intended population + admin list (`hey@megabyte.space`, `blzalewski@gmail.com`)?
3. **Demo Access + auth fidelity** — extend the existing app to cover `demo.megabyte.space` vs. a separate app; and invest in full legacy-BA portability to the demo host (trustedOrigins/callbacks/cookie) vs. just Access-gate it and accept reduced in-app sign-in fidelity (demo is a reference, not production)?
4. **Submodule upstream pin** — which reviewed `cloudflare/cloudflare-os` ref (latest release tag vs. a specific audited commit)? Needs a review pass before the gitlink moves.
5. **Fresh resources + AI** — confirm auto-provision NEW KV (Context/Blueprints/Avatars) + R2 (Blueprint content) + DOs; reuse AI Gateway `megabyte-space` keyless; **NO** model API keys. OK?
6. **Branding** — Site name "Megabyte Space", cyan `#00E5FF` accent on `#060610`, dark-first, logo — applied via `/admin` post-deploy. OK?
7. **Cutover approver + rollback tolerance** — Brian approves Phase 4; acceptable apex reassignment window?

## 7. Rollback & recovery (per-phase)

- **Phase 2:** remove the demo custom domain (API) + its Access app. Apex never touched.
- **Phase 3:** fresh stack is isolated on an eval host; delete the eval route / leave unrouted. Revert `main` `deployment.jsonc` + submodule gitlink (git).
- **Phase 4:** re-attach `megabyte.space` to `megabyte-os` router → instant legacy restore. Keep the fresh stack deployed-but-unrouted. Do NOT delete storage.
- **Global:** the immutable tag `pre-fresh-os-relaunch-20261009` + branch `legacy/megabyte-space-v1` reconstruct the entire pre-migration app.

## 8. Acceptance (ADR §16 / operator skill §11)

Done only when: legacy preserved (tag+branch) · demo live + Access-protected + data intact · apex runs a clean official OS (no old custom windows) · native OS tested · auth works on both · state isolated (prod≠legacy) · `pnpm check` green · browser smoke green both hosts · visual defects fixed · AI billing controlled (no keys) · subscription feasibility documented (`docs/AI-SUBSCRIPTIONS.md`) · git/branches/tags/versions/rollback documented · README accurate. Report completed-vs-blocked with evidence; never invent success.

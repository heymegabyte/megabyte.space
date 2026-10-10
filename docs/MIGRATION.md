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

## 9. Upstream readiness inventory — fire-302 (2026-10-10T02:43Z)

This is a read-only migration inventory, not Phase 2–5 completion or an approved pin.
Evidence: [independent research](../.ai/runs/heymegabyte--megabyte.space-38017722001-1/codex-research.md)
and [comparison snapshot](../.ai/runs/heymegabyte--megabyte.space-38017722001-1/upstream-evidence.json).

| Surface | Observed evidence | Decision |
|---|---|---|
| Official upstream | GitHub commit API + `git ls-remote` agree on main `7ec49d8c865917c7be0401938eadc7218ed9d398`; release/tag endpoints return `[]` | Watch immutable commit as a candidate; no reviewed release/tag available in these responses |
| Legacy vs upstream | GitHub compare `80b7209e...7ec49d8c` (legacy base → upstream head): diverged, ahead_by 222 upstream-side / behind_by 207 legacy-side commits; merge base `6478a1448a11524e2f7c2575ad66fab0bc47c433`; returned file list capped at 300 | Reject blind merge/rebase or pin bump; fresh official OS remains ADR target |
| Chat prompt caching (#665) | Upstream commit subject/message describes fixing the gadget list per chat compaction | Backlog focused source/test review for native chat stability; no runtime/performance claim |
| Google creation/approval (#694, #716, #718) | Recent upstream commit subjects describe external creation and approver-account behavior | Backlog authority/OAuth/approval review before evaluating native Google integration; do not port features into legacy |
| Declared fork source | `git submodule update --init` and retry with existing GitHub credential helper both fail `Repository not found`; repository API 404 | Block current-pin bootstrap; restore authorized access or approve exact-source provenance change, never guess deletion vs visibility |
| Legacy SHA in upstream API | Commit API resolves `80b7209e`; retained initialized clones cannot resolve it locally | Watch recovery option; API reachability alone does not prove clone/fetch support or permit changing `.gitmodules` |
| Build and production gates | Source uninitialized; no frozen fork install, `pnpm check`, deploy, authenticated journey or visual inspection | Acceptance stays open; no pointer, deployment receipt or visual-score change |

Availability checks find the Cloudflare global key available, but BA E2E email/password and
DeepSeek key unavailable. No credential value was read or stored. Missing fork access is a
separate provenance blocker; availability of a Cloudflare key does not resolve it.

Next review must retrieve the complete source diff rather than treating the API's 300-file
list as exhaustive, inspect deprecations/binding/migration/auth changes, and validate both
locked workspaces. The existing §6 operator decision batch remains unresolved; this inventory
does not approve resource names, Access policies, evaluation hostname, DNS or apex cutover.

## 10. Exact-source review — fire-303 (2026-10-10)

The source-bootstrap blocker in §9 is **cleared for this run**: the declared fork URL
cloned and checked out the current committed pin `1739f1915af71f12c4bb3802458502c6453ba450`.
This supersedes §9's source-availability observation; it does not establish why access
previously failed. The pin advanced on main before this run; this iteration did not move it.
Official upstream still advertises `7ec49d8c865917c7be0401938eadc7218ed9d398`.

The complete local comparison contains **1,336 changed paths**, 317,084 insertions and
68,043 deletions, with 208 legacy-only / 222 upstream-only commits. The former 300-file
API response was incomplete. Exact refs, uncapped path inventory and independent review:
[research](../.ai/runs/heymegabyte--megabyte.space-38040179110-1/codex-research.md),
[evidence](../.ai/runs/heymegabyte--megabyte.space-38040179110-1/upstream-evidence.json),
[paths](../.ai/runs/heymegabyte--megabyte.space-38040179110-1/source-diff-name-status.txt).

Source review identifies four prerequisites before an approved candidate evaluation:

- Keep legacy Better Auth with legacy workers: official router/backend remove the fork
  auth layer. Prove fresh Access allow/deny/admin behavior independently.
- Review starter compatibility with upstream's scripts workspace, `@gadgets/scripts`,
  generated `cloudflare.config.ts`/Wrangler configuration, release-manifest templates,
  new task-cache syntax and changed dependency catalog. Current-pin builds cannot prove
  candidate compatibility. Mirror catalog and lockfiles together in the approved lane.
- Use new worker/storage identities. Upstream retains PendingLogin and adds UserDirectory at migration v3
  and Overseer schema migrations through version 5, including code-log→Git conversion.
  Never attach legacy state or attempt storage downgrades as rollback.
- Review native per-kind, user-enabled auto-approval and Google approver-account authority;
  upstream lacks the fork's `approvalStore.ts` deploy-only policy. No silent policy port.

Both current-pin frozen installs succeeded with `corepack pnpm` 11.17.0. Plain `pnpm`
was unavailable via Volta; a temporary run-local launcher enabled recursive checks without
host configuration changes. Gate results and limitations are recorded in the run report.
No candidate checkout/build, production mutation, migration acceptance, authenticated
journey or visual score is credited. The existing §6 decision batch remains unresolved.


Deployment evidence remains separate: `check-deploy-state --json` reports the committed
fork `1739f191` differs from receipt `80b7209e` (2026-10-09T21:05:20.999Z). Anonymous
apex HTML returned 200 with `Sign in · Megabyte OS` and the inline login gate. That
probe proves neither the deployed fork SHA nor authenticated model setup. Preserve the
receipt until a verified deployment or version inventory establishes ground truth.


Current-pin verification completed: full `pnpm check` exited 0 (submodule/interconnect,
script types/tests, workspace tests, frontend/worker builds and six Worker dry-runs).
This clears current-pin build-context debt for this run, not official-candidate compatibility.
No generated source, deployment receipt, production configuration or visual score changed.

## 11. Candidate adapter contract — fire-304 (2026-10-10)

Official upstream still advertises `7ec49d8c`; current fork remains `1739f191`.
The [independent review](../.ai/runs/heymegabyte--megabyte.space-38063618188-1/codex-research.md)
and [source contracts](../.ai/runs/heymegabyte--megabyte.space-38063618188-1/candidate-source-contracts.txt)
turn §10's adapter warning into a bounded rehearsal checklist. Concrete blockers:
root catalog lacks candidate workshop-shared workers-types; shared versions and Vite
alias override differ; candidate scripts workspace/config generator must be included
where its dependency closure requires it; fresh configs must omit legacy BA hooks and
preserve candidate routing/migrations. Current-pin tests do not prove this compatibility.

Next: follow the review's rehearsal acceptance before any candidate pin/deploy decision.
Also fix the ref-tip-only source gate with a real reachable-ancestor Git regression;
its failure must not cause an unnecessary pin move. No production receipt, routing,
storage, auth policy, submodule pointer or visual score changed this fire.

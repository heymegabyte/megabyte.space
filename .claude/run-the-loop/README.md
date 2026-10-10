# /run-the-loop — Canonical Home (megabyte.space)

> **Current mission:** ADR 0002 fresh official OS migration supersedes the historical
> absorption frontier below. Read `docs/MIGRATION.md` and current committed gitlink
> before choosing work. Source bootstrap status is per-run evidence, not a permanent
> blocker. GitHub fleet execution/publication rules live in the loop command.

> The single canonical home for the Megabyte OS convergence loop. Brian says **"run the loop"**
> / `/run-the-loop` → a fire reads this dir to know how a cycle runs. Product: the **Megabyte OS
> estate** — public cinematic apex + Cloudflare OS behind Access at `os.megabyte.space`.
> Mission: megabyte.space is the **ADVANCED PLAYGROUND** — rapid AI-native, CF-native,
> edge-native, agentic UI evolution that continually ABSORBS projectsites.dev capability
> (Notion-like tables/grids/charts · Airtable-level automation on SQLite/D1/DO ·
> Coinbase-Pro-density dashboards · integrations everywhere) into Cloudflare OS's UI in minimal,
> visually-inspected, perfectly-placed increments — wrapped in WebGL + advanced web APIs (WebGPU,
> Web Audio, WebRTC, View Transitions). **projectsites.dev = stability; megabyte.space =
> frontier.** AI is the primary developer + a permanent product foundation.

## Canonical answers (Brian, 2026-09-29 — bake into every fire)

1. **Loop docs canonical home = `/.claude/run-the-loop/`.** This dir is the entry point.
   Siblings: `./OPERATING-PRINCIPLES.md` (non-negotiable invariants), `./BACKLOG.md` (live
   queue), `./ARCHITECTURE.md` (system shape), `./LEDGER.md` (append-only fire log).
   Requirement inputs consulted EVERY fire: `./ULTIMATE-REQUIREMENTS.md` (agent C authors) +
   `./PROJECTSITES-ABSORPTION.md` (agent B authors) — reference, never recreate; absent → note
   in the report + proceed from `BACKLOG.md`.
2. **PRIORITY journey = the estate path.** apex WebGL homepage → `/login` 302 → Access gate
   (OTP/WARP) → OS shell → absorbed-feature surfaces. Real render, real gate, real shell, real
   absorbed features, reconciled against source of truth. Everything else is secondary while
   this path has any gap/dead-end/stub.
3. **FRONTIER with a PINNED core.** Absorb projectsites.dev features aggressively, but the
   upstream `cloudflare-os` submodule stays PINNED — enhancements land ONLY in starter-owned
   layers (router worker `megabyte-os`, `packages/home`, custom gatekeepers, `/admin` branding)
   or a carefully-rebased overlay via the Upstream Sync lane. Never blind submodule edits.
4. **AUTONOMY = full autonomy on reversible prod actions.** `pnpm deploy`, homepage deploys,
   starter-layer changes, flag rollouts — just DO them, then prod-verify. Only truly
   destructive/irreversible pauses for Brian: Access app/policy deletion, secret rotation,
   zone/DNS mutations beyond the documented rulesets, submodule force-moves, billing/pricing.

## The prime directive

- **The PRIMARY deliverable of EVERY fire is a COMPLETE, REAL, end-to-end JOURNEY, proven
  working on PROD** — never a detector, a smoke check, or a mocked interaction.
- Real journey = apex homepage → navigate by CLICKING the actual UI → through `/login` →
  Access-authenticated OS shell (service-token context for automation) → use an absorbed
  surface → mutate → navigate away → return → HARD-REFRESH → verify PERSISTENCE → verify the
  cross-feature effect → clean up. Against the REAL backend.
- **Absorption counts only when LIVE + PLACED:** minimal, visually-inspected (screenshot +
  vision verdict ≥8/10, target 9+), perfectly-placed in the OS UI, flag-gated. A port dumped in
  a corner is not absorption.
- **Detectors + unit tests are a BYPRODUCT, never the goal.** Ship one ONLY after a real
  journey caught a real bug. A fire whose main output is a new detector is a FAILURE MODE.
- **"Ensure full flows happen" = COMPLETE the flow.** A journey with a gap/dead-end/stub →
  BUILD the missing product until it completes for real. Completing beats gating.
- Every fire leaves the estate closer to DONE and is **gorgeous-er AND more effortless** —
  Beautify-10x passes tracked per surface in `.claude/modifier-matrix.json` (never
  "functional but plain").

## Cycle lifecycle (one fire, in order)

1. **Orient (cheap).** Claim the fire lease (`.claude/run-the-loop/.fire-lease.json` — live
   lease → coalesce; stale >20 min → reclaim). Read this README + `./OPERATING-PRINCIPLES.md`
   + `./ULTIMATE-REQUIREMENTS.md` + `./PROJECTSITES-ABSORPTION.md` + the workstreams you're
   advancing (`./BACKLOG.md`) + `.claude/modifier-matrix.json`. `git fetch origin main && git
   pull --rebase`; `git submodule status` (confirm the pin). NEVER main-thread-read giant
   ledgers — delegate any inventory read to a fresh `Explore` agent (≤150-line cap). HARD STOP
   only on LEAD saturation (see § Failure recovery).
2. **Fan out the standing roster.** FIRST tool-call message emits parallel `Agent` spawns —
   the roster below (15 rotating + 2 standing + 1 scheduled lane), worktree-isolated
   (mutating) or read-only (research), on disjoint subtrees (`packages/home`, starter
   router/gatekeeper workers, `scripts/`, docs; NEVER inside the submodule tree). Each brief
   150–300 words, self-contained, primary deliverable written FIRST. ≤6-wide mutating;
   read-only sweeps free. ONE coherent slice per agent. Never bare `general-purpose` when a
   specialist fits.
3. **TDD-first.** A failing Playwright journey/spec BEFORE implementation → watch RED →
   implement → GREEN. Bug fix = failing regression first.
4. **Verify (self, per agent).** `pnpm check` (validates `deployment.jsonc` + dry-runs every
   OS Worker) where OS config/workers touched; `packages/home` typecheck + build where the
   homepage touched; touched tests. Never edit generated `wrangler.prod.jsonc`.
5. **Converge.** Main thread folds agent outputs into a coherent build; resolves conflicts;
   drops superseded code; wires every built unit to a reachable UI surface (no orphans);
   updates `LEDGER.md` + `BACKLOG.md` ticks + `.claude/modifier-matrix.json`.
6. **Adversarial review.** An independent reviewer (fresh subagent) assumes the implementation
   is subtly wrong and hunts: a submodule pointer move / in-tree submodule edit, a dropped
   `run_worker_first` entry, a weakened Access policy, lost functionality, hidden regressions,
   weak/mocked tests, a11y/security gaps, lying-empty absorbed surfaces. Plus the Agent
   Diversity Review gate. The implementer fixes valid findings in-turn.
7. **Deploy ONCE (main thread).** OS → `pnpm deploy` (root; six Workers) · homepage →
   `pnpm --dir packages/home deploy`. Auth: `unset CLOUDFLARE_API_TOKEN; export
   CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) CLOUDFLARE_EMAIL=blzalewski@gmail.com
   CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59` (scoped token lacks Workers scopes).
   NEVER modify already-set CF secrets. Agents NEVER deploy independently.
8. **Prod-verify (REQUIRED — local pass is NEVER sufficient).** `node scripts/verify-prod.mjs`
   (**6/6**) + Playwright real-browser on `https://megabyte.space` (0 console errors, H1 +
   settled WebGL hero, `/login` 302 with BROWSER Accept headers) + service-token fetch of
   `https://os.megabyte.space` (200 OS shell, NOT an Access login page). No completion claim
   without FRESH command-output evidence this turn.
9. **Reconcile display-vs-store.** For every data surface (absorbed tables/charts/dashboards),
   cross-check the DISPLAY against the AUTHORITATIVE STORE (D1/DO ground truth vs what the UI
   shows). `groundTruth > 0 && display == 0` = lying-empty. Causal probe for trackable
   surfaces (do X → store records it → UI shows it).
10. **Commit main + push + tick.** Straight to `main` (no dev/feature branches);
    conventional-commit + gitmoji IS the PR description; push immediately (rebase if rejected,
    NEVER force-push main). Merge + delete every worktree AND its branch the same fire. Tick
    `./BACKLOG.md` (Done only when Acceptance met, with closing SHA + prod proof), append
    `./LEDGER.md`, release the fire lease LAST.

## The fan-out agent ROLES — 15 rotating + 2 STANDING + 1 scheduled lane

Every fire spawns this roster together in ONE message, on disjoint subtrees. The discovery and
product roles REPLENISH the queue so the loop never drains a static backlog — a fire that
appends zero next-wave tasks means the discovery agent under-scanned; rotate its area.

1. **Absorption Delivery** — build/complete an absorption or product capability at root cause,
   behind a default-OFF flag, in starter-owned layers ONLY, wired reachable in the OS UI. The
   estate path is the first target; `PROJECTSITES-ABSORPTION.md` × `BACKLOG.md` picks the slice.
2. **Product Discovery** — reconcile `ULTIMATE-REQUIREMENTS.md` + `PROJECTSITES-ABSORPTION.md`
   + estate-path coverage; propose improvements at platform / journey / surface / component /
   state levels; GENERATE deduplicated next-wave tasks into `./BACKLOG.md`.
3. **Unit/Integration Testing** — domain logic, validation, parsing, permission rules, error
   mapping; fast, deterministic, isolated. No booting a browser for a pure unit.
4. **Golden-Path E2E** — LONG 30-50+ action journeys against PROD in real Chromium (estate
   path first): homepage-start, clicks/keyboard only, build-diagnose-fix-continue. Defects
   become NEW queue tasks. Full engine contract: `.claude/commands/run-the-loop.md` §6.
5. **UX/Visual — the Beautify-10x owner** — every iteration more beautiful AND more effortless:
   cinematic motion, brand-locked (`#060610` + `#00E5FF`), bento/asymmetry, refined type,
   real-time data (no Refresh buttons). Screenshots @ 6bp + AI-vision scores; advances the
   LOWEST-scored visited surface; writes `.claude/modifier-matrix.json` rows.
6. **Architecture** — overlay-boundary sweep (submodule pointer + in-tree diffs = drift),
   starter-layer coherence, flag + Zod + RFC7807 enforcement, orphan sweep, one-way-door ADRs.
7. **Repository Compression** — shrink code/files/deps/abstractions while preserving
   capability. Net deletion is a success metric.
8. **Documentation** — docs ship in the SAME commit as the code; ADR per one-way door; delete
   drift; keep `CLAUDE.md` + this home high-signal + accurate.
9. **Doc Compression** — compress instruction/doc files losslessly; keep always-loaded context
   lean.
10. **Dead-Code/Hygiene** — knip/ts-prune unused files/exports/deps; remove `console.log`,
    dead imports, stale CSS, resolvable TODOs; orphan sweep.
11. **Performance** — CWV on the WebGL apex (LCP ≤2.0s with lazy WebGL init, INP ≤100ms,
    CLS ≤0.05); kill waterfalls, oversized chunks (Three.js split); measure, don't guess.
12. **Security** — Access posture (app/policies/IdP/WARP), service-token hygiene, CSP L3 +
    Trusted Types, secrets, supply chain (pinned-submodule provenance), SSRF. Auth walls never
    on `/`.
13. **Accessibility** — axe 0 (necessary, not sufficient) + the manual WCAG 2.2 AA criteria;
    one `<h1>`/view; contrast ≥4.5:1; `prefers-reduced-motion` gates ALL WebGL/motion with a
    gorgeous static fallback.
14. **Technology Scout (+ Cloudflare Release Scout duty, ~every 4 fires)** — surface
    frontier CF-native primitives (Workers AI · AI Gateway · Browser Rendering · Vectorize ·
    Workflows · Queues · DO) + advanced browser APIs (WebGPU, Web Audio, WebRTC, View
    Transitions, scroll-driven) for the playground; feed adoption tasks (behind flags) into
    `./BACKLOG.md`. Release-Scout duty: CF developer-platform + product RSS + deprecations →
    dedupe by GUID into `./CF-RELEASES.md` → every relevant release driven to pilot / backlog /
    watch / reject-with-reason. Urgent deprecations come forward immediately; a feed outage
    never blocks core verification.
15. **Loop Improvement** — sharpen this system: fold lessons into `./OPERATING-PRINCIPLES.md`,
    guardrails, the roster; reinforce the VERIFIER leg (gate DONE on executed tests +
    prod-E2E, MAX_ITERATIONS cap, kill/reassign after ~3 stuck iterations, hard token budget).
16. **Long-Trail TDD case-owner (STANDING — every fire)** — grinds ONE checkpointed
    60-100-action browser case to completion across fires (lease + checkpoint + resource
    prefix). Full contract: `.claude/commands/run-the-loop.md` §1.16 + the `long-trail-tdd`
    skill.
17. **Deep UI Explorer / Visual Intelligence (STANDING — every fire)** — the real-browser
    agent that walks BOTH surfaces as a STATE GRAPH (not URLs), captures one settled
    screenshot after EVERY meaningful action, routes each capture through a real vision model
    via AI Gateway `megabyte-os`, feeds scores into `.claude/modifier-matrix.json`, and hands
    verified findings to implementation roles. READ-ONLY on product code during discovery;
    coverage ledger resumable across fires. Apex = public real-browser; OS = service-token
    browser context; OTP-interactive = BLOCKED-with-prerequisite, never faked. Contract:
    `.claude/commands/run-the-loop.md` §1.17 + `./OPERATING-PRINCIPLES.md` § Deep UI Explorer.
    Tools: `e2e/deep-ui-explorer/{explorer.mjs,vision-review.mjs,coverage-ledger.json}`.
18. **Upstream Sync (scheduled lane — every-2-fires)** — owns the pinned `cloudflare-os`
    submodule + starter overlay. Reviews upstream commits/tags/releases + deprecations; drives
    each relevant change to pilot / backlog / watch / reject-with-reason; bumps the pin ONLY
    to a reviewed ref, rebases the overlay, then `pnpm check` → `pnpm deploy` →
    `verify-prod.mjs` 6/6 in the SAME fire. Never edits inside the submodule tree; records the
    pin move (old→new SHA + proof) in `./LEDGER.md`.

- **Dynamic role creation** — when a fire needs a specialist none of the roster cover (a
  migration-agent, an incident-responder, a media-orchestrator), SPAWN it purpose-built for
  that fire per the agent taxonomy — never a bare `general-purpose`. Emit the assignment table
  + rejected-agent note before spawning; retire the role when its work lands.

## Cadence syntax

Each roster role / workstream declares WHEN it runs. The loop reads the cadence to decide
which roles fire this cycle:

- **`once`** — a one-shot unit; runs a single fire, then done (drops off the roster).
- **`every-loop`** — fires EVERY cycle (Absorption Delivery, Golden-Path E2E, Product
  Discovery, UX/Visual, Loop Improvement are effectively every-loop; roles 16-17 are standing).
- **`every-2-loops` / `every-4-loops` / `every-8-loops` / `every-16-loops`** — fires on that
  interval (Upstream Sync = every-2-loops; deep Architecture, Repo/Doc Compression, Technology
  Scout ride a wider cadence so they don't crowd out the estate path every fire).
- **`daily`** — fires on the first cycle of each calendar day (perf/security sweeps).
- **`weekly`** — fires on the first cycle of each calendar week (knip deep sweep, dependency
  audit, quality-ratchet baseline).

Cadence is a floor, not a cap: a role's cadence can be BROUGHT FORWARD when discovery or a
prod defect makes it the highest-value work this fire. A role all-green for ≥2 of its cadence
intervals goes maintenance-only (a healthy no-op is correct).

## Convergence rules

- **ONE coherent slice per workstream per fire.** Never split a multi-faceted brief into
  one-section-per-turn (that's the failure mode this loop prevents).
- **The queue never runs dry.** Every fire the Discovery + Product + E2E roles append
  deduplicated, evidence-backed next-wave tasks to `./BACKLOG.md`. Zero-append = under-scan.
- **A workstream is DONE only when its Acceptance passes** + its ledger entry is recorded + no
  dead refs remain + prod proof recorded. Never on a green local build.
- **A dimension all-`[x]` + green for ≥2 fires ⇒ maintenance-only** (a healthy no-op fire is
  correct — advance a different rung, never manufacture work).
- **Never pure-terminate on a quiet tree.** "HEAD unchanged AND tree clean" is permission to
  advance the highest-value standing track (estate path → absorption → beautify → docs), not a
  stop signal.
- **Category budget** governs how a fire allocates its roster (below) — the estate path +
  absorption always lead.

## Adversarial review

- **After any substantial refactor/feature, an INDEPENDENT reviewer** (separate subagent)
  assumes the implementation is subtly wrong and hunts: a `cloudflare-os` pointer move or
  in-tree submodule edit, a dropped `run_worker_first` entry, a weakened Access policy, lost
  functionality, hidden regressions, weak/mocked tests, unnecessary abstractions, dead compat
  code, a11y failures, security issues (secret leak, SSRF, CSP), state bugs, lying-empty data
  surfaces.
- **The implementer evaluates + fixes valid findings in-turn** — never asks Brian to arbitrate
  a normal engineering disagreement.
- **Agent Diversity Review gate** runs before DONE on every multi-agent fire: specialists
  assigned, overlapping scope caught, every agent verified its own work, rejected-agent note
  present, no two agents edited the same code.
- **Exploratory browser pass** (Stagehand/Browserbase or CF Browser Rendering) finds journeys
  we forgot to encode; every discovery becomes a deterministic Playwright regression.

## Validation requirements (green BEFORE commit — no claim without fresh output)

- **OS estate:** `pnpm check` — validates `deployment.jsonc` + dry-runs every OS Worker.
- **Homepage** (`packages/home`): typecheck + build (the `deploy` script builds first — a red
  build never ships); Vitest/Playwright where touched.
- **Config:** `deployment.jsonc` ONLY — `wrangler.prod.jsonc` files are generated + gitignored.
  `assets.run_worker_first` (`/login`, `/login/`, `/health`) stays intact.
- **Prod-verify:** `node scripts/verify-prod.mjs` (**6/6**) + Playwright real-browser apex
  (0 console errors, settled WebGL hero, browser-header `/login` 302) + service-token fetch of
  the OS shell; display reconciled vs store on data surfaces.
- **Console-error / CSP / Trusted-Types / 4xx-5xx / axe in ANY test = build fail.** Empty
  allowlist is the target.

## Failure recovery

- **Classify** (transient / code / config / deploy / data / auth) then apply the matching
  recovery — retry-with-backoff (max 3) for transient; read-diagnose-fix-test for code bugs;
  never `--force` / `--no-verify` to bypass a gate.
- **Root-cause, never symptom-patch.** Reproduce → failing regression → fix at the source →
  verify → inspect adjacent code for the same class. After 3 failed fixes, STOP and question
  the architecture.
- **Test failure means something** — determine if the implementation, requirement, test, or
  environment is wrong; never blindly flip red→green or delete valuable coverage.
- **Deploy failure** → read error → fix → retry; 3 fails → `wrangler rollback` → diagnose →
  redeploy. Blank/white/5xx on prod → keep debugging (bisect `git revert`, rollback,
  patch-forward, switch hypotheses) until it renders, OR hand off with the exact stack trace +
  suspected `file:line` + 3 candidate fixes.
- **Worker attrition ≠ lead saturation.** ONE agent dying (ECONNRESET / `subagent_tokens:0` /
  cut-off output) → salvage its commit (`git show <branch-tip>` BEFORE `git branch -D`),
  re-queue its slice in `./BACKLOG.md`, continue the fire. **HARD STOP** (checkpoint to
  `progress.md` + fresh session) ONLY when the LEAD hits "Prompt is too long" / autocompact
  thrash / can't spawn. Full taxonomy: `./OPERATING-PRINCIPLES.md`.
- **Concurrent-session stranding** — `git rev-list --left-right --count origin/main...HEAD`
  each round; `behind` growing or same non-`main` branch two rounds running → integrate to
  `main` NOW. Merge + delete every worktree + branch the same fire.

## How to extend

- **Add a workstream** — append a block to `./BACKLOG.md` (mission · cadence · Next unit ·
  Acceptance). It joins the roster automatically on the next fire.
- **Add an absorption slice** — pick from `./PROJECTSITES-ABSORPTION.md` (highest value ×
  lowest overlay risk), add a frontier line with executable acceptance.
- **Add a roster role** — add it above (or spawn it dynamically for a single fire).
  Purpose-built specialist per the taxonomy; never a bare `general-purpose`.
- **Add a flag** — every non-trivial feature ships behind a default-OFF flag; server returns
  404 when off, UI returns null.
- **Add a canonical journey** — extend `./BACKLOG.md`'s journey coverage + a Playwright spec
  (homepage-start, real backend); never delete an existing journey.
- **Capture a lesson** — a re-prompt on the same surface = a prediction miss. Root-cause WHY
  the first pass didn't predict it and fold the lesson into `./OPERATING-PRINCIPLES.md` (or
  the owning rule/skill) THE SAME TURN. Cross-link siblings.
- **Change cadence** — edit the role's cadence token; bring a role forward when a prod defect
  or discovery makes it the highest-value work this fire.

## Category budget (how a fire allocates its roster)

- **30–40% — Absorption / product / bugs** (Absorption Delivery + Dynamic — estate path first).
- **15–25% — Testing / golden-paths** (Golden-Path E2E + Unit/Integration Testing).
- **10–20% — UX / Beautify-10x / a11y** (UX/Visual + Accessibility — the playground's signature).
- **10–15% — Architecture / overlay integrity** (boundary, drift, ADRs, orphans).
- **5–10% — Cleanup / compression** (Dead-Code/Hygiene + Repository Compression).
- **5–10% — Docs** (Documentation + Doc Compression).
- **5–10% — Discovery** (Product Discovery + Technology Scout — replenish the queue).
- **5% — Loop-improvement** (sharpen this system + the verifier leg).

## Sibling files

- **`./OPERATING-PRINCIPLES.md`** — the non-negotiable invariants (absorption · design · UX ·
  architecture · testing · docs · AI-agent · hygiene · git · security · a11y · perf · failure
  taxonomy · explorer invariants · the lease).
- **`./BACKLOG.md`** — the live queue (workstreams · Next unit · Acceptance · cadence · Done).
- **`./ARCHITECTURE.md`** — system shape (two surfaces · hot path · ownership boundary ·
  deploy topology · IDs · gotchas).
- **`./LEDGER.md`** — append-only fire log (SHAs + prod proof); never main-thread-read
  wholesale — delegate to a fresh `Explore` agent (≤150-line cap).
- **`./ULTIMATE-REQUIREMENTS.md`** (agent C) + **`./PROJECTSITES-ABSORPTION.md`** (agent B) —
  the requirement inputs; consulted EVERY fire; referenced, never recreated by the loop.
- **`.claude/modifier-matrix.json`** — the Beautify-10x tracker (orchestrator-owned;
  per-surface pass-count + vision score; read at orient, written at reconcile).
- **`.claude/evolution/`** — the **Evolution Kernel** (protected policies + experience /
  knowledge / champions + the champion/challenger harness `bin/skill-eval.mjs`). Every fire
  FEEDS it evidence (LEDGER + memory + verifier output); the Loop-Improvement role may
  propose a challenger, but a fire NEVER mutates a champion skill without a winning
  counterfactual (champion vs challenger vs minimal vs no-skill). Dedicated *evolution fires*
  run `skill-eval.mjs` + record promote / adopt-minimal / retire / inconclusive decisions in
  `evolution/evals/results/`. Supreme rule: learn from *repeated evidence*, never one belief.
  Changing `evolution/kernel/` needs the stronger review in `kernel/policies.md § Protection`.
- **`.claude/commands/run-the-loop.md`** — the command (fire mechanics, roster contracts,
  journeys, budgets).
- **`./.fire-lease.json`** — the runtime fire-mutex (live = coalesce; stale >20 min = reclaim).

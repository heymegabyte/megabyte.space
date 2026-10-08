---
description: One verified fire of the Megabyte OS convergence loop. Claims the fire lease (overlapping scheduled fires coalesce, never collide), reads the canonical home under .claude/run-the-loop/ (README · OPERATING-PRINCIPLES · ULTIMATE-REQUIREMENTS · PROJECTSITES-ABSORPTION · BACKLOG · LEDGER · ARCHITECTURE), fans out the named worktree-isolated roster (15 rotating + 2 STANDING — Long-Trail TDD §1.16 + Deep UI Explorer/Visual Intelligence §1.17 — + the every-2-fires Upstream Sync lane §1.18 + dynamic roles) under a category budget, runs a convergence + adversarial-review phase, generates LONG 30-50+ action golden-path journeys that build-diagnose-fix-continue, advances Beautify-10x passes tracked in .claude/modifier-matrix.json, verifies + deploys + prod-verifies BOTH surfaces (apex + OS), commits to main, advances the BACKLOG frontier, and leaves ≥1 loop self-improvement. Fires when Brian says "run the loop".
argument-hint: "[role/lane name, category, or 'all' (default)]"
---

# Run The Loop — megabyte.space (Megabyte OS estate)

One deliberate fire of the megabyte.space convergence loop. Advance the **frontier** in
`.claude/run-the-loop/BACKLOG.md` by one coherent, verified slice per active workstream (default
`all`; or scope to `$ARGUMENTS`). **One coherent slice per role per fire** — never split a slice
across follow-ups; never start a large pass in a context-saturated session.

**The mission:** megabyte.space is the **ADVANCED PLAYGROUND** — the frontier estate where
AI-native, CF-native, edge-native, agentic UI evolution runs hottest. Every fire ABSORBS proven
projectsites.dev capability (Notion-like tables/grids/charts · Airtable-level automation on
SQLite/D1/DO · Coinbase-Pro-density dashboards · integrations everywhere) into Cloudflare OS's UI
in minimal, visually-inspected, perfectly-placed increments — wrapped in WebGL + advanced web APIs
(WebGPU, Web Audio, WebRTC, View Transitions). **projectsites.dev = stability; megabyte.space =
frontier.** The upstream `cloudflare-os` submodule is PINNED — enhancements land in the
starter-owned layers (router worker `megabyte-os`, `packages/home`, custom gatekeepers, `/admin`
branding) or a carefully-rebased overlay, never blind submodule edits.

**Every fire is a MULTI-PHASE wave, never queue-draining.** A roster of 15 rotating named roles
plus 2 STANDING roles (fan-out) runs in ONE message, followed by a **convergence phase**
(normalize) and an **adversarial-review phase** (hunt regressions). The loop replenishes its own
backlog — Product Discovery + the audit roles GENERATE the next wave — and **every cycle leaves ≥1
improvement to how future loops operate** (§8). A fire that appends zero next-wave items OR zero
loop-improvement means a role under-delivered.

## 0 — Orient (cheap; NEVER read giant ledgers in the main thread)
- **GitHub fleet runs:** obey the incoming workspace/publication contract. In a fresh isolated worktree, initialize the PINNED submodule before fork checks (`git submodule update --init cloudflare-os`) and install locked dependencies before build gates. An uninitialized fork is missing verification context, never proof of an unpushed fork commit. GitHub owns scheduling; do not arm session cron or the legacy watchdog. Commit locally and leave main publication to the outer runner when instructed.
- **★ BASH-CLASSIFIER WEDGE → write a `wedged-handoff` + END THE TURN (the watchdog auto-chains a fresh session; Brian 2026-10-06, hands-free since fire-247).** If Bash calls fail with **"claude-opus-4-8 is temporarily unavailable, so auto mode cannot determine the safety of Bash"**, the session's permission classifier is wedged — when FULLY wedged it NEVER recovers in-place (retries, cron ticks, allow-rules, bypassPermissions all fail; confirmed fire-2/3 + fire-204); when INTERMITTENT it's SLOW not dead (probe ONCE more — a second success means flaky, keep going carefully; fire-218). Either way `node`/`git`-mutation/deploy/verify may be dead, so a verified fire may be impossible. **You CANNOT self-`/clear` (it is a client command, not a tool) — the OUT-OF-SESSION `space.megabyte.loop-watchdog` is the only driver of the next session, so hand off to it and STOP.** The MOMENT a retry confirms the wedge: (1) `Write` the lease `.claude/run-the-loop/.fire-lease.json` directly (Write/Edit never need the classifier) with **`"phase": "wedged-handoff"`** + a deliberately stale heartbeat + a `note` saying "classifier wedge at orient, no work — RESUME-CHECK clean, run a normal new fire" (the DISTINCT no-work phase makes the watchdog relaunch on a SHORT ~10-min backoff instead of the ~30-min `released-handoff` one, so the loop retries ~3× faster through an intermittent outage); (2) tell the user in ONE line that the classifier is wedged → the watchdog will auto-relaunch within ~10 min (or they can `/clear` + re-run to unblock instantly); (3) **END THE TURN IMMEDIATELY — do NOT idle waiting out the timeout.** A fast exit frees the watchdog's single-flight lock sooner, so the next relaunch comes quicker. Do NOT spam Bash retries, "stand down and wait", or write long status reports each turn — that stalls the loop while burning turns. (Heartbeat/stale timestamps: the watchdog triggers on the `wedged-handoff` phase regardless of heartbeat value, and any timestamp >25 min old keeps the lease reclaimable — when you can't compute "now", a fixed old ISO like `2020-01-01T00:00:00.000Z` is fine.) **A wedge (or an `autocompact`-thrash / "Prompt is too long" saturation) MID-FIRE — ANY phase past orient, not just §0 — hands off the SAME way, IMMEDIATELY: do NOT wait for the 25-min stale window and do NOT push through a flaky classifier hoping it clears.** If git still works, commit the completed slice FIRST (→ a normal `released-handoff`); if even git is dead, `Write` a `wedged-handoff` whose `note` NAMES the uncommitted files so the next session SALVAGES them (RESUME-CHECK, never re-implement — per `commit-fire-bookkeeping-atomic-s11`). This is why a human should NEVER need to manually `/clear`: a mid-fire wedge that leaves the lease at `build`/`verify` (no handoff) idles the loop until the 25-min window — exactly what forced the 2026-10-08 manual `/clear` (fire-248 wedged at `verify` holding ~7 uncommitted files). Committing each coherent slice the MOMENT it lands keeps a wedge from stranding a multi-slice blob that jams the next rebase. See project memory `harness-classifier-outage-playbook` + `infinite-loop-rearm-watchdog-at-s11` + `manual-clear-is-a-recovery-gap`.
- **Claim the fire lease FIRST — fires are mutually exclusive.** Lease file: `.claude/run-the-loop/.fire-lease.json`. A LIVE lease (heartbeat < 20 min old) → COALESCE: end this tick immediately (the running fire is already advancing the same backlog). Absent or STALE (heartbeat > 20 min — the prior lead died) → claim by writing `{"fire":"fire-<n>-<slug>","runId":"…","phase":"orient","heartbeat":"<ISO now>"}`. Refresh `heartbeat` after each phase; CLOSE by HANDING OFF (phase `released-handoff` + stale heartbeat, NOT deleting) in §11 so the watchdog auto-chains the next fire — the loop is infinite + hands-free (see §11). If a ported `scripts/loop-fire-lock.mjs` exists, prefer it (claim/heartbeat/release; exit 3 = coalesce). **Write-tool fallback (harness Bash-classifier outage):** the `Write` tool IS a valid claim/heartbeat/handoff mechanism — write the lease JSON directly with a fresh ISO heartbeat (match the script's schema exactly); to hand off without `rm`, write a deliberately STALE heartbeat + phase `released-handoff` so the next tick reclaims instantly (on a classifier WEDGE at orient use phase `wedged-handoff` instead — see the ★ bullet above — so the watchdog retries on the short ~10-min backoff). Proven fire-2→fire-3 (2026-10-01). This is what stops a scheduler from stacking overlapping browser sessions + conflicting commits. **Auto-clear watchdog (Brian 2026-10-01: "automatically clear whenever needed"):** the launchd job `space.megabyte.loop-watchdog` (every 10 min, `scripts/loop-watchdog.sh`) watches the lease + `progress.md` and launches a FRESH headless `claude -p "run the loop"` whenever the loop needs a clean session — lease phase `released-handoff`, heartbeat >25 min stale (dead lead), or unshipped `progress.md` debt with no live fire. A live fresh-heartbeat lease is never preempted. Therefore: handing off per the recipe above IS requesting an auto-clear — no human restart needed; heartbeat honestly every phase so a healthy fire isn't double-driven.
- **Canonical home = `.claude/run-the-loop/`.** Read the small operator docs, in order:
  - **`CONSTITUTION.md` — Brian's governing constitution (the Autonomous Visual Product Organization, `/run-the-loop ∞`). SUPREME on conflict: CONSTITUTION > this command > global wrapper.** It governs disposition — visualization/navigation/delight over configuration, visual inspection IS implementation, three nested loops, ten-pass rule, golden paths as executable product design, anti-stagnation, START NOW. This command implements its mechanics for this estate; when they disagree, the constitution wins.
  - **`NORTH-STAR.md` — the Autonomous Business OS directive (Brian 2026-10-03): operate around GOALS/OPPORTUNITIES/OUTCOMES, not commands; propagate best-in-class product characteristics + compose shared PRIMITIVES (Goals/Opportunities/Agents/Tasks/Loops/Knowledge/Automations/Costs/Permissions/Provenance/…). Drain `BACKLOG.md § NORTH STAR` over many fires; run the 15-question PRODUCT-PROPAGATION AUDIT ~every few fires (a Product-Discovery role) + append findings to the backlog. UX stays calm/beautiful — machinery behind outcomes; never trade governance for autonomy.**
  - `README.md` — what the loop is + how to run one fire.
  - `OPERATING-PRINCIPLES.md` — invariants, gates, the 4 canonical answers, the category budget.
  - **`ULTIMATE-REQUIREMENTS.md`** (agent C authors) + **`PROJECTSITES-ABSORPTION.md`** (agent B authors) — the requirement inputs the loop MUST consult EVERY fire when choosing slices. Reference, never recreate; if absent, note it in the report and proceed from `BACKLOG.md`.
  - `BACKLOG.md` — the **frontier** (next unmet unit per workstream + acceptance). This is what you advance.
  - `ARCHITECTURE.md` — the two-surface estate shape + load-bearing decisions (the submodule boundary).
  - `LEDGER.md` — append-only fire log; the main thread does NOT read it wholesale (delegate any deep read to a fresh `Explore` agent, ≤150-line output cap).
  - **`.claude/modifier-matrix.json`** — the Beautify-10x tracker (orchestrator-owned): per-surface pass-count + vision score. Read it here; write it at §11.
- `git fetch origin main -q && git pull --rebase origin main` — a concurrent session may have progressed work; re-inspect the ACTUAL repo, never assume a prior attempt landed. `git submodule status` — confirm the `cloudflare-os` pin is where `LEDGER.md` last recorded it.
- **RESUME-CHECK (compaction-resumed / handoff-continuation fires):** equally, never assume a `released-handoff` DIDN'T already land — the watchdog may have executed it. BEFORE re-doing any handed-off `progress.md` work, `git log --oneline -8` + read the `LEDGER.md` tail + probe the live deploy for the expected commits/entries; if present, the handoff is DONE → pivot to independent RE-VERIFICATION + gap-hunting, NEVER re-execution (`loop-fire-lock claim` returning `reclaimed:true` means "free to run", NOT "already done" — completed work lives in commits + the LEDGER, not the lease). Only a genuine salvage case (partially done, lead died with uncommitted work) warrants continuing the build. Prevents duplicate fires (fire-26/27 vs resumed-fire-25, 2026-10-02 — see project memory `resumed-session-checks-already-done`). **Mechanical salvage-detector (run FIRST at orient):** `node scripts/check-fire-committed.mjs` — a non-clean watched tree (dirty source / a submodule gitlink behind an already-pushed fork / `forkDirty`) with NO live fire means a prior lead stranded deployed-but-uncommitted work (the prod-ahead-of-git class) → SALVAGE it (confirm the fork is pushed + prod is live via the slice's verifier, then commit the stranded gitlink + scripts) BEFORE any new slice; do NOT rebuild. **BRANCH on deploy-state GROUND TRUTH, not the lease `phase` label** (fire-244: the phase is set by the DYING fire — it flips to `verify`/`ship` the moment LOCAL vitest/tsc begins, BEFORE any commit/push/deploy, so `verify` does NOT prove prod is live; `forkDirty>0` [uncommitted fork files per check-fire-committed] = by-definition NOT in the gitlink = NOT deployed ⇒ a BUILD strand no matter what the phase string says — cross-check `check-deploy-state`): a TRUE `ship`/`verify` strand (CLEAN tree whose committed gitlink already matches `.last-deploy.json`) means prod is ALREADY live → the pure commit-the-gitlink case above; a `build`/`orient` strand OR any `forkDirty>0` tree means the work is BUILT but NOT shipped (fork dirty + UNpushed, router not repointed) → salvage = the FULL finish (verify → commit+push fork → bump gitlink → **deploy** → prod-verify), NEVER a gitlink-commit alone — that would strand the gitlink AHEAD of what prod actually serves (the inverse stranding). (fire-206: fire-205 died phase=`build` with a complete `/metrics` DEPTH slice; committing without redeploying would have pointed the gitlink at code prod wasn't running. fire-244: fire-243 died phase=`verify` with an UNcommitted+UNdeployed `surfaceAccent` slice — the `verify` label would have mis-branched it to commit-the-gitlink-alone; `forkDirty=9` correctly forced the full-finish deploy.) This turns the fire-52/147/203/206 recurrence into a gate at orient instead of an eyeball probe (project memory `prod-ahead-of-git-salvage` + `fork-gitlink-stranding-push-every-fire`). **Then `node scripts/check-deploy-state.mjs`** — the git-only detector above reads CLEAN when a fire committed+pushed its slice+gitlink but DIED before `pnpm deploy` (fire-220): this gate compares HEAD's committed cloudflare-os gitlink to the deploy ledger (`.claude/run-the-loop/.last-deploy.json`, written by `node scripts/record-deploy.mjs` run IMMEDIATELY after every successful `pnpm deploy`) and WARNs "DRIFT — probe prod before trusting git-clean" when HEAD is ahead of what's deployed (advisory, exit 0, never red-forever; `--json` for machine reads).
- **Context budget:** the main thread holds conclusions only. Never ingest ledgers or subagent transcripts wholesale.
- **HARD STOP = LEAD saturation ONLY, never a single agent's transient failure** (per `OPERATING-PRINCIPLES.md` § Failure taxonomy vs HARD-STOP). Checkpoint to `progress.md` + fresh session ONLY when the ORCHESTRATOR hits "Prompt is too long" / autocompact thrashing on the LEAD / the main thread can't spawn. ONE agent dying on ECONNRESET or returning `subagent_tokens: 0` from a network drop is fan-out ATTRITION → salvage its commit (`git show <branch-tip>` before `git branch -D`), re-queue its slice in `BACKLOG.md`, and KEEP THE LOOP RUNNING. Read WHICH thing failed before checkpointing.

## The 4 canonical answers (BAKED IN — DO NOT re-ask)
These are settled. Never re-prompt Brian for them; they govern every fire.
1. **Priority journey = the estate path** — `apex WebGL homepage → /login 302 → Access gate (OTP/WARP) → OS shell → absorbed-feature surfaces`. Every fire keeps this path green + gorgeous + embarrassingly easy first; other work is secondary.
2. **Frontier with a PINNED core** — megabyte.space absorbs projectsites.dev features aggressively, but the upstream `cloudflare-os` submodule stays PINNED. Enhancements land ONLY in starter-owned layers (router worker, `packages/home`, custom gatekeepers, `/admin` branding) or a carefully-rebased overlay via the §1.18 lane. A diff moving the submodule pointer outside that lane = drift, revert it.
3. **Autonomy = FULL on reversible prod actions** — `pnpm deploy`, `pnpm --dir packages/home deploy`, starter-layer changes, flag rollouts are standing-authorized. Ship them the same fire when green; never hold as "committed but dark."
4. **Pause ONLY for destructive/irreversible** — Access app/policy deletion or weakening, secret rotation, zone/DNS mutations beyond the documented rulesets, submodule force-moves, mass outreach, billing/pricing, one-way-door architecture. Everything else is yours to drive to done.

## 1 — Fan out ADAPTIVELY from the named-role catalog (default 3-6 roles + the 2 STANDING; full roster only when the backlog is wide) — in ONE message
**ADAPTIVE SHAPE (Brian, 2026-10-01):** the lead picks the **3-6 highest-leverage roles** for
THIS fire from the frontier + the §2 category budget (rotating starving categories), always
including the 2 STANDING roles (§1.16 Long-Trail, §1.17 Deep UI Explorer). Spawn the FULL
15-role roster only when the backlog is wide + genuinely independent. Evidence: two 6-agent
full fan-outs died at spawn/saturation; a lean lead-direct fire shipped 3 verified slices.
When spawns are impossible (harness outage), the lead executes the briefs DIRECTLY — the
briefs are the work contract either way.
Spawn the chosen roles together in ONE message — fresh, worktree-isolated (mutating) or read-only
(research) — on disjoint subtrees (`packages/home`, starter router/gatekeeper workers, `scripts/`,
docs; NEVER inside the `cloudflare-os` submodule tree). Keep ≥1 coding role active whenever ready
work exists. **≤6 concurrent mutating agents** (read-only sweeps are free + uncapped; run >6 units
as sequential waves of ≤6). Each role maps to the best-fit specialist — NEVER a bare
`general-purpose` when a named specialist fits. Emit the assignment table + rejected-agent note
BEFORE spawning; run the Agent Diversity Review gate before DONE.

**The canonical roles:** roles 1-15 rotate under the §2 category budget; roles 16-17 are STANDING (every cycle); role 18 runs every-2-fires.
1. **Absorption Delivery** — take a READY frontier slice (absorption first, from `PROJECTSITES-ABSORPTION.md` × `BACKLOG.md`); ONE coherent slice end-to-end (starter-layer code + default-OFF flag + tests + docs + beautify pass), landed in starter-owned layers ONLY. Specialist: `general-purpose`/`migration-agent`/domain builder.
2. **Product Discovery** — reconcile `ULTIMATE-REQUIREMENTS.md` + `PROJECTSITES-ABSORPTION.md` + estate-path coverage; propose platform/journey/surface/state improvements; GENERATE next-wave `BACKLOG.md` items. Specialist: `architect`/`content-writer`.
3. **Unit/Integration Testing** — TDD units + integration for shipped + at-risk code; close coverage gaps. Specialist: `test-writer`.
4. **Golden-Path E2E** — the LONG-journey engine (§6): 30-50+ action journeys against PROD (apex real-browser + OS via service token), build-diagnose-fix-continue. Specialist: `test-writer`/`deploy-verifier`.
5. **UX/Visual — the Beautify-10x owner** — screenshot every created/visited surface @ 6bp, AI-vision score, advance the LOWEST-scored surface this fire, write `.claude/modifier-matrix.json` rows (§7), `embarrassingly-easy-to-use` gate. Specialist: `visual-qa`.
6. **Architecture** — overlay-boundary sweep (submodule pointer + any in-tree submodule diffs = drift), starter-layer coherence, orphan sweep, one-way-door ADRs (the custom-domain-detach class). Specialist: `architect`.
7. **Repository Compression** — dead-weight in code: consolidate dupes, thin fat modules, shrink bundles (Three.js chunk-split). Specialist: `code-simplifier`.
8. **Documentation** — keep `CLAUDE.md` + `docs/` + the canonical home truthful to shipped reality; ADRs for decisions. Specialist: `content-writer`.
9. **Doc Compression** — compress verbose docs losslessly; retire stale/duplicate docs into the canonical home. Specialist: `content-writer`.
10. **Dead-Code/Hygiene** — knip/ts-prune + unused deps + `console.log` + resolvable TODOs; verify-then-remove. Specialist: `dead-code-remover`/`code-simplifier`.
11. **Performance** — CWV on the WebGL apex (LCP ≤2.0s with lazy WebGL init, INP ≤100ms, CLS ≤0.05), OS shell responsiveness, bundle budgets, Worker CPU ≤50ms p99. Specialist: `performance-profiler`.
12. **Security** — Access posture (app/policies/IdP/WARP), service-token hygiene, CSP L3 + Trusted Types on the homepage, secrets, supply chain (pinned-submodule provenance), SSRF. Auth walls NEVER on `/`. Specialist: `security-reviewer` (Opus-pinned).
13. **Accessibility** — axe 0 @ 6bp + the manual WCAG 2.2 AA criteria; `prefers-reduced-motion` gates ALL WebGL/motion with a gorgeous static fallback. Specialist: `accessibility-auditor`.
14. **Technology Scout** — verify stack currency + surface higher-leverage CF-native primitives (Workers AI models, AI Gateway features, Browser Rendering, Vectorize, Workflows, Queues, DO) AND frontier browser APIs (WebGPU, Web Audio, WebRTC, View Transitions, scroll-driven) for the playground; file adoption slices behind flags. **Carries the Cloudflare Release Scout duty (~every 4 fires):** official CF developer-platform + product RSS + deprecations → dedupe by GUID into `.claude/run-the-loop/CF-RELEASES.md` → drive every relevant release to pilot / backlog / watch / reject-with-reason; urgent deprecations come forward immediately; feed outages never block core verification. Specialist: `dependency-auditor`/`Explore`.
15. **Loop Improvement** — deliver the mandatory ≥1 improvement to how future loops run (§8): sharpen this command, the canonical docs, a gate/script, or a role brief. Specialist: `general-purpose`/`meta-orchestrator`.
16. **Long-Trail TDD case-owner (STANDING — runs EVERY cycle)** — owns ONE checkpointed long browser case per the `long-trail-tdd` skill (60-100 actions, 6+ surfaces, RED-before-fix, screenshot+AI-vision every view, durable checkpoint/resume). Works code+tests+live-browser TOGETHER in an ISOLATED worktree. **PRIORITIZES finishing a checkpointed case before rotating coverage** — never starts a new case while one is `in-progress`. Distinct from role 4 (which VARIES journeys each fire); role 16 GRINDS ONE case to completion across fires via checkpoint. Real email/SMS is fail-closed: no journey sends to a real recipient unless an operator-owned local allowlist file explicitly lists it (absent allowlist = hard deny; never a discovered/business address). Specialist: `test-writer`/`deploy-verifier`.
    - **No-overlap lease (mandatory).** Scheduled fires can run back-to-back, so two case-owner copies can be live at once. Serialize via a LEASE on the case ID + resource prefix in the case's checkpoint file: a LIVE lease (`in-progress by <otherRunId>`, heartbeat within ~20 min) → this copy picks a DIFFERENT case, never touches the leased case's files/resources; absent/STALE → reclaim. Claim = write `{caseId, status:"in-progress", runId, resourcePrefix:"ltt-<caseId>-", heartbeat}`; refresh each meaningful step; mark `done` on completion. The UX/Visual role SUPPORTS the active case-owner (feeds findings, makes NO competing edits).
17. **Deep UI Explorer / Visual Intelligence (STANDING — runs EVERY cycle)** — the real-browser agent that models BOTH surfaces as a GRAPH OF STATES + TRANSITIONS (route · auth context · panel · tab · nested subview · open menu · overlay — never URLs alone) and gives every meaningful action a settled screenshot + a real vision verdict. Specialist: `visual-qa`/`test-writer`.
    - **Ownership boundary:** owns `e2e/deep-ui-explorer/` (explorer.mjs · vision-review.mjs · coverage-ledger.json) + run manifests. **READ-ONLY on product code during discovery** — hands a precise, reproducible state path (breadcrumb + state key + screenshots + findings) to Absorption Delivery / UX / a11y roles, who fix in the same fire when feasible (RED → fix → GREEN → replay the exact breadcrumb → re-capture). It never deploys.
    - **Honest provider contract:** Cloudflare Browser Rendering via CDP is the preferred provider (run manifest records provider + session id); Browserbase/local Chromium = FALLBACK; a missing credential / failed Access handshake / OTP-interactive step = BLOCKED with the exact prerequisite — none of these ever count as passed coverage.
    - **Auth contract:** apex is PUBLIC — full real-browser, homepage-start, click-navigation. The OS is Access-gated — browser context carries the `megabyte-os-e2e` service-token headers (`CF-Access-Client-Id` + `CF-Access-Client-Secret` via Playwright `extraHTTPHeaders`; secret from `get-secret`, never hardcoded); assert the OS SHELL rendered (not an Access login page) before counting any OS state. Secrets/token-shaped strings are scrubbed from any context sent to a vision provider.
    - **Capture contract:** one settled screenshot after EACH meaningful action; each state records stable key, prev-state id, breadcrumb, console errors, failed requests, visible-text sample. The coverage ledger (discovered/visited/blocked/skipped-with-reason) is the resumable cursor — rotate underexplored branches each fire.
    - **Vision contract:** EVERY screenshot goes through a real vision model via AI Gateway `megabyte-os` (Workers AI, keyless) with compact grounded context; findings schema-validated across aesthetics · structure · function · a11y/perf · absorption-placement · architecture-HYPOTHESIS. Scores feed `.claude/modifier-matrix.json` (§7). Provider+model+tokens+cost recorded per image; reviewer failures recorded honestly; a clean screen with zero findings is a VALID result — never manufacture a defect.
18. **Upstream Sync (scheduled lane — every-2-fires)** — owns the pinned `cloudflare-os` submodule + the starter overlay. Reviews upstream commits/tags/release notes + deprecations; drives each relevant change to an explicit decision (pilot / backlog / watch / reject-with-reason); bumps the pin ONLY to a REVIEWED ref, rebases the overlay + re-applies starter-owned patches, then `pnpm check` → `pnpm deploy` → `verify-prod.mjs` all-green IN THE SAME FIRE. Never a blind bump; never edits inside the submodule tree (upstream-needed changes → overlay patch or upstream PR). Records the pin move (old SHA → new SHA + proof) in `LEDGER.md`. Specialist: `dependency-auditor` + `architect`.

**Dynamic role creation** — when a fire surfaces a concern no canonical role owns (a new integration,
a recurring incident class, an absorption campaign), MINT a purpose-built role that fire: name it,
give it scope + a specialist + acceptance, record it in `LEDGER.md`. If it recurs, promote it into
this roster via the Loop Improvement role. Roles serve the work — the list is a floor, not a ceiling.

Each brief is self-contained, 150–300 words: its slice · the ONE canonical doc path to read
(`BACKLOG.md` frontier + at most one section) · reuse-not-reimplement pointers · verify gates ·
"commit ONLY your paths, NEVER `git add -A`, never touch the submodule pointer, rebase if push
rejected" · "tick your `BACKLOG.md` line + append `LEDGER.md`". Write the primary deliverable FIRST.
Briefs stay tiny with near-zero exploratory reads — an agent told to "go read the app" dies at
`subagent_tokens: 0`.

## 2 — Category budget (prevent starvation, NOT rigid quotas)
Across a fire's spawned roles (and across recent fires), keep the mix roughly within these bands.
A fire may deviate for a genuine reason, but the loop over ~3-5 fires should trend into the bands.
Rotate roles fire-to-fire so nothing rots.
- **Absorption / product / bugs** — 30-40% (Absorption Delivery + estate-path bug slices lead every fire).
- **Testing / golden paths** — 15-25% (Unit/Integration + the LONG golden-path engine).
- **UX / Beautify-10x / a11y** — 10-20% (Visual QA + Accessibility — the playground's signature).
- **Architecture / overlay integrity** — 10-15% (boundary, drift, ADRs, orphans).
- **Cleanup** — 5-10% (Repository Compression + Dead-Code/Hygiene).
- **Docs** — 5-10% (Documentation + Doc Compression).
- **Discovery** — 5-10% (Product Discovery + Technology Scout — the backlog replenishers).
- **Loop-improvement** — 5% (the standing ≥1 improvement, §8).

**STARVATION TRIGGER (hard — Brian's core mission beats easy wins):** a category that has shipped ZERO
slices for ≥6 consecutive fires becomes the MANDATORY lead of the NEXT fire — the lead opens that fire with
a ready slice from it, FIRST decomposing a daunting backlog item into a small shippable one (per
`split-work-into-ledger`) before any easier infra/beautify win. **Standing example: Absorption (WS-2) starved
fires 52-69 (all auth/apex/model/beautify) because WS-2 was one vague "pick the first slice" item nobody could
grab — the fix (fire-70) was to DECOMPOSE it into a small ready slice AND add this trigger.** If a category has
merely UNDER-shipped (not zero) across the last few fires, the lead over-weights it THIS fire until the mix
rebalances.

## 3 — Per-role discipline (inside each agent)
- **TDD:** failing test FIRST → implement → green. Bug fix = failing regression first.
- **Reuse, don't reimplement** — the starter's router patterns, `packages/home` components, the `verify-prod.mjs` harness, custom gatekeepers, existing flag machinery.
- **Flags:** every absorbed/new capability behind a default-OFF flag; server 404 when off; UI null.
- **The submodule boundary:** starter-owned layers ONLY; never edit inside `cloudflare-os`; never move the pointer outside lane §1.18.
- **Config:** edit `deployment.jsonc` ONLY — `wrangler.prod.jsonc` files are generated + gitignored; keep `assets.run_worker_first` (`/login`, `/login/`, `/health`) intact.
- **Invariants:** honor `OPERATING-PRINCIPLES.md` — public front door, Zod at boundaries, RFC7807, durable D1/DO/R2 state, scale-to-zero, never force-push `main`.

## 4 — Convergence phase (AFTER fan-out — normalize before review)
Once the fan-out slices land in the main thread, run ONE convergence agent (or the main thread
itself when lean) to make the merged whole coherent:
- Normalize patterns across the merged slices (shared contracts, naming, error envelopes, brand tokens) so parallel work doesn't drift apart.
- Run the fast gate suite across the union of changes: `pnpm check` (validates `deployment.jsonc` + dry-runs every OS Worker) + the `packages/home` build + touched tests; fix conflicts + lint/type drift in-thread.
- **Update `LEDGER.md`** — one line per advanced slice with the commit SHA + prod proof; tick each advanced `BACKLOG.md` frontier line; update `.claude/modifier-matrix.json` rows for every visited surface.
- Fold every role's newly-found, DEDUPLICATED items into `BACKLOG.md` so the NEXT fire has ready work.

## 5 — Adversarial-review phase (hunt regressions the fan-out introduced)
After convergence, spawn ONE adversarial reviewer whose ONLY job is to try to BREAK the merged
result — the assumption is that parallel slices introduced a regression:
- Re-run the estate path end-to-end: apex renders (WebGL hero, 0 console errors) → `/login` 302 with BROWSER headers → Access gate intact → OS shell via service token → absorbed surfaces live.
- Diff-review for: a `cloudflare-os` submodule pointer move or in-tree edit (revert unless lane §1.18 shipped it), a `run_worker_first` entry dropped, an Access policy weakened, a flag left on, contract drift between slices, a swallowed error, a lying-empty absorbed surface (reconcile display-vs-store), a fix inert behind a false precondition, **a widened governance auto-approve allowlist** (`AUTO_APPROVE_KINDS` in `approvalStore.ts` grown beyond the reviewed `{deploy}` set, or the deny-by-default policy inverted — any widening of what skips the human HITL gate is a SECURITY decision requiring a recorded note + Opus-pinned review, never a silent diff; locked by `approvalStore.test.ts`).
- Any regression found → fix-forward in the main thread or ONE targeted agent (never re-fan-out for repair). Re-verify before shipping.
- The reviewer is Opus-pinned when the merged change touches auth/Access/security.

## 6 — ⭐ Golden-Path Engine: LONG build-diagnose-fix journeys
The Golden-Path E2E role does NOT write short happy paths. It generates **LONG journeys of 30-50+
UI actions** — proceeding deep into a flow, hitting an error mid-journey (~click 30-50), diagnosing
+ fixing it via TDD, then CONTINUING the journey to completion. This is the loop's primary way of
finding + fixing real defects.

**Role 4 VARIES the journey each fire; role 16 GRINDS ONE checkpointed case to completion.** Both
follow the `long-trail-tdd` skill contract when running long stateful cases.

**The engine's per-journey contract:**
- **Start at `https://megabyte.space`**, navigate by UI actions ONLY (clicks/keyboard/real forms) — never `page.goto()` after the initial load. Real UI + real backend, NEVER mocks. OS legs authenticate via the service-token browser context (§1.17 auth contract).
- **Go LONG (30-50+ actions):** assert visible content + console-error-free + axe-clean at each meaningful step; screenshot every step to `e2e/screenshots/{journey}/{step}.png`. A black WebGL canvas with 0 console errors is a lying-pass — vision-check it.
- **Hit an error mid-journey (~click 30-50):** a naturally-surfacing defect OR a deliberately deep/edge interaction that exposes one. PAUSE the journey and switch to TDD repair.
- **Diagnose + fix via TDD:** reproduce → failing test → fix the root cause (never suppress) → green → verify visually → keep coverage for the class.
- **CONTINUE the journey to completion** after the fix — prove the whole path end-to-end.
- **Vary journeys each cycle** — rotate slices of routes/controls/surfaces (apex sections, /login funnel, OS shell, Workshop, absorbed tables/automation/dashboards). Record which journey ran in `LEDGER.md`.

**≥2 example long journeys (rotate + adapt — seeds, not the only two):**

- **Journey A — "Visitor → operator through the front door" (estate path, ~35-45 actions):**
  apex homepage → WebGL hero settles (canvas present, framed, no console errors) → scroll every
  section (View Transitions / scroll-driven asserts) → keyboard-nav the header → click Log in →
  browser-header 302 funnel → Access (service-token context) → OS shell renders → open Workshop →
  browse an absorbed surface (tables/grid) → create + edit + persist a record → hard-refresh →
  persistence assert → **error surfaces (~click 32, e.g. an absorbed D1 read hitting a missing
  binding, or a `run_worker_first` regression swallowing a route)** → failing spec → root-cause fix
  → green → screenshot the fixed state → continue → matrix-score visited surfaces → `verify-prod.mjs` all-green.

- **Journey B — "Absorption depth + density" (~30-40 actions):**
  OS shell (service token) → absorbed Notion-like table → add columns + rows → switch to chart view
  → wire an Airtable-level automation (D1/DO trigger) → fire it → assert the DURABLE effect against
  D1/DO ground truth (display-vs-store, catch a lying-empty) → dashboard density pass
  (Coinbase-Pro-density without clutter) → View Transitions between panels → **error surfaces
  (~click 34, e.g. an automation writing the wrong table, or a chart reading a stale source)** →
  reproduce → failing test → fix → green → visual verify → continue to completion.

## 7 — ⭐ Beautify-10x doctrine (every created/visited surface, tracked)
- Every surface a fire CREATES or VISITS gets an iterative **"more gorgeous + more beautiful"**
  pass — cinematic motion, brand-locked black `#060610` + cyan `#00E5FF`, WebGL/scroll-driven where
  it serves, refined fluid type, glass+grain — never "functional but plain".
- **Tracking: `.claude/modifier-matrix.json`** (orchestrator-owned; the loop READS it at §0 +
  WRITES it at §11). Per surface: `{"passes": n, "score": 0-10, "lastFire": "fire-n", "notes": "…"}`.
  Score = the AI-vision verdict (role 17 / role 5).
- The bar ratchets: a surface below **9/10** stays hot — UX/Visual targets the LOWEST-scored
  visited surface each fire. 10 lifetime passes is the ambition ("10x"), not a cap — nothing is
  ever "done being beautiful".
- Absorption placement discipline: an absorbed feature counts as absorbed only when minimal +
  perfectly-placed + visually inspected (screenshot + vision verdict ≥8/10, target 9+).
- A fire that visits a surface without updating its matrix row under-delivered.

## 8 — Loop self-improvement mandate (≥1 EVERY cycle)
Every fire MUST leave the loop measurably better at running future fires — non-negotiable, owned by
the Loop Improvement role (any role may contribute). Pick at least ONE:
- Sharpen THIS command (a clearer phase, a fixed gap a re-prompt revealed, a better role brief).
- Improve a canonical doc (`OPERATING-PRINCIPLES`, `BACKLOG` hygiene, `ARCHITECTURE`, `README`).
- Harden a gate/script (a new drift/orphan/reconcile check, a faster verify, the fire-lock script port, a golden-path helper).
- Retire a recurring shortcoming: capture it durably + add the rule/gate that prevents it (a re-prompt on the same surface is a prediction miss; capture it THE SAME FIRE).
- Promote a proven dynamic role into the §1 roster, or rebalance the §2 budget from observed starvation.
A fire that ships zero loop-improvement under-delivered — surface why and do it next fire first.

## 9 — Verify (green BEFORE commit; no claim without fresh output)
- OS estate: `pnpm check` — validates `deployment.jsonc` + dry-runs every OS Worker (config drift caught before deploy).
- Homepage (`packages/home`): typecheck + build (its `deploy` builds first — a red build never ships); Vitest/Playwright where touched.
- Never edit generated `wrangler.prod.jsonc` (gitignored) — `deployment.jsonc` is the single config source.
- Claim ONLY what you ran THIS fire — paste the command output; a prior run or "looks correct" is not evidence.
- **Topology/auth flip ⇒ sweep EVERY verifier in the SAME fire.** When a flip INVERTS an assertion (e.g. the BA-5 Access relax: `anonymous os → cloudflareaccess.com` becomes `anonymous os → megabyte.space/signin`), `grep -l cloudflareaccess scripts/verify-*.mjs` AND re-run the long journeys (`verify-apex-journey`, long-trail cases) — rewrite EVERY stale assertion the same fire. A backlog item's named-file list ("rewrite verify-prod + verify-os") is a FLOOR, not the complete set: fire-57 flipped the fork gate but left verify-prod #3 AND verify-apex-journey's funnel asserting the pre-relax `cloudflareaccess.com` — two false-REDs fire-58 salvaged. The adversarial-review phase (§5, re-run the estate path end-to-end) is what catches the verifiers the named list misses — NEVER skip it after a flip.

## 10 — Ship (prod pre-authorized per canonical answer #3)
- Commit each slice to **`main`** (conventional commit) + push (rebase if rejected). Main-only; delete each worktree + branch the moment its work lands (cleanup is NOT automatic). Never `git add -A`; never commit a `cloudflare-os` pointer move outside lane §1.18.
- Wrangler auth (the scoped token LACKS Workers scopes — code 10000): `unset CLOUDFLARE_API_TOKEN; export CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) CLOUDFLARE_EMAIL=blzalewski@gmail.com CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59`.
- Deploy the changed surface: OS → `pnpm deploy` (root; builds + deploys the six OS Workers) · homepage → `pnpm --dir packages/home deploy`. ONE deploy stream — agents never deploy independently.
- **Prod-verify (REQUIRED):** `node scripts/verify-prod.mjs` (**all-green**) + Playwright real-browser on `https://megabyte.space` (0 console errors, H1 + settled WebGL hero, `/login` 302 with BROWSER Accept headers) + service-token fetch of `https://os.megabyte.space` (`CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` → 200 OS shell, NOT an Access login page). Reconcile data surfaces display-vs-store, never render-alone.

## 11 — Reconcile + report
- Tick each advanced frontier line in `BACKLOG.md` + append `LEDGER.md` with the commit SHA + prod proof + journey + beautify deltas. Move a workstream to § Done only when Acceptance is fully met.
- **Write `.claude/modifier-matrix.json`** — every surface created/visited this fire gets its pass-count incremented + a fresh vision score.
- **Replenish the backlog:** append the DEDUPLICATED next-wave items (Product Discovery + Technology Scout + Golden-Path findings + the adversarial reviewer's fresh defects) to `BACKLOG.md`. Zero-append = a discovery role under-scanned — rotate its area next fire.
- **Commit the §11 bookkeeping ATOMICALLY** — after the matrix/backlog writes above, run `node scripts/commit-fire-bookkeeping.mjs --fire fire-<n> --note "<what shipped>"`. It stages + commits the canonical bookkeeping paths (LEDGER · modifier-matrix · .last-deploy · BACKLOG) in ONE commit and REFUSES (exit 2) unless `LEDGER.md` already carries a `## fire-<n>` entry — so a fire can never tick the backlog/matrix without a durable record (the fires 230→234 loop-tail strand class). The slice's CODE is a separate `feat` commit made earlier; this collapses only the trailing bookkeeping into one hard-to-interrupt step. (fire-235.) **PREFER the single-call `--ledger-file` form (fire-237): write the fire's LEDGER entry to a scratch file (`/tmp/fire-<n>-entry.md`, starting with a `## fire-<n> — …` heading) and run `… --fire fire-<n> --ledger-file /tmp/fire-<n>-entry.md` — it appends the entry to `LEDGER.md` AND commits in the SAME invocation, so reaching that one Bash call completes the record. This removes the gap fires 230→236 ALL died in: a slow LEDGER Edit landed but the separate commit never ran. Idempotent (a re-run never double-appends); refuses a file that doesn't name the fire.**
- **Confirm the ≥1 loop-improvement landed** (§8) and name it in the report.
- Report: Changes · Next unmet unit per workstream · which golden journey ran + what it fixed · the Deep UI Explorer's provider/session + states visited/deferred + vision count/cost · beautify matrix deltas · upstream pin status · external blockers · Recs (only genuine >2h / design-call / destructive-decision items — ship everything else inline).
- **Verify the cadence cron is armed** — `CronList` must show the every-15-min durable "run the loop" job; missing or inside ~24h of its 7-day auto-expiry → re-arm via `CronCreate` (`*/15 * * * *`, durable, prompt "run the loop") and record the new job id in `LEDGER.md`. Know the mechanics: durable cron ticks fire INTO the running REPL while idle (same session — same harness state); a fresh session only picks the job up on next LAUNCH. A wedged session therefore can't be rescued by its own cron — that needs a restart or another session.
- **Verify the WATCHDOG is armed** — `launchctl print gui/$(id -u)/space.megabyte.loop-watchdog` must succeed (the launchd agent is loaded); if it errors (not loaded) re-arm with `launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/space.megabyte.loop-watchdog.plist` and note it in `LEDGER.md`. The watchdog is the SOLE out-of-session driver of the next fire — an UNARMED watchdog means every handoff (released- OR wedged-) silently dies and a human must manually `/clear` to restart the loop (the recovery gap this closes; project memory `manual-clear-is-a-recovery-gap`). It only runs ~seconds every 10 min, so absence from `ps` is NORMAL — trust `launchctl print`, not a process grep.
- **Assert the fire committed its work** — `node scripts/check-fire-committed.mjs` must be CLEAN (no dirty tracked source under packages/ · scripts/ · deployment.jsonc · the canonical home) BEFORE releasing the lease. A dirty tree means the fire ticked work DONE but left it uncommitted + credited a phantom SHA (the fire-52 salvage class, 2026-10-03). Commit or revert, then release.
- **Close the fire LAST by HANDING OFF, not deleting — this is what makes the loop INFINITE + hands-free (Brian 2026-10-06).** On a clean completion run `node scripts/loop-fire-lock.mjs handoff --run-id <id> --note "<what shipped + queued next-fire priorities>"` (or, Write-tool fallback during a Bash outage, write `.fire-lease.json` directly with `phase: "released-handoff"` + a deliberately STALE heartbeat + the note). (A productive fire's clean close is `released-handoff` — the watchdog relaunches on the normal ~30-min backoff. The OTHER handoff is `wedged-handoff` [`handoff --wedged`], written ONLY by a §0 classifier-wedge bail that did no work, which the watchdog retries on a SHORT ~10-min backoff so an intermittent outage recovers ~3× faster — see §0's ★ bullet.) This writes a `released-handoff` lease instead of deleting it, so `space.megabyte.loop-watchdog` (every 10 min) relaunches a FRESH `claude -p "run the loop"` within ~10 min — the next fire reclaims instantly (stale → free) and runs, chaining forever, each fire in a fresh session (which also sidesteps context saturation). **DELETING the lease on a clean completion leaves NO signal → the watchdog's handoff/debt paths never fire → the loop IDLES until a human re-runs it.** The model CANNOT self-`/clear` (a client command, not a tool), so this out-of-session watchdog hop is the ONLY driver of the next fire — the handoff is mandatory, not optional. (A genuine coalesce/duplicate-fire still ends WITHOUT writing a handoff — only a fire that actually ran to completion re-arms. The watchdog's lock/backoff prevents stacking.) See project memory `infinite-loop-rearm-watchdog-at-s11`.

## Discipline (non-negotiable)
- One coherent slice per role per fire; fan out for independence; the main thread orchestrates + converges + reviews + **deploys once** + verifies — agents never deploy independently.
- **Delegate-when-saturated:** if the main thread is context-heavy, fresh agents do the heavy pass while the main thread stays lean. **HARD STOP + fresh session is a LEAD-saturation trigger ONLY** — never for a single worker's transient failure. Worker attrition ≠ lead saturation: salvage (`git show <branch-tip>` before deleting the branch) + re-queue + keep the loop running (`OPERATING-PRINCIPLES.md` § Failure taxonomy vs HARD-STOP).
- Merge to `main` every round; delete every worktree AND branch the round its work lands.
- Destructive/irreversible actions (canonical answer #4) → ship the decision-independent slice, never auto-execute the destructive action.
- **Delicate PROD-MUTATING work is a DEDICATED-SESSION task, never a loop-tail rush.** A slice that mutates the working prod core — AI-inference routing / gateway-auth / billing / an auth-policy flip / a schema migration — gets GROUNDED MAXIMALLY (prove the mechanism cheaply, map the exact seams + risks) + written as an EXECUTION SPEC in `BACKLOG.md`, then a clean decision-independent slice ships THIS fire; the delicate change runs in a focused session with a before/after verification designed up front. Rushing it at a loop tail (where context is already spent) risks a prod regression on a feature that currently WORKS. (fire-74: WS-12 DeepSeek — spec'd, not rushed.) This is NOT deferral-avoidance — the grounding + spec IS the progress; the clean slice keeps the fire productive.
- A workstream is DONE only when Acceptance passes + `LEDGER.md` records it + no dead refs remain.

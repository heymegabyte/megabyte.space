# LEDGER — append-only fire log

> One block per fire, appended at reconcile (command §11). The main thread NEVER reads this
> file wholesale — delegate any deep read to a fresh `Explore` agent (≤150-line output cap).
> Completed slices land here with commit SHA + prod proof; `./BACKLOG.md` holds the live
> frontier. The `cloudflare-os` pin recorded here is the OS-wide rollback point.

## Entry format (append verbatim per fire; fill every field, "none"/"clean" when empty)

```
## fire-<n> — YYYY-MM-DD — <lead run id>
- roster: <roles spawned> · rejected: <rejected-agent note> · budget: <category mix>
- [<role>] <slice> — <sha> — prod: <verify-prod all-green | URL + assertion | screenshot path>
- journey: <which golden-path journey ran> — found+fixed: <defect at root cause | clean>
- long-trail: case <id> — <actions done>/<total> — <checkpoint state | lease holder>
- explorer: provider=<cf-browser-rendering|fallback|BLOCKED:<prereq>> session=<id> ·
  states +<new>/<total> · vision <n> images (<model>, <cost>)
- beautify: <surface>: pass <n>→<n+1>, score <a>→<b> · matrix updated: yes
- upstream: pin <sha> (unchanged | <old>→<new> + check/deploy/all-green proof)
- backlog: +<n> next-wave appended · <n> frontier lines ticked
- loop-improvement: <the ≥1 improvement landed>
- attrition: <agent failures salvaged/re-queued | none>
```

## Fires

- (no fires yet — the first fire appends below this line)

## fire-2 — 2026-10-01 — fire-2-run (constitution-live)

- roster: lead-direct implementation (harness Bash/Agent classifier OUTAGE blocked all spawns + shell for ~35 min mid-fire) covering Security+Absorption (apex worker), UX/Beautify (How-It-Works), Golden-Path+Long-Trail (case-001 leg 1), Loop Improvement (constitution + fire-lock + all-green phrasing) · rejected: all Agent spawns (classifier down; briefs executed by lead verbatim), Opus-pinned reviewer (Opus unavailable → sanctioned fallback) · budget: ~35% product/security · ~25% testing/journey · ~15% beautify · ~25% loop/docs
- [loop] CONSTITUTION.md saved verbatim + command §0 precedence wiring — SHA pending ship (see progress.md) — prod: n/a (docs)
- [security+absorption] apex worker: exact-BACKLOG CSP + COOP/CORP on EVERY response (incl. /login + /health which shipped BARE before), `run_worker_first ["/*","!/assets/*"]` root-cause fix (asset layer bypassed the worker for `/` — headers never reached browsers), AnalyticsCounter DO (SQLite, zero-PII) + flag-gated `/api/analytics/live` — SHA + deploy + verify-prod all-green PENDING SHIP — RED proven live pre-deploy (CSP/COOP/CORP/PP ABSENT on `/`; live endpoint = lying-200 SPA shell)
- [ux] How-It-Works animated timeline (beam draw + node ignition + cascade + reduced-motion static) + FOUND-AND-FIXED dead hover-lift on every revealed card (`.reveal.is-in` specificity tie killed `.card:hover` transform; reveal now uses `translate`) + webgl dead render-loop removed — SHA pending ship
- journey: estate-path leg 1 (12 actions, 5 screenshots, playwright-mcp FALLBACK provider) — found+fixed: dead card-hover lift (root cause, CSS property split) + bare `/health`/`/login` headers (root cause, withSecurityHeaders-everywhere); found-upstream-only: CF Access login page's own CSP blocks its own SVG (not ours)
- long-trail: case-001 — 26/60 designed, 12 executed — checkpoint committed, lease fire-2
- explorer: provider=BLOCKED:classifier-outage-for-bootstrap (WS-4 untouched this fire; journey ran on playwright-mcp fallback, recorded honestly)
- beautify: home.how-it-works pass 1→2 (score pending post-deploy vision) · os.login confirmed 6 · hero/features/trust re-verified 8.5/8/8 · matrix write at ship
- upstream: pin 6478a144 (unchanged; repin-to-release-tag item remains queued WS-6)
- backlog: +3 next-wave appended (hover-lift guard · real-404 rewrite · os.login branding) · ticks pending ship
- loop-improvement: (1) constitution landed + precedence-wired; (2) "6/6"→"all-green" phrasing sweep kills the stale-count doc-drift class; (3) fire-lock lease machinery verified-in-design + runbook'd; (4) harness-classifier-outage playbook captured to project memory
- attrition: zero agents (none spawnable); lead executed all briefs; ship steps runbook'd in progress.md pending classifier recovery

## fire-4 — 2026-10-01 — fire-4-run (shipped fire-2+fire-3 debt; classifier recovered)

- roster: lead-direct (Bash/Agent classifier RECOVERED this session — toolchain fully back; ADAPTIVE lean shape per command §1 — a deterministic convergence+ship chain, not independent fan-out) covering Security+Absorption (apex worker ship), Golden-Path+UX (real-browser estate leg + CSP regression repair), Loop Improvement (verify-browser.mjs gate + watchdog LIVE) · rejected: all Agent spawns (dependent ship pipeline, not independent work — lean lead-direct is the sanctioned shape), Opus-pinned reviewer (Opus unavailable; adversarial review run lead-direct) · budget: ~45% product/security/ship · ~25% golden-path+repair · ~15% beautify/visual · ~15% loop/docs
- [security+absorption] apex worker SHIPPED: full security headers (CSP+COOP/CORP/HSTS/PP) on EVERY response + zero-PII AnalyticsCounter DO + flag-gated /api/analytics/live + run_worker_first ["/*","!/assets/*"] — ebadf39a + e55fee56 — prod: verify-prod 8/8 all-green; causal probe today 1->4 (DO writes reflected in endpoint — display-vs-store reconciled, not lying-empty)
- [golden-path/ux] REAL-BROWSER estate leg (apex): hero renders (fonts+WebGL+gradient headline), 6-card features bento renders on scroll (reveals 5->13), 0 OUR console errors. FOUND+FIXED mid-journey: the new CSP broke 31 live resources (CF Fonts serve same-origin /cf-fonts → font-src 'self'; CF Web Analytics beacon → allow static.cloudflareinsights.com + connect cloudflareinsights.com) while HTTP verify-prod stayed green (lying-pass) — aae8d822 — prod: 31→0 OUR console errors, verify-browser 4/4, hero 304KB paint clip
- [ux] How-It-Works animated timeline + hover-lift revival (translate) + Authentik→OTP/WARP copy truth + dead webgl loop removed — 10d7ec5e — prod: deployed; section renders opacity:1, reveals fire on scroll
- [loop] constitution + fire-lock lease (7/7 node:test) + auto-clear watchdog LIVE (launchctl print: active, 600s interval) + WS-4 explorer bootstrap committed + Write-fallback doctrine — ff2144af + ef191b6a — prod: n/a (infra); watchdog armed
- journey: estate-path apex leg (build→diagnose→fix→continue) — found the CSP-break regression AT the real-browser step, root-caused (unaccounted CF edge injections), fixed CSP in worker+verify-prod lockstep, redeployed, PURGED stale edge cache (cf-cache-status HIT served old headers), re-verified 8/8 + browser 4/4, continued to features. Next fire varies to the OS-shell leg via service token.
- long-trail: case-001 — leg-1 fixes now LIVE (verify-prod + real-browser proof); leg-2 (OS shell) still owed — checkpoint in e2e/long-trail/case-001.estate-path.md
- explorer: provider=playwright-mcp (FALLBACK, recorded honestly; CF Browser Rendering provider still queued WS-4) session=mcp · states: apex + features visually captured · vision: 2 real-browser screenshots (human+model inspected) — gorgeous, on-brand black/cyan
- beautify: home.hero 8.5 re-confirmed (fonts restored post-fix) · home.features 8 re-confirmed (bento renders) · how/trust lastVisit refreshed · matrix updated: yes
- upstream: pin 6478a144 (UNCHANGED — adversarial-verified: no pointer move in any fire-4 commit; repin-to-release-tag remains WS-6)
- backlog: WS-1 estate baseline + 3 SECURITY items (CSP / COOP-CORP-PP / analytics-live) ticked; WS-7 fire-lock + watchdog-armed ticked; +4 next-wave appended
- loop-improvement: verify-browser.mjs — the real-browser console+paint gate that catches the CSP-break lying-pass class HTTP verify-prod CANNOT see (this fire's own miss → a durable gate); PLUS the auto-clear watchdog went authored→LIVE this fire
- attrition: none (classifier recovered; all steps lead-executed + verified with fresh output)

## fire-5 — 2026-10-01 — fire-5-run (Deep-UI-Explorer: first OS-shell inspection)

- roster: lead-direct (standing role 17 Deep UI Explorer + role 10 Hygiene + role 15 Loop Improvement) · rejected: all Agent spawns (single discovery-led surface — lean lead-direct) · budget: ~50% discovery/visual · ~25% explorer hardening (loop) · ~25% hygiene/reconcile
- [explorer] WS-4 LIVE RUN: `explorer.mjs --surface both` → 7/7 states visited, 0 blocked (apex ×6 + os.shell.root via service token). FIRST-EVER OS-shell capture: access:false (REAL shell, not an Access page), title "Home - Cloudflare OS"; run manifest + coverage-ledger committed — fa51af1f — prod: n/a (read-only discovery)
- [explorer] FIX: service-token `extraHTTPHeaders` scoped to the OS origin only (page.route) — it was leaking the CF-Access header onto the cross-origin CF Web Analytics beacon → CORS-preflight ARTIFACT error polluting the OS console capture. After the fix the OS console shows ONLY the genuine WS-403 RPC limitation (re-run verified artifact gone) — fa51af1f
- [discovery] TOP FINDING: the OS shell is OFF-BRAND — stock Cloudflare OS light/cream + ORANGE theme, jarring vs the black/cyan cinematic apex. As a Megabyte surface 4/10. #1 absorption/branding priority → black/cyan theme via STARTER customization (docs/customization.md), NEVER the pinned submodule. Promoted to BACKLOG.
- [discovery] OS realtime RPC (`wss://os.megabyte.space/api`) 403s under service-token auth — browser WebSocket upgrades cannot carry Access headers; real WARP/OTP cookie sessions reconnect fine. OS dynamic-feature E2E needs WS-8 slice-4 credential-equivalent (or a cookie/WARP context). Documented, NOT a prod defect.
- [hygiene] removed 14 stray worktrees + branches (8 agent-* at ≤14bced15, salvage-checked empty; 6 pool-* prunable) → only `main` remains
- journey: explorer state-graph walk (discovery, not a build-diagnose-fix journey) — apex 6 states re-walked (hero 1 upstream err, login-funnel Access-page err — both documented); OS shell reached + console captured honestly
- long-trail: case-001 — leg-2 (OS shell) REACHED via service token (first time); dynamic RPC legs blocked on the WS-auth limitation above — checkpoint unchanged
- explorer: provider=local-chromium (walk) + cf-browser-rendering (captures available) · states +1 real (os.shell.root) / 8 total in ledger · vision: 2 screenshots human-model-inspected (hero 8.5, os.shell 4.0); AI-Gateway vision-review.mjs automated path still owed
- beautify: os.shell 0→4 (first inspection, real evidence) · matrix updated: yes
- upstream: pin 6478a144 (UNCHANGED — no submodule touch)
- backlog: WS-4 explorer-bootstrap ticked (live run done); +3 next-wave (OS black/cyan theme · WS-auth-for-OS-E2E = WS-8.4 · AI-Gateway vision live run)
- loop-improvement: explorer header-scoping fix (honest OS console capture) + documented the service-token↔WebSocket OS limitation as a durable OS-E2E constraint
- attrition: none

## fire-6 — 2026-10-01 — fire-6-run (DIRECTION CAPTURE: OS → apex + first-run overlay)

- roster: lead-direct (Product Discovery + Architecture + Documentation + Loop Improvement) · rejected: all Agent spawns (direction-capture + planning — no independent fan-out) · budget: 100% discovery/architecture/docs (a steering fire)
- [direction] Brian corrected the estate topology: "CloudFlare OS should be at megabyte.space … make it just show up as a layer that you dismiss that only shows the first time until you press the button to go in." → the APEX serves the OS; the WebGL homepage becomes a first-run dismissible intro layer (shown once, "Enter/go in" dismisses + persists a flag, suppressed on return). Deliberately overrides public-front-door for this estate.
- [architecture] investigated the customization surface (docs/customization.md): the router serves the OS frontend (UPSTREAM) → the overlay MUST be a WRAPPER worker in front (submodule stays pinned); /admin does runtime name/logo/accent; the domain flip detaches megabyte-home + needs an Access host change (canonical #4 PAUSE) + context.sharingDomain/publicBaseUrl pinning to preserve data. Captured as WS-11: 5 ordered risk-tagged slices + gotchas.
- [docs] directive captured SAME-TURN (prompt-as-training-signal): project CLAUDE.md two-surface header rewritten to the target topology; GLOBAL public-front-door rule gained a 2026-10-01 reference incident (this estate reverses the split — don't "fix" it back); BACKLOG WS-11 authored.
- journey: none (steering fire)
- long-trail: unchanged · explorer: none this fire
- beautify: none (planning fire); OS black/cyan theme folded into WS-11 slice 2 + the fire-5 os.shell 4/10 finding
- upstream: pin 6478a144 (UNCHANGED)
- backlog: +WS-11 (5 slices) — the new PRIORITY workstream
- loop-improvement: the directive is captured in THREE durable places (project CLAUDE.md + global rule + WS-11) so the migration executes correctly even from a fresh session; flagged that the one-way-door execution belongs in a FRESH full-budget session (delegate-when-saturated), not the tail of this long one
- attrition: none
- NOTE: NO prod change this fire — the OS→apex migration is a one-way-door (domain + Access host) deliberately NOT half-executed at session-end. WS-11 is the executable plan.

## fire-7 — 2026-10-01 — fire-7-run (WS-11 Slice 1: first-run overlay behaviour)

- roster: lead-direct (Feature Delivery + Golden-Path TDD + Loop Improvement) · rejected: all Agent spawns (single coherent feature slice) · budget: ~60% feature · ~30% TDD/verify · ~10% reconcile
- [feature] WS-11 Slice 1 — first-run overlay behaviour in `packages/home`, flag `VITE_FIRST_RUN_OVERLAY` (default-OFF → live apex byte-identical): "Enter the OS" persists `localStorage.megabyteOS_entered`; a return visitor auto-skips to the OS entry via a redirect splash; fires only on "/" (never intercepts the OS entry) — 39fa9579 — prod: shipped DARK, verify-prod 8/8 + verify-browser 4/4 (hero paints 304KB, 0 OUR console errors — NO regression)
- [tdd] `e2e/first-run-overlay/verify.mjs` — real-browser (local vite preview), RED 1/3 before impl → GREEN 3/3 after (first-visit shows overlay · Enter persists flag + goes to OS · return-visit auto-skips). Harness fix mid-flight: same-origin `/login` stub (route-ABORT drops the page to an opaque origin → localStorage denied).
- journey: TDD feature-build (RED→GREEN), not a long golden-path this fire
- long-trail: unchanged · explorer: none
- beautify: home.hero re-verified live post-deploy (304KB paint, 0 OUR errors, 4/4) — 8.5 holds · matrix lastVisit refreshed
- upstream: pin 6478a144 (UNCHANGED)
- backlog: WS-11 Slice 1 ticked; Slices 2-5 remain (the domain flip is Slice 4 — Access host change = Brian-gated)
- loop-improvement: a durable reusable real-browser overlay verifier (`e2e/first-run-overlay/verify.mjs`) + the same-origin-stub pattern for testing client redirects locally (baked into the harness comments)
- attrition: none

## fire-8 — 2026-10-01 — fire-8-run (WS-11 Slice 3: origin-preservation prep + rollback runbook)

- roster: lead-direct (Architecture + Documentation + Loop Improvement) · rejected: all Agent spawns (single prep slice) · budget: ~40% verify/baseline · ~50% runbook/docs · ~10% reconcile
- [prep] `pnpm check` GREEN baseline — all 6 OS workers dry-run clean; confirmed `PUBLIC_BASE_URL` derives to `https://os.megabyte.space` + AUD `b455c445…`; recorded the pre-flip state for rollback — prod: n/a (dry-run, NO deploy)
- [docs] `docs/ws-11-rollback.md` — the one-way-door runbook: pre-flip baseline, the Context-boundary decision (pin vs derive by a data check — fire-5 saw "no workspaces" ⇒ likely empty ⇒ derive), the wrapper-worker architecture flag (router is upstream → overlay WRAPS it + service-binds), ordered flip steps (Access host = 🔑 Brian-gated), and a rehearsed ROLLBACK (config revert + re-attach homepage + Access restore + `wrangler rollback` + verify)
- [decision] did NOT pin `context.sharingDomain` this fire — the correct value depends on whether Context data exists (Slice-4 check); documented the criterion rather than staging a guess
- journey: none (prep fire) · long-trail: unchanged · explorer: none · beautify: none
- upstream: pin 6478a144 (UNCHANGED)
- backlog: WS-11 Slice 3 ticked; remaining Slice 2 (/admin brand — Brian OTP) + Slice 4 (flip — Access host Brian-gated) + Slice 5 (reconcile)
- loop-improvement: the rollback runbook itself — rollback-first culture for the one-way-door, so the flip is reversible BEFORE it is attempted
- attrition: none
- NOTE: NO deploy this fire (validate-only). The flip is Slice 4.

## fire-9 — 2026-10-01 — fire-9-run (WS-7: no-store hardening — deploys live without a manual purge)

- roster: lead-direct (Loop Improvement + Performance/Security) · rejected: all Agent spawns (single bounded slice; WS-11 remaining slices Brian-gated → pivoted to autonomous WS-7 hardening) · budget: ~50% hardening · ~40% verify · ~10% reconcile
- [hardening] `packages/home` worker stamps `Cache-Control: no-store` on every response (index.html shell + /health + /api/analytics/live + /login 302). The CF edge otherwise HTTP-cached the shell and served STALE security headers for minutes post-deploy (the fire-4 incident needing a manual purge). Hashed `/assets/*` bypass the worker (run_worker_first) and keep their long cache → LCP unaffected — 8327fd1c — prod: deployed 63cccb2e + one-time purge to clear the legacy entry; causal probe proves the worker runs PER request (today 119→122, no stale-cache bypass)
- [guard] verify-prod assertion #7 now also requires `cache-control: no-store` on the apex so the stale-header class can't regress — 8327fd1c; verify-prod 8/8 + verify-browser 4/4
- journey: causal analytics probe (worker-runs-per-request) + 8/8 + 4/4
- long-trail: unchanged · explorer: none · beautify: home.hero re-verified 4/4 (8.5 holds)
- upstream: pin 6478a144 (UNCHANGED)
- backlog: WS-7 deploy-pairs-purge ticked (no-store chosen over a deploy-script purge — no API dependency, structurally correct)
- loop-improvement: no-store retires the recurring manual-purge step (done ~5× across fires) AND the stale-header incident class permanently; guarded in verify-prod
- attrition: none

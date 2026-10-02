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

## fire-10 — 2026-10-01 — fire-10-run (WS-1 perf: three.js off the LCP critical path)

- roster: lead-direct (Performance + Feature Delivery) · rejected: all Agent spawns (single surgical slice; WS-11 remaining Brian-gated) · budget: ~50% perf · ~40% verify · ~10% reconcile
- [perf] apex WebGL field LAZY-LOADED — `App.tsx` dynamic `import("./webgl")` inside the hero effect (was a static import pulling three.js into the shell). three.js (468KB / 117KB gz) is now an on-demand chunk, NOT a modulepreload (index.html: 1→0 modulepreloads); critical-path JS ~190→73KB gz. Hero text (the LCP element) paints first; the field fades in after mount — 7844531c — prod: deployed 5e5c18a3, verify-prod 8/8 + verify-browser 4/4 (hero still paints 304KB — no regression)
- [validated] this deploy was LIVE WITHOUT a manual purge — confirms fire-9's `no-store` fix in practice (first deploy since, needed no purge)
- journey: deploy → verify (8/8 + 4/4), no long golden-path this fire
- long-trail: unchanged · explorer: none · beautify: home.hero re-verified 4/4 (8.5 holds; LCP now lighter)
- upstream: pin 6478a144 (UNCHANGED)
- backlog: WS-1 three.js-perf ticked; feeds the WebGPU-ladder next-wave item
- loop-improvement: lighter LCP path is a standing perf win on the signature surface; the lazy-chunk pattern is the base for the WebGPU→WebGL2→static fallback ladder
- attrition: none

## fire-11 — 2026-10-01 — fire-11-run (gate: stale-copy — retired-stack words can't ship)

- roster: lead-direct (Loop Improvement / Dead-Code-Hygiene) · rejected: all Agent spawns (single bounded gate; WS-11 remaining Brian-gated) · budget: 100% gate-hardening (a loop-improvement fire)
- [gate] `scripts/check-stale-copy.mjs` — scans apex source for a HIGH-signal DENY list (`authentik` dead IdP from fire-3 · `lorem ipsum` · `coming soon`), reports file:line + why, exits 1 on a hit. WIRED into `packages/home` build (`build` = `vite build && node ../../scripts/check-stale-copy.mjs`; `deploy` = `pnpm build && wrangler deploy`) so a stale term FAILS the build → aborts the deploy — 6da433dd — prod: n/a (build-time gate; `pnpm build` verified exit 0 + gate clean)
- [verify] self-tested RED (injected "Authentik … coming soon"/"lorem ipsum" → caught with file:line, exit 1) + GREEN (clean, exit 0); source-only scan avoids minified-vendor false-positives breaking the build
- journey: none (gate fire) · long-trail: unchanged · explorer: none · beautify: none
- upstream: pin 6478a144 (UNCHANGED)
- backlog: WS-1 stale-copy-gate ticked
- loop-improvement: THE fire — a durable build gate closing the fire-3 "Authentik SSO shipped live" incident class (render-clean regressions no console/axe/screenshot catches); extensible DENY per drift-detection
- attrition: none
- NOTE: NO deploy (build-time gate). Autonomous next-wave hardening queue now essentially cleared; remaining frontier is Brian-gated (WS-11 Slices 2/4) or fresh-session-substantial (WS-2 absorption, WebGPU ladder).

## fire-12 — 2026-10-01 — fire-12-run (a11y: reduced-motion Hard Gate now tested)

- roster: lead-direct (Accessibility + Testing) · rejected: all Agent spawns (single coverage slice) · budget: 100% a11y test-coverage
- [a11y] `verify-browser.mjs` now asserts the prefers-reduced-motion static fallback: emulates `reducedMotion:reduce`, loads the apex, asserts branded content + 0 OUR console errors. The reduced-motion Hard Gate (`mountHeroField` returns early → the static gradient carries the hero; webgl.ts:63 + 2 index.css blocks) was IMPLEMENTED but had ZERO automated coverage — the fire-10 lazy-load could have silently broken it — aeb78056 — prod: verify-browser 5/5 (reduced-motion branded=true, 0 OUR errors — fallback clean live)
- journey: reduced-motion real-browser verification · long-trail: unchanged · explorer: none · beautify: none
- upstream: pin 6478a144 (UNCHANGED)
- backlog: no new tick (the reduced-motion behaviour was already shipped; this adds its missing TEST) — LEDGER-recorded
- loop-improvement: THE fire — a11y Hard Gate (reduced-motion) now regression-locked in verify-browser (was implemented-but-untested)
- attrition: none
- NOTE: autonomous bounded queue genuinely EXHAUSTED (even the a11y gate I checked was already implemented — only its test was missing). Remaining bounded candidates (security.txt/llms.txt, PostHog, SEO polish) + substantial WS-2 best in a FRESH session; WS-11 Slices 2/4 Brian-gated. 12 verified fires this session.

## fire-13 — 2026-10-01 — fire-13-run (WS-9 seed: AI-search + trust files; handoff CANCELLED)

- roster: lead-direct (Documentation/SEO + Growth-seed) · rejected: all Agent spawns (single bounded slice) · budget: 100% site-mode/AI-search
- [correction] fire-12's deliberate handoff was PREMATURE — no HARD-STOP signal (no autocompact thrash / "prompt too long" / can't-spawn; token budget healthy). Bounded serial `/loop` passes that each close a slice are HEALTHY (`monitor-orchestration` healthy-pattern #10); over-checkpointing when continuous operation is wanted is shortcoming #13. The re-fire was the corrective signal → reclaimed the released-handoff lease, removed progress.md, KEPT THE LOOP RUNNING in-session. (One of the "security.txt/llms.txt" candidates I'd listed as fresh-session work was in fact a fine in-session slice.)
- [feature] apex AI-search + trust files: `llms.txt` (accurate product description for AI crawlers — the AI-search/GEO foundation for WS-9) + `humans.txt` + `<link rel="author">` in the head — 188d3932 — prod: deployed b12a4336, both 200 text/plain live, verify-prod 8/8
- [look-before-add] `security.txt` FOUND already served (CF zone-managed, 3 contacts: hey@/brian@/blzalewski@) — my duplicate would have been shadowed drift; REMOVED it. Verification caught it (live had contacts I never wrote — the display-vs-store instinct applied to a static file).
- journey: deploy → live-curl each file (200 + text/plain + content) + verify-prod 8/8
- long-trail: unchanged · explorer: none · beautify: none
- upstream: pin 6478a144 (UNCHANGED)
- backlog: WS-9 AI-search foundation SEEDED (llms.txt); the full engine (GSC/Bing/X/Bluesky) still needs the Chrome-authority credential sweep
- loop-improvement: healthy-iteration discipline reasserted — don't over-handoff without a real HARD-STOP; bounded serial fires ARE the design (cron + watchdog are for genuine saturation, not depth-caution)
- attrition: none

## fire-14 — 2026-10-01 — fire-14-run (Observatory: build-in-public /status page)

- roster: lead-direct (Feature Delivery + UX/Visual + Golden-Path) · rejected: all Agent spawns (single feature slice) · budget: ~55% feature · ~35% real-browser verify + screenshot · ~10% reconcile
- [feature] build-in-public `/status` page (Loop Observatory seed — Brian idea-slate #3 + #10): `StatusView.tsx` renders live DO telemetry from `/api/analytics/live` (pageviews served + today) + workers-on-edge + human-in-loop in black/cyan cards; fail-soft ("telemetry offline" if the endpoint is down) + reduced-motion-safe pulse + 30s auto-refresh (no manual button, per real-time-data rule). Routed in main.tsx by pathname (no heavy SPA router for 2 surfaces) — 16c0de4c — prod: deployed f7d405d4; real-browser 8.5/10 — live 181 served / 57 today (display-vs-store reconciled: the DO grew 122→181 across the session, the page reflects it); apex unaffected (verify-prod 8/8 + verify-browser 5/5)
- [blocked-probe] PostHog client analytics NOT wired — only the SERVER `POSTHOG_API_KEY` exists, not the public `phc_` client key (`VITE_POSTHOG_KEY` absent). Queued as a credential-dependent next-wave item.
- journey: real-browser /status (load → console → screenshot → vision 8.5 → data-reconcile) + apex regression check · long-trail: unchanged · explorer: none
- beautify: home.status CREATED 8.5/10 (matrix row added) · apex hero re-verified 5/5
- upstream: pin 6478a144 (UNCHANGED)
- backlog: idea #3/#10 (Loop Observatory / estate pulse) SEEDED as `/status`; +next-wave (PostHog client key · /status sparkline + last-deploy build-define)
- loop-improvement: the DO analytics are now PUBLICLY LEGIBLE (a live display-vs-store reconcile surface, not just an endpoint) — "make autonomy legible" per the constitution
- attrition: none

## fire-15 — 2026-10-01 — fire-15-run (SEO: sitemap auto-freshness; config-protection respected)

- roster: lead-direct (SEO/Hygiene + Loop Improvement) · rejected: all Agent spawns (single bounded slice) · budget: ~60% feature · ~30% verify · ~10% reconcile
- [seo] `sitemap.xml` now GENERATED with a fresh lastmod every build (`scripts/gen-sitemap.mjs`, wired into `packages/home` build after vite) — the hand-maintained `public/sitemap.xml` had gone STALE (lastmod 2026-09-29 while the apex shipped ~15× since; a stale lastmod tells crawlers "don't re-crawl"). Removed the source file; it's now a derived artifact (drift-detection § build-artifact drift guards) — fd076106 — prod: deployed 793c9e87, live /sitemap.xml lastmod 2026-10-02 (fresh), verify-prod 8/8, deploy instant (no purge — no-store)
- [config-protection] first attempt wired a build-time timestamp via vite.config `define` for a /status "last deploy" card — BLOCKED by the config-protection hook (build configs aren't for silent agent edits). Respected it: reverted vite.config, pivoted to the sitemap slice (no protected-config touch). Lesson: when a config guard fires, fix via code/scripts, not the config.
- journey: build (gen-sitemap in chain) → deploy → live sitemap lastmod assert + verify-prod 8/8 · long-trail: unchanged · explorer: none · beautify: none
- upstream: pin 6478a144 (UNCHANGED)
- backlog: sitemap-freshness closed; the /status last-deploy card deferred (needs a non-vite.config build-time source)
- loop-improvement: generated-artifact-freshness — the sitemap can never go stale again (regenerated each build)
- attrition: none
- NOTE: clean bounded autonomous PUBLIC-surface work is genuinely thinning (config-guard hit on a minor feature; slices shrinking). The high-value frontier is now WS-11-gated (the mission unlock — operator surfaces need the gated OS at the apex) or substantial-risky (WebGPU hero). Evidence-based, not depth-caution.

## fire-16 — 2026-10-01 — fire-16-run (a11y: WCAG 2.2 AA found+fixed + axe gate)

- roster: lead-direct (Accessibility + Loop Improvement) · rejected: all Agent spawns (single a11y slice) · budget: ~40% find+fix · ~40% gate wiring + verify · ~20% reconcile
- [a11y] axe-core (WCAG 2.2 AA) FOUND real violations on first run — apex footer `text-white/45` contrast 4.46 (<4.5); /status `text-white/40` contrast 3.75 + a source link not distinguishable without colour. FIXED all: apex footer /45→/60, /status metas /40→/60, source link → cyan + underline. Both surfaces now 0 axe violations (apex + /status re-probed clean) — 324e827c — prod: deployed c32be916, verify-prod 8/8 + verify-browser 6/6 (axe clean)
- [gate] added `@axe-core/playwright` (root devDep) + wired an axe assertion into verify-browser (0 critical/serious = fail). Runs in its OWN fresh context (the main page's accumulated screenshot/locator state makes axe's injector throw "use newContext"). The a11y Hard Gate had ZERO automated coverage before — it bit immediately (3 real live AA failures).
- journey: axe probe → find → fix → deploy → re-probe both surfaces clean + verify-browser 6/6 · long-trail: unchanged · explorer: none
- beautify: apex + /status a11y upgraded (contrast → AA); matrix scores unchanged (visuals unchanged, a11y improved)
- upstream: pin 6478a144 (UNCHANGED)
- backlog: axe automated coverage added (idea #20 WCAG-manual-pass partially advanced — axe covers the auto-testable subset); /status could join verify-browser's axe scan next
- loop-improvement: THE fire — the axe-core gate automates a Hard Gate that had no coverage, and it caught 3 real live AA failures on its first run. This is NOT marginal — the thinning-queue note above was premature; a real high-value slice existed.
- attrition: none

## fire-17 — 2026-10-01 — fire-17-run (perf: CWV measurement coverage + soft-gate)

- roster: lead-direct (Performance + Loop Improvement) · rejected: all Agent spawns (single measurement/gate slice) · budget: ~50% probe/measure · ~30% gate script · ~20% reconcile
- [perf] added `scripts/verify-cwv.mjs` — throttled (3G + 4× CPU) LCP/CLS/FCP/TTFB measurement + regression soft-gate (LCP PASS ≤2000 / WARN ≤2500 / FAIL >2500; soft so cold-start variance can't flap deploys, but a real "poor" regression exits 1). CWV was a Hard Gate with ZERO automated coverage — 7c8f8cce — prod: apex LCP ~1570-1640ms PASS (3 warm runs), CLS 0.003 PASS, FCP ~960-1024ms
- [finding→corrected] the FIRST probe showed LCP 2208ms (FAIL) — but that was a COLD-START outlier (TTFB 628ms vs warm ~90ms); 3 warm runs confirm LCP ~1570-1640ms PASS. The three.js-off-LCP lazy-load (fire-10) + the lean 73KB shell pay off — the apex CWV is genuinely healthy. The initial "LCP fails, needs SSG" read was cold-start variance, corrected by re-measuring.
- journey: throttled CWV probe → cold outlier → re-measured 3× warm → confirmed PASS → wrote the gate · long-trail: unchanged · explorer: none · beautify: none
- upstream: pin 6478a144 (UNCHANGED)
- backlog: CWV now measured; +1 light next-wave (SSG to tighten cold-start consistency — LOW priority, warm passes, vite.config is config-protected)
- loop-improvement: CWV measurement coverage; the soft-gate catches a real perf regression without flapping on cold-start variance
- attrition: none
- lesson (meta): RE-MEASURE before concluding a perf FAIL — single cold-start samples are noisy (TTFB 628 vs 90). Complements fire-16's "probe the gate before concluding marginal."

## fire-18 — 2026-10-01 — fire-18-run (SEO: strict gate + meta-desc fix)

- roster: lead-direct (SEO + Loop Improvement) · rejected: all Agent spawns (single SEO slice) · budget: ~40% probe/fix · ~40% gate · ~20% reconcile
- [seo] SEO-strict probe FOUND: apex meta description 162 chars (>156 max). FIXED → 153 chars (within 120-156). Title (55), canonical, og 1200×630, both JSON-LD blocks valid — all already PASS — d4755b56 — prod: deployed 0b847edf, verify-seo 5/5 hard + verify-prod 8/8
- [gate] added `scripts/verify-seo.mjs` — title 50-60 · meta 120-156 · canonical · og 1200×630 · JSON-LD @context/@type valid (HARD) + exactly-1-H1-in-shell (WARN). SEO strict was a Hard Gate with ZERO automated coverage
- [known-gap] H1-in-shell = 0 (client-rendered React H1 not in the static shell) — WARN, folds into the SSG backlog item (fire-17); non-JS crawlers see no H1 until SSG (Google renders JS, so it does see it)
- journey: SEO probe → find over-length meta → fix → deploy → verify-seo 5/5 + verify-prod 8/8 · long-trail: unchanged · explorer: none · beautify: none
- upstream: pin 6478a144 (UNCHANGED)
- backlog: SEO automated coverage added; H1-in-shell folds into the SSG item
- loop-improvement: SEO-strict gate automates a Hard Gate that had no coverage; caught 1 real over-length meta on first run. The Hard-Gate automation sweep (fires 16-18: axe · CWV · SEO) each found real work — three new durable gates + 4 real fixes.
- attrition: none

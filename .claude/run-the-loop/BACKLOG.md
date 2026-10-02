# BACKLOG — the live queue (frontier)

> The frontier the loop advances: one Next unit per workstream + executable Acceptance.
> Advanced lines get ticked with the closing SHA + prod proof; completed workstreams move to
> § Done. Discovery roles APPEND deduplicated next-wave items every fire (zero-append =
> under-scan). Requirement inputs: `./ULTIMATE-REQUIREMENTS.md` (agent C) +
> `./PROJECTSITES-ABSORPTION.md` (agent B) — consult BOTH before picking absorption slices;
> reference, never recreate.

## Format

- One `### WS-<n> — <name>` block per workstream: **Mission** · **Cadence** · frontier items.
- Frontier item: `- [ ] <slice> — accept: <executable criteria (command + expected output /
  prod URL + assertion)>`. Ticked: `- [x] <slice> (fire-<n>, <sha>, <proof>)`.
- New workstreams append below; discovery drops raw finds into § Next-wave inbox; convergence
  dedupes them into workstreams.

## Workstreams

### WS-1 — Estate path (the priority journey)
- Mission: apex WebGL homepage → `/login` 302 → Access gate → OS shell → absorbed surfaces —
  green + gorgeous + embarrassingly easy, end-to-end, every fire.
- Cadence: every-loop
- [x] Baseline the estate path (fire-4, aae8d822) — verify-prod 8/8 all-green + real-browser apex
  journey (0 OUR console errors, WebGL hero paints 304KB, 6-card features bento, browser-header
  `/login` 302) + service-token OS shell 200 (assertion #4) + screenshots + LEDGER entry. OS-shell
  real-BROWSER walk (not just HTTP) continues under WS-5/long-trail leg-2.

### WS-2 — ProjectSites absorption
- Mission: absorb projectsites.dev capability (Notion-like tables/grids/charts ·
  Airtable-level automation on SQLite/D1/DO · Coinbase-Pro-density dashboards · integrations)
  into the OS UI — minimal, visually-inspected, perfectly-placed, flag-gated, starter-owned
  layers only.
- Cadence: every-loop
- [ ] Pick the FIRST absorption slice from `./PROJECTSITES-ABSORPTION.md` (highest value ×
  lowest overlay risk) — accept: slice live behind a default-OFF flag on
  `os.megabyte.space`, screenshot + vision verdict ≥8/10, display-vs-store reconciled,
  `LEDGER.md` entry with SHA + prod proof.

### WS-3 — Beautify-10x
- Mission: every created/visited surface iteratively more gorgeous; per-surface pass-count +
  vision score tracked in `.claude/modifier-matrix.json`.
- Cadence: every-loop
- [ ] Seed `.claude/modifier-matrix.json` with the estate's surfaces (apex hero · apex
  sections · `/login` funnel · OS shell · Workshop · first absorbed surface) at pass 0 + first
  vision scores — accept: matrix committed with ≥6 scored surfaces + the lowest-scored one
  named as next fire's beautify target.

### WS-4 — Deep UI Explorer bootstrap
- Mission: state-graph coverage of BOTH surfaces with real vision verdicts feeding the matrix
  (standing role 17).
- Cadence: every-loop
- [x] Bootstrap `e2e/deep-ui-explorer/` + LIVE RUN (fire-5, fa51af1f) — `--surface both` walked
  apex ×6 + OS shell via service token (7/7 visited, 0 blocked); coverage-ledger + run manifest
  (provider + session) committed; service-token headers scoped to OS origin (beacon-CORS artifact
  killed). REMAINING: AI Gateway `megabyte-os` schema-validated vision verdict per capture — this
  fire used human-model vision via screenshot Read; the automated `vision-review.mjs` run is owed.

### WS-5 — Long-Trail TDD case 001
- Mission: one checkpointed 60-100-action case ground to completion across fires (standing
  role 16; lease + checkpoint + resource prefix per the `long-trail-tdd` skill).
- Cadence: every-loop
- [ ] Design + start case 001 on the estate path — accept: checkpoint file committed with the
  case design (surfaces · action plan · lease) + ≥20 actions executed with screenshots.

### WS-6 — Upstream Sync
- Mission: the pinned `cloudflare-os` submodule bumped deliberately to reviewed refs; overlay
  rebased clean; never blind bumps or in-tree edits.
- Cadence: every-2-loops (lane 18)
- [ ] Inventory the current pin vs upstream HEAD (delta commits · release notes ·
  deprecations) → decision table (pilot / backlog / watch / reject-with-reason) — accept:
  table in `LEDGER.md`; NO pointer move without `pnpm check` + `pnpm deploy` + all-green in the
  same fire.

### WS-7 — Loop hardening
- Mission: the loop improves itself every fire (≥1 improvement, role 15).
- Cadence: every-loop
- [x] Port the fire-lock script (fire-4, ff2144af) — `scripts/loop-fire-lock.mjs`
  (claim/heartbeat/release + exit 3 coalesce) committed; command §0 prefers it; 7/7 `node:test`
  incl. the stale-lease reclaim case. Used live to claim this fire's lease.
- [x] Auto-clear watchdog LIVE + PROVEN + hardened (fire-4 armed; fire-21 verified + hardened) —
  `watchdog.log` records REAL trigger→launch cycles on BOTH triggers: stale-heartbeat (22:07Z →
  pid 71197) AND released-handoff (00:57Z, from fire-12's handoff → pid 68198); `runs=53`, last
  exit 0; single-flight + 30-min backoff observed in-log. Hardened fire-21 (49956efb) with a 25-min
  `timeout` on the launched `claude -p` after finding a 57-min idle orphaned zombie. Acceptance met.

### WS-8 — Better Auth migration (Brian 2026-10-01: Better Auth = app identity; Access stays as thin edge gate)
- Mission: Better Auth (D1-backed, starter-owned) becomes THE human identity layer — **Google
  SSO + GitHub SSO + email magic link from the beginning** — with a gorgeous black/cyan login
  (Kumo primitives + Megabyte theme). Cloudflare Access REMAINS as a thin outer edge gate
  (service tokens + WARP zero-touch); the stock Access page must never be the human-facing
  experience. Edge-gate relaxation mechanics = slice-design work with ADR + rollback runbook;
  no Access policy change ships before the dual-accept window is proven.
- Cadence: every-loop until converged
- 🔓 No longer Brian-gated (credential-autonomy answer, 2026-10-01 round 3): the loop
  self-provisions the Google OAuth client (console.cloud.google.com/apis/credentials) +
  GitHub OAuth app (github.com/settings/developers) via Brian's signed-in Chrome, callbacks
  `https://megabyte.space/auth/callback/{google,github}`, receipts in LEDGER, secrets into
  get-secret. BitWarden extension available for fills.
- [ ] Slice 1 — Better Auth v0 dark: D1 schema + magic-link flow + session cookie from a
  starter-owned worker path, Google+GitHub provider config stubbed awaiting 🔑 creds — accept:
  unit+integration green; `/auth/*` behind a default-OFF flag; zero change to the Access gate
- [ ] Slice 2 — own the /login surface: apex `/login` renders OUR black/cyan login (Kumo+theme,
  three provider buttons + magic-link field; flag-gated dark-launch beside the Access 302) —
  accept: screenshot + vision ≥9/10; reduced-motion + axe clean; flag off ⇒ 302 byte-identical
- [ ] Slice 3 — session gate in the router worker (`megabyte-os`): validate Better Auth session
  OR Access JWT (dual-accept window) — accept: service-token E2E + real-session E2E both green
- [ ] Slice 4 — E2E credential equivalent for automation alongside the kept Access service
  token — accept: long-trail OS legs authenticate headlessly via the new mechanism
- [ ] Slice 5 — CUTOVER: Better Auth becomes the sole HUMAN path (edge gate made transparent
  for browser traffic per the ADR'd mechanism; Access service-token/WARP paths intact) —
  accept: verify-prod rewritten for the new topology all-green; rollback rehearsed; stock
  Access page unreachable by humans

### WS-9 — Growth engine: SEO + social (Brian 2026-10-01 round 3: full engine; auto-publish build-in-public)
- Mission: automated SEO (on-property technical + fact-checked content, GSC/Bing wired,
  rank + GEO tracking) and build-in-public social (auto-publish X + Bluesky on ships;
  LinkedIn/Reddit drafts; replies never automated). Off-site outreach = drafts only.
- Cadence: every-loop once seeded
- [ ] Slice 1 — credential sweep via Chrome authority: GSC + Bing Webmaster for megabyte.space,
  X + Bluesky API apps — accept: receipts in LEDGER; secrets in get-secret; zero plaintext
- [ ] Slice 2 — apex content surface: `/blog` (SSG, Kumo-coherent black/cyan, JSON-LD, RSS,
  llms.txt) + first 2 fact-checked build-in-public posts — accept: deployed, indexed request
  filed in GSC, verify-prod extended
- [ ] Slice 3 — ship→social pipeline: LEDGER ship events auto-compose X + Bluesky posts
  (screenshot + brand-voice copy) with a drafts inbox for LinkedIn — accept: one real
  auto-published post per surface with receipt; kill-flag default-ON for the auto-publisher
- [ ] Slice 4 — rank/GEO tracker: daily keyword + AI-search-presence snapshots into D1,
  card in the Loop Observatory — accept: display-vs-store reconciled

### WS-10 — Commerce: digital products (Brian 2026-10-01 round 3: Etsy + Gumroad, zero-fulfillment)
- Mission: a real digital-products shop operated by the loop — WebGL art prints/wallpapers,
  site/Notion templates, design packs. Loop owns listings, pricing tests, shop SEO, support
  DRAFTS; payout/banking wiring stays draft-only; payments per payments doctrine.
- Cadence: weekly lane until the shop is live, then every-loop ops
- [ ] Slice 1 — product catalog v0: generate + curate 5 sellable digital goods from the estate
  (4K/8K renders of the hero field as wallpaper packs, template bundles) with honest
  descriptions — accept: files in R2, catalog doc committed, Brian-visible preview page
- [ ] Slice 2 — storefront bootstrap via Chrome authority: Etsy shop + Gumroad account
  provisioned (listing fees are authorized operating spend; payout/bank wiring left as a
  draft with exact deeplinks) — accept: receipts; shop exists with 1 draft listing
- [ ] Slice 3 — first 3 live listings with loop-written SEO titles/tags/photos — accept:
  listings live; links tracked; support-draft inbox wired
- [ ] Slice 4 — ops loop: weekly pricing/keyword experiment + sales/visit stats into the
  Observatory — accept: one completed experiment with before/after data

### WS-11 — OS at the apex + homepage as a first-view COMPONENT (Brian 2026-10-01/02 — overrides public-front-door for THIS estate)
- Mission: `megabyte.space` SERVES the OS. The WebGL homepage becomes a **COMPONENT INSIDE the OS
  frontend** (a FORK we own = the base UI), shown as the FIRST thing after auth, dismissible via
  "Enter the OS" + persisted once (`hasSeenLandingHomepage`). **REFINED Brian 2026-10-02 (fire-25):**
  "bundled as a component that shows up as the first thing you see in the CloudFlare OS fork that
  will be the base of the UI, unless AI deems otherwise" — this SUPERSEDES the earlier wrapper-worker
  overlay; the homepage lives in the forked `cloudflare-os/packages/workshop-frontend`, not a worker
  in front. Full executable plan + the confirmed integration seam (`__root.tsx:126-185`
  `AuthenticatedShell`, gate before the onboarding check) = Steps 1-6 below + `docs/ws-11-rollback.md` (progress.md retired fire-28 as redundant with this block). `os.megabyte.space`
  → legacy 301→apex. Access stays the edge gate (→ WS-8). Canonical-answer-#2 (pinned core) is
  deliberately reversed for the FRONTEND (fork), with upstream rebased deliberately per lane §1.18.
- ⚠️ Executes in a FRESH full-budget session (large one-way-door; fire-25 captured the plan at depth).
- Cadence: PRIORITY — the immediate next fire(s). Best run in a FRESH full-budget session
  (one-way-door infra; `delegate-when-saturated` — don't start this large pass context-saturated).
- GOTCHAS (from `docs/customization.md`, confirmed fire-6):
  - (a) changing the router `customDomain` DETACHES `megabyte-home` from the apex (CLAUDE.md § Gotchas) — plan megabyte-home's fate (fold its WebGL into the overlay worker) BEFORE the flip.
  - (b) the self-hosted Access app must cover `megabyte.space` (added/!new hostname; AUD may change) — **canonical-answer #4 PAUSE: Access host change is the one genuinely gated step.**
  - (c) `publicBaseUrl` derives from `customDomain`; pin `context.sharingDomain: "https://os.megabyte.space"` BEFORE the flip so existing Context data isn't hidden, and re-verify OAuth redirect URIs (both read the origin).
  - (d) the router serves the OS frontend (UPSTREAM/submodule) — the overlay MUST be a wrapper worker (service binding to the router) or an HTML-rewrite in front; respect the submodule boundary.
  - (e) quick partial brand win: `/admin` General tab sets name→"Megabyte OS" + accent→`#00E5FF` + logo (runtime, no deploy) — but needs an authenticated ADMIN session (Access OTP), not the service token.
- [x] Slice 1 — first-run overlay BEHAVIOUR shipped (fire-7, 39fa9579) — built into `packages/home`
  (the apex worker today), flag `VITE_FIRST_RUN_OVERLAY` default-OFF so the live apex is
  byte-identical; "Enter the OS" persists `localStorage.megabyteOS_entered`; a return visitor
  auto-skips to the OS entry via a redirect splash (only on "/", never intercepts the OS entry).
  TDD 3/3 real-browser (`e2e/first-run-overlay/verify.mjs`, RED 1/3 → GREEN 3/3); deployed DARK
  (verify-prod 8/8 + verify-browser 4/4). REMAINING for the flip: the "reveal/proxy the OS at the
  SAME apex" wiring (vs today's `/login`→os. redirect) + wrapper-worker packaging land in Slice 4.
- [ ] Slice 2 — `/admin` brand pass (partial fire-5 off-brand fix) — accept: name "Megabyte OS" + accent `#00E5FF` + logo set via an authenticated admin session; screenshot shows cyan accent live. (Needs Brian's OTP or a documented admin-automation path.)
- [x] Slice 3 — origin-preservation pre-flip (fire-8) — `pnpm check` GREEN baseline recorded (6 OS
  workers dry-run clean; `PUBLIC_BASE_URL` derives to `https://os.megabyte.space`, AUD captured);
  `publicBaseUrl` + Context-boundary behaviour verified; **rollback runbook written**
  (`docs/ws-11-rollback.md`: flip steps, Context-boundary decision, wrapper-worker architecture flag,
  rehearsed rollback). NOTE: `context.sharingDomain` deliberately NOT pinned yet — the right value
  depends on whether Context data exists (a Slice-4 check: empty ⇒ derive, non-empty ⇒ pin); criterion
  documented instead of staging a guess.
- [ ] Slice 4 — DOMAIN FLIP (one-way-door, deliberate) — accept: detach megabyte-home from apex → point the `megabyte-os` router `customDomain` to `megabyte.space` → Access app covers the apex → `pnpm deploy` → `verify-prod` rewritten for the new topology all-green; `os.megabyte.space` 301→apex; real-browser: anonymous → Access → first-run overlay once → OS; rollback rehearsed.
- [ ] Slice 5 — reconcile `verify-prod` + `CLAUDE.md` + `public-front-door` to the shipped topology — accept: docs match live; verify-prod asserts apex = OS + first-run overlay.
**COMPONENT-IN-FORK EXECUTION (fire-25 REFINED plan — supersedes wrapper-worker Slices 1-5 above):**
- [x] Step 1 — fork adopted as editable UI base (fire-26/27, e7c76418) — submodule -> `heymegabyte/cloudflare-os` (fork), `.gitmodules` repointed + `branch=megabyte-os` (fire-27 completed the `.gitmodules` half fire-26 left), gitlink `6478a144`->`7358a9d8`. Canonical-answer-#2 reversal for the FRONTEND, recorded here + LEDGER + `docs/ws-11-rollback.md`.
- [x] Steps 2-3 — `LandingHomepage.tsx` + `landing-webgl.ts` (WebGL hero port, lazy 461K chunk) wired into `__root.tsx` `AuthenticatedShell` before the onboarding check, gated once via `localStorage.megabyteOS_entered` (broken-storage defaults to skip). In the fork @7358a9d8.
- [x] Step 4 — BUILD + DEPLOY + VERIFY on os.megabyte.space (fire-27, e7c76418) — `pnpm check`+`pnpm deploy` (router `f07ffcb4`, backend `0e6ad6cb`); real-browser `scripts/verify-os-landing.mjs` PASS (splash renders h1 "The operating system for one human and a fleet of agents." -> Enter dismisses -> persists on reload, 0 console errors); `verify-prod` 8/8 (apex untouched). Does NOT touch apex/Access.
- [ ] Step 5 — KEY BRIAN-GATED (canonical-answer #4, one-way-door): apex DOMAIN MOVE — detach `megabyte-home` -> point `megabyte-os` router `customDomain`->`megabyte.space` -> add `megabyte.space` to the Access app (Brian) -> pin `context.sharingDomain` -> `pnpm deploy` -> `os.`->301 apex. Runbook: `docs/ws-11-rollback.md`. PAUSED until Brian does the Access host add.
- [ ] Step 6 — post-flip reconcile `verify-prod` + `CLAUDE.md` + `public-front-door` to the apex-is-OS topology; retire/port `packages/home`.


## Next-wave inbox (discovery appends here; convergence dedupes into workstreams)

> fire-1 (2026-09-30, aborted on session limit; Brian canceled loops) — Product Discovery + Security
> ran read-only and returned; the 6 mutating agents died at `subagent_tokens: 0` before committing.
> Items below are READY for whenever the loop re-arms.

- [ ] Provision `studio` D1 on a starter-owned worker with schema-introspection endpoints — ws: NEW-database-studio — accept: `GET /api/studio/schema` on prod returns `{tables:[{name,columns:[…]}]}`; binding in starter config, never the submodule (ULTIMATE §Data-UX 15/19)
- [ ] Flag-gated Tables-mode grid MVP (default-OFF `database_studio` flag) — ws: NEW-database-studio — accept: paginated sortable grid of one `studio` table, 0 console errors, vision ≥8/10 (ULTIMATE §Data-UX 16/17/52)
- [ ] Display-vs-store reconcile harness for the grid — ws: NEW-database-studio — accept: `e2e/studio-verify/reconcile.mjs` diffs `SELECT COUNT(*)` vs rendered rows, flags LYING-EMPTY/WRONG-SOURCE (ULTIMATE §Quality 74)
- [ ] Starter-owned analytics ingestion (absorption #1) — ws: NEW-analytics — accept: Analytics Engine/D1 `visitor_events` captures apex pageviews; `GET /api/analytics/live` returns real reconciled count (ULTIMATE §Dashboards 45)
- [ ] Web Vitals beacon + p50/p75 card from stored events — ws: NEW-analytics — accept: card matches a synthetic Playwright pageview (ULTIMATE §Quality 77)
- [ ] Cloudflare Flagship foundation, starter-owned (absorption #4) — ws: NEW-feature-flags — accept: `[[flagship]]` binding + OpenFeature provider; `database_studio` + `analytics_live` flags default-OFF; server 404 when off
- [ ] WebGPU probe + fallback chain on the apex hero (WebGPU→WebGL2→Canvas→reduced-motion) — ws: WS-1 — accept: each forced path renders settled hero, 0 console errors (ULTIMATE §WebGL 53-55)
- [ ] View Transitions between apex sections — ws: WS-1 — accept: `@view-transition{navigation:auto}`; input never blocked; reduced-motion disables (ULTIMATE §WebGL 61)
- [ ] Execution-ladder resolver stub `chooseRuntime(task)` T0→T5 — ws: NEW-execution-ladder — accept: Zod-validated I/O + "never wake Sandbox when T1 suffices" unit tests (ULTIMATE §Platform 7, zero coverage today)
- [ ] CF Browser Rendering provider for the explorer (replace local-chromium fallback) — ws: WS-4 — accept: provider recorded truthfully via BR REST `/screenshot`; local fallback LABELED (ULTIMATE §Quality 75)
- [ ] Immutable-release pointer model spike (workspace→revision→build→release) — ws: NEW-releases — accept: typed starter module + rollback-to-prior-release unit test (ULTIMATE §Platform 5/21, zero coverage)
- [ ] Global permission-filtered Cmd+K palette seed on the OS — ws: NEW-command-palette — accept: typed results across ≥2 resource types, keyboard-first, axe 0 (ULTIMATE §Data-UX 26/27)
- [x] SECURITY HIGH: CSP absent on apex homepage (fire-4, ebadf39a+aae8d822) — CSP live + exact on every response (verify-prod #7 green); corrected for CF edge reality (CF Fonts same-origin `font-src 'self'`; CF Web Analytics beacon `script-src https://static.cloudflareinsights.com` + `connect-src https://cloudflareinsights.com`). Real-browser: 31→0 OUR console errors. 1 residual = CF challenge-platform inline (see next-wave).
- [ ] SECURITY MED: submodule pin `6478a144` tracks upstream feature branch `bonk/add-workflow-file` — ws: WS-6 — accept: repin to a reviewed upstream release tag via lane §1.18 (check+deploy+all-green same fire)
- [x] SECURITY LOW: COOP/CORP + Permissions-Policy actually served (fire-4, ebadf39a) — verify-prod #7 asserts `coop=same-origin corp=same-origin pp=present` live; the run_worker_first fix is what made them reach real browsers.

> fire-3 (2026-10-01 ~15:45Z, classifier-outage session) appends — WS-4 bootstrap AUTHORED
> (explorer.mjs + vision-review.mjs + coverage-ledger 9 states seeded; apex walked live via
> MCP fallback provider, OS leg blocked on service-token context); case-001 → 22 actions total
> (leg-1 nearly done); Authentik copy drift fixed in App.tsx; command §0 Write-fallback lease
> doctrine added. ALL commits/deploy still blocked on the Bash classifier — ship pipeline lives
> in progress.md. Items already covered above; no new dedupe-escaping finds this fire except:

- [ ] Explorer first LIVE run — ws: WS-4 — accept: `node e2e/deep-ui-explorer/explorer.mjs --surface apex` writes a run manifest + refreshes the ledger; `vision-review.mjs --run <dir>` returns ≥1 schema-valid verdict via AI Gateway `megabyte-os`
- [x] Stale-copy sweep gate (fire-11, 6da433dd) — `scripts/check-stale-copy.mjs` scans apex source
  for a HIGH-signal DENY list (`authentik` dead IdP · `lorem ipsum` · `coming soon`), reports
  file:line + why, exits 1 on a hit. WIRED into `packages/home` build (`build` = vite + gate;
  `deploy` = `pnpm build && wrangler deploy`) so a stale term fails the build → aborts the deploy.
  Self-tested RED (catches injected terms) + GREEN (clean). Source-only = no minified-vendor
  false-positives. Extend DENY when a stack element retires.

> fire-2 (2026-10-01) appends — deduped vs the list above:

- [ ] Hover-lift regression guard — ws: WS-1 — accept: E2E computed-style probe asserts `.card:hover` transform ≠ none on a revealed card (the `.reveal.is-in` specificity-tie class; fixed fire-2 via `translate`, guard the class)
- [ ] Real-404 status for unknown apex paths (soft-404 class, case-001 action 45) — ws: WS-1 — accept: `curl -s -o /dev/null -w '%{http_code}' https://megabyte.space/this-page-does-not-exist` → 404 while the styled shell still renders; known-route SSOT shared worker↔validator
- ~~Access login-page branding~~ — SUPERSEDED 2026-10-01 by Brian's auth directive ("Don't use Access for SSO — use Better Auth"): the stock Access page gets REPLACED, not branded. See WS-8.

> fire-4 (2026-10-01, classifier recovered — shipped the fire-2+fire-3 debt) appends:

- [ ] Apex pixel-zero console: 1 residual error = CF challenge-platform inline bootstrap
  (`window.__CF$cv$params`) — per-request ray ⇒ unstable hash (un-pinnable), 'unsafe-inline' refused.
  — ws: WS-1 — accept: a scoped Cloudflare Configuration Rule disables JS Detections / Rocket Loader
  on `megabyte.space/` ONLY (keep bot protection on the Access-gated os subdomain); real browser → 0
  console errors incl. upstream. 🔑 Brian-gated (zone security setting) — ship the Rule draft + exact
  dash deeplink, don't auto-toggle.
- [x] Deploy-pairs-purge RETIRED via `Cache-Control: no-store` (fire-9, 8327fd1c) — the apex worker
  stamps `no-store` on every response (shell + /health + /api/analytics/live + /login 302); the CF
  edge no longer HTTP-caches the shell, so new deploys (+ security headers) are live INSTANTLY with no
  manual purge. Causal probe proved the worker runs per request (today 119→122). Hashed `/assets/*`
  bypass the worker and keep their long cache → LCP unaffected. verify-prod #7 now guards `no-store`.
- [ ] Wire `scripts/verify-browser.mjs` into the ship gate — fire-4 proved HTTP verify-prod is a
  lying-pass for CSP-breaks-page. — ws: WS-7 — accept: the deploy flow runs verify-browser after
  every apex deploy (0 OUR console errors + painted hero) and CI runs it; `npx playwright install
  chromium` documented as one-time setup.
- [x] Apex perf: three.js off the LCP path (fire-10, 7844531c) — WebGL field lazy-loaded (dynamic
  `import("./webgl")` in the hero effect); three.js (117KB gz) is now an on-demand chunk, NOT a shell
  modulepreload (0 modulepreloads); critical-path JS dropped ~190→73KB gz. Hero still paints
  (verify-browser 4/4). Deploy was live WITHOUT a purge — also validated fire-9's no-store. Feeds the
  WebGPU-ladder item next.

> fire-5 (2026-10-01, Deep-UI-Explorer first OS-shell inspection) appends:

- [ ] **OS shell BLACK/CYAN theme** (the estate-path brand break — TOP priority) — stock CF OS ships
  light/cream + orange; jarring after the black/cyan apex (os.shell vision 4/10). — ws: WS-2/WS-8 —
  accept: os.megabyte.space shell renders dark `#060610` + cyan `#00E5FF` (sidebar/prompt/cards/
  buttons) via STARTER customization (investigate `docs/customization.md` theming surface + the
  megabyte-os router / custom-gatekeeper HTML path), NEVER the pinned submodule; real-browser
  screenshot vision ≥8; verify-prod extended for the themed shell.
- [ ] OS E2E credential-equivalent (WS-8 slice 4, now a PRIORITY) — service-token auth can't drive
  the OS realtime RPC: browser WebSocket upgrades can't carry Access headers → `wss://…/api` 403.
  — ws: WS-8 — accept: an automation path (service-token→cookie exchange, or the Better-Auth session)
  lets a headless browser reach the OS shell WITH a live RPC socket; explorer os.shell.root → 0 WS-403.
- [ ] Deep-UI-Explorer AI-Gateway vision live run — `vision-review.mjs --run <dir>` returns ≥1
  schema-valid verdict via AI Gateway `megabyte-os` (Workers AI) per capture. — ws: WS-4 — accept:
  per-image provider+model+tokens recorded; scores auto-feed `.claude/modifier-matrix.json`.

> fire-14 (2026-10-01, build-in-public /status page shipped) appends:

- [ ] PostHog client analytics on the apex — observability-doctrine solo tier (PostHog + Workers
  Tracing). — ws: WS-9/observability — accept: `VITE_POSTHOG_KEY` (public `phc_` project key, via the
  connected PostHog MCP/dashboard — NOT the server `POSTHOG_API_KEY`) provisioned to get-secret;
  posthog-js init (US host) + `$pageview` + the Enter-OS CTA capture; verify ingestion via the MCP
  (`$pageview` trend), never a headless browser (bot-filtered).
- [ ] `/status` enrichment — sparkline from stored day-buckets · top paths · a real last-deploy
  timestamp (Vite `define` build constant) · live dot via DO WebSocket/SSE instead of the 30s poll.
  — ws: WS-2/Observatory — accept: each new element display-vs-store reconciled; vision ≥9.

> fire-17 (2026-10-01, CWV measurement added) appends:

- [ ] SSG / pre-render the apex hero (LOW priority — warm LCP already PASSES ~1570-1640ms) — ws: WS-1
  — the apex is a client-only Vite SPA, so cold starts spike LCP (2208ms seen once, TTFB 628). SSG
  (vite-ssg / pre-render the above-fold hero into the HTML shell) would make FCP/LCP cold-start-consistent
  and satisfy the frontend-stack SSR/SSG mandate. — accept: `node scripts/verify-cwv.mjs` LCP ≤2000 on a
  COLD run; vite.config is config-protected → authorize via `/update-config`. Fresh-session + full budget.

> fire-20 (2026-10-01, vision-review fixed 0/7→5/7) appends:

- [ ] vision-review 7/7 + reliability — ws: WS-4 — `llama-3.2-11b-vision` ignores JSON asks (prose
  fallback gets 5/7; 2 honest fails = too little signal) AND is a crude art-director (scored the hero
  5 vs human 8.5). — accept: either a stronger CF vision model OR `response_format: json_schema` (if
  the model supports it) gets ≥6/7 schema-valid; verdicts calibrated enough to feed the matrix as a
  real secondary signal (currently human-model scores stay authoritative).

### Discovery contradictions to resolve (convergence judgment calls)

- ULTIMATE non-goals reject Neon+Redis carryover, but PROJECTSITES-ABSORPTION lists them — mark reject/adapter-only; D1/DO/KV-native only.
- ULTIMATE mandates Kumo as sole OS design system — absorption inventory is Angular/Spartan; every slice re-implements in Kumo/starter idiom, never ports donor code.
- WS-2 says "into the OS UI" but hard reqs keep enhancements starter-owned — analytics/studio MVPs land starter-side (home/router worker), not inside the Access-gated submodule.

## Top-20 idea slate (Brian-requested 2026-10-01 — the candidate pool for the 4 focus streams; convergence promotes into workstreams)

**OS absorption**
1. **Database Studio v0 as an OS surface** — D1 schema browser + Notion-grid on a `studio` D1, starter-owned route surfaced inside the OS experience, flag-gated, display-vs-store reconciled.
2. **Live Estate Analytics card** — the `AnalyticsCounter` DO feeding a Coinbase-density card (today/total, sparkline, top paths) visible from the OS, honest numbers only.
3. **Loop Observatory** — the virtual organization's own dashboard: current fire + lease, last LEDGER entry, beautify-matrix heatmap, latest journey screenshots strip (constitution: make autonomy legible).
4. **Global Cmd+K palette seed** — typed, keyboard-first results across ≥2 resource types in the OS shell, axe-clean.
5. **Automation rule MVP** — Airtable-style trigger→action on D1/DO events (pageview threshold → notification), Zod-typed, flag-gated.

**Apex to 10/10**
6. **WebGPU particle upgrade** — WebGPU→WebGL2→Canvas→static ladder with honest probe + per-tier screenshot proof.
7. **Kinetic hero headline** — per-word stagger on load + scroll-scrub camera path locked to the field.
8. **Bento-asymmetric Features grid** — break the uniform 3×2; hover reveals LIVE previews of real OS surfaces.
9. **View Transitions** — between apex sections AND into the /login surface (document transition into auth).
10. **Estate pulse strip** — real live numbers on the apex (visitors today, last deploy, workers running) from `/api/analytics/live`.
11. **Audio-reactive hero easter egg** — Web Audio, opt-in only, reduced-motion safe, never permission-prompts on load.

**Browser/explorer infra**
12. **CF Browser Rendering provider** — REST `/screenshot` first for the explorer; provider recorded truthfully per run.
13. **Deep UI Explorer v0** — state-graph walker + `coverage-ledger.json` + prev-state diffing on both surfaces.
14. **Vision rubric worker** — one Workers AI endpoint scoring any screenshot against the house rubric (schema-validated verdict), reused by every role; scores feed the matrix.
15. **Long-trail runner hardening** — service-token/Better-Auth browser context + checkpoint/resume so case-001 legs 2-3 run unattended.

**Security / a11y / platform**
16. **Better Auth v0 dark** (WS-8 slice 1) — the directive's first concrete slice.
17. **CSP strict-dynamic + Trusted Types ratchet** on apex + real-404 rewrite with known-route SSOT.
18. **Submodule repin to a reviewed release tag** (clears SECURITY MED, lane §1.18).
19. **Cutover rehearsal + rollback runbook ADR** for Access→Better Auth (the one-way-door documented BEFORE the door).
20. **WCAG 2.2 manual-criteria pass** — the 6 AA criteria axe can't test, both surfaces, fix batch included.

## Done

- (empty)

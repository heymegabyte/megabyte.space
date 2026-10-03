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

## ★ TOP PRIORITY — Brian direction 2026-10-03 (EXECUTE; all secrets present, zero external blockers)
Headline reset: **megabyte.space LOADS the OS**, anonymous preview works, a SEAMLESS Better Auth
(GitHub+Google SSO) prompt fires on any protected action, DeepSeek-default backend. Drive these before
lower workstreams. Secrets verified PRESENT in get-secret: GITHUB_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET,
DEEPSEEK_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY.

- [x] ✅✅ P1 — APEX MOVE DONE + LIVE (fire-64, 57d6e1c4): **megabyte.space now SERVES THE OS** — the
  `megabyte-os` router owns the apex (customDomain os.→megabyte.space; megabyte-home detached to workers.dev
  as the rollback origin; sharingDomain pinned to os. to preserve Context). VERIFIED LIVE: anonymous
  megabyte.space → "Sign in to your workspace" with **Continue with GitHub + Continue with Google** +
  email/password + magic-link (real browser), `/api/auth/ok` 200, `/signin` 200 (NO bot-challenge at the apex),
  title "Cloudflare OS". **NO Cloudflare Access in the human path — Better Auth + SSO.** Zone cache purged.
  Rollback staged (`docs/ws-11-rollback.md`; versions megabyte-os 54121665 / megabyte-home a6787c6a).
  FOLLOW-UPS (not blocking the headline): (i) **verify-prod.mjs/verify-os.mjs are now STALE** (os. detached →
  000; apex changed) — rewrite for the apex-only topology (BA session, not the service token) = TOP next item;
  (ii) os.megabyte.space → apex 301 (re-add os. DNS + redirect rule) for old links (os. currently 000);
  (iii) P2 clean anonymous: 3 WS console errors (anonymous capnweb /api handshake) + "preview before sign-in"
  — needs BA-4a+BA-4b (anonymous-aware frontend) + BA_GATE pass-through; (iv) Access app on os. now orphaned
  (harmless — clean up later). (v) ✅ fire-65: verify-prod/verify-os/verify-ba-flip REWRITTEN for the apex
  topology (os. targets gone) → verify-prod 10/10, verify-os 2/2; HSTS restored zone-wide (CF security_header).
  (vi) ⚠️ APEX CSP — the flip regressed the estate's CSP-L3 posture: the forked OS router emits NO
  content-security-policy (megabyte-home's CSP was homepage-specific). Craft an OS-specific CSP (capnweb wss
  connect-src + AI-gateway + script/style/img for the OS), browser-TEST it doesn't break the capnweb app
  (report-only first → tune → enforce), then restore the hard CSP assertion in verify-prod. Security slice.
- [x] (superseded) P1 — APEX MOVE (→WS-11): megabyte.space serves the OS (OS router owns the apex; the WebGL homepage is
  the dismissible first-view component, CONFIRMED working on os.). SENSITIVE/atomic sub-steps, fresh focused
  fire: (a) ✅ DONE fire-61 (fork 079ad28d, outer 7093824c) — the OS router forwards `/api/auth/*` → the `AUTH`
  binding (megabyte-auth), flag `BETTER_AUTH=1`; verified LIVE: `os.megabyte.space/api/auth/ok` → `{ok:true}`
  200, verify-os 3/3. Better Auth is now baked into the OS router, so it works the instant the router takes
  the apex. ✅ ALSO DONE fire-62 (fork 793fb4d5): the OS frontend now has its OWN `/signin` route (BA login +
  GitHub/Google SSO buttons, `routes/signin.tsx`), added to `__root.tsx` `standalone` (renders anonymously, not
  the LoginPage wall), and the router BA_GATE now EXEMPTS `/signin`+`/signup` (redirecting /signin→/signin would
  loop at the apex). signin asset shipped; verify-os 3/3. ⚠️ FINDING for the flip: os.megabyte.space serves an
  aggressive CF bot JS-challenge (`cf-mitigated: challenge`, "Just a moment…") on /signin for non-human
  fingerprints (curl + headless both blocked) — a REAL browser passes it; the apex (megabyte.space, NOT
  aggressively challenged) should resolve it. TUNE bot-fight-mode / add a managed-challenge exception for the
  apex so anonymous preview is friction-free. REMAINING (the sensitive flip — next focused fire):
  (b) re-point `megabyte-os` router `customDomain` os.→`megabyte.space` in `deployment.jsonc` (detaches os. on
  deploy — keep os. as a 301/alias); (c) confirm `LandingHomepage` first-view renders at the apex; (d) retire
  `packages/home`; (e) rollback = re-point customDomain back + `docs/ws-11-rollback.md`; (f) bot-challenge tune.
  ✅ RUNBOOK CORRECTED fire-63 — `docs/ws-11-rollback.md` § CORRECTED flip procedure (no-Access/BA_GATE
  direction; the old wrapper-worker + Access-add steps are superseded). The flip is now a clean, documented,
  reversible re-point with ALL prereqs ready — READY TO EXECUTE as the next focused fire: (1) Context empty→
  sharingDomain null; (2) record rollback versions; (3) free the apex (drop megabyte.space from packages/home,
  keep workers_dev) + deploy home; (4) re-point megabyte-os customDomain os.→megabyte.space + deploy; (5) verify
  via BA session (service token dies at the apex — no Access) using verify-ba-flip as the base; (6) os.→apex 301;
  (7) purge + real-browser pass; (8) bot-fight-mode tune. Rollback staged FIRST.
- [x] ✅ P2 — AUTH-ON-ACTION DONE + LIVE (fire-66, fork 9806f649): anonymous megabyte.space LOADS the OS
  (the WebGL LandingHomepage preview) with ZERO console errors — the 3 WS "Not authenticated"/handshake errors
  are GONE. BA-4a (server.ts: anonymous capnweb PublicApi, not 403; authed path + Origin CSRF + BA_ALLOWED_EMAILS
  preserved; AuthenticatedApi still gated) + BA-4b (useAuth probes /api/auth/get-session → anonymous renders NO
  authed RPC, a BA session auto-authenticates; __root.tsx settled-anonymous → LandingHomepage onEnter→/signin) +
  router BA_GATE inert (no anon→/signin 302). VERIFIED real-browser: anon → preview 0 console errors; authed BA
  → OS 0 console errors; verify-prod 10/10, verify-os 2/2 (verify-ba-flip leg 1 updated: anon→200 shell preview).
- [x] ✅ P3 — GitHub + Google SSO DONE + LIVE (fire-60 rail + fire-62 /signin UI + fire-64 at the apex):
  Better Auth `socialProviders.{github,google}` on `megabyte-auth` (4 OAuth secrets); `/signin` shows Continue
  with GitHub + Continue with Google + email/password + magic-link; `POST /api/auth/sign-in/social` returns real
  github.com / accounts.google.com authorize URLs (verify-prod). FOLLOW-UP: confirm each OAuth app's callback =
  `https://megabyte.space/api/auth/callback/{github,google}` (the authorize URLs generate; the round-trip
  completes only if the callback is registered — 1-min dashboard check if an SSO round-trip 400s).
- [ ] P4 — MODEL ROUTING = DeepSeek-default (→WS-12, NEW). ★ SCOPED fire-67 (Explore mapped the OS model
  subsystem). KEY FINDING: the OS has NO "prompt generation / judgement / web research" TASK distinction —
  that's a projectsites.dev concept; it does NOT map to THIS OS. The OS is a user-picks-models workspace
  (model resolved at `user.ts:701-735`: user's per-chat/gadget choice → `preferredModel` → first available)
  + a hardcoded QUICK model for backend titles/binding-names (`ai-gateway.ts:138` `@cf/meta/llama-3.3-70b-
  instruct-fp8-fast`, Workers AI). So the ACHIEVABLE P4 = **DeepSeek as the cheap DEFAULT model** (users can
  still pick OpenAI/Anthropic per chat for "important work" — their choice overrides). The task-based
  premium-routing the user described is really an ABSORPTION item (bring projectsites' prompt-gen/judgement/
  research AI features INTO the OS, which would then route to premium models — WS-2/absorption, later).
  IMPLEMENTATION (Approach A, ~2-3h, next focused fire): (1) DeepSeek is NOT on Workers AI → add it as an
  AI-Gateway EXTERNAL provider ("deepseek", OpenAI-compatible, `deepseek-chat`) — `deployment.jsonc`
  aiGateway.providers += deepseek (+ openai/anthropic); (2) ✅ KEY MECHANISM RESOLVED (fire-68): the OS reaches
  providers via the `WORKERS_AI` binding (pre-authed in-account) EXCEPT `HTTPS_ONLY_PROVIDERS`, which ride HTTPS
  with `CF_AI_GATEWAY_API_TOKEN` (ai-gateway.ts:57/72/78-84). The PROVIDER's own key (DeepSeek API key) is stored
  ON the AI Gateway (authenticated-gateway/BYOK) — so set DEEPSEEK_API_KEY on the "megabyte-os" gateway (CF
  dashboard/API) + set `CF_AI_GATEWAY_API_TOKEN` (a Run+Read token) as a backend secret IF deepseek is HTTPS-only.
  ALSO: DeepSeek must be added to the `SUGGESTED_MODELS` catalog (workshop-shared) with its provider+model id
  (`deepseek` / `deepseek-chat`) so `resolveModel`/`getModelList` surface it — ⚠️ fire-70 CORRECTION: that
  needs EXTENDING the FIXED `AiModelProvider` union (`workshop-shared/api.ts`, currently cloudflare|anthropic|
  openai|google|ollama — NO deepseek) AND adding a getModel() adapter in `ai-models.ts` (DeepSeek is
  OpenAI-compatible → reuse the `openai-completions` stream with a DeepSeek baseURL + key; `@earendil-works/pi-ai`
  ships NO deepseek models registry). (3) there is NO `getDefaultModelConfig()` in ai-gateway.ts (the fire-67
  digest was wrong) — "default" = change the per-chat fallback at `user.ts:701-735` or the QUICK model at
  `ai-gateway.ts:138`; ✅ fire-70 CHECKED: the "megabyte-os" gateway has authentication=OFF → `CF_AI_GATEWAY_API_TOKEN`
  is NOT needed; the DeepSeek key is present in get-secret (rides per-request / BYOK-on-gateway);
  (4) ⚠️ TEST a real DeepSeek call succeeds through the OS gateway BEFORE making it the default (else new/
  model-less chats break); (5) behind a default-OFF feature flag (per `feature-flags`), promote after eval.

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
- [x] ★ FIRST ABSORPTION SLICE — SHIPPED fire-71 (fork 9092c9b0+31c1f534 / outer d135a891; deployed
  ee1c1f47). PIVOTED from the "Visitors today" card to the **AI model catalog** — a BETTER first slice:
  frontend-ONLY (no backend risk), it IS the Notion-like-table capability (#1 mission item) over real data
  (`SUGGESTED_MODELS`), and it ships the REUSABLE `DataTable` primitive later slices build on. SHIPPED:
  generic `components/DataTable.tsx` (typed columns+rows, click-sort + `aria-sort`, hover, a11y) +
  `routes/models.tsx` (`/models`, flag-gated) + the first real UI flag `model-catalog` + a flag-gated
  Sidebar "Models" nav (no dead link). VERIFIED (BA-authed real browser, `scripts/verify-models-catalog.mjs`):
  9 rows = SUGGESTED_MODELS count (display-vs-store RECONCILED), 4 columns, sortable, 0 console errors,
  vision 9/10 (`os.models` matrix). Flag ENABLED (documented two-way-door deviation: zero-risk read-only).
- [ ] (next) extend on the SAME seam — REUSE `DataTable` for: a Workspaces/Gadgets table view · a
  Coinbase-Pro-density dashboard · the "Visitors today" analytics card (needs a capnweb **AuthenticatedApi
  RPC method** + a `ctx.exports` DO counter — NOT a Hono REST route; see § OS fork architecture facts) ·
  Airtable-level D1/DO automation. Pull specifics from `./PROJECTSITES-ABSORPTION.md`.

### OS fork architecture facts (confirmed fire-71 — build absorption on THESE, never scout guesses)
- **Backend = capnweb RPC, NOT Hono REST.** Data surfaces are methods on `PublicApi`/`AuthenticatedApi`
  (`workshop-shared/src/api.ts`), resolved in `workshop-backend/src/{server,user}.ts`. There is NO
  `app.post('/api/...')` — a scout/agent proposing a REST route is hallucinating.
- **DOs use `ctx.exports` → NO wrangler/deployment.jsonc binding edit** (`workshop-backend/wrangler.jsonc:63`).
  Existing: `Gadget`, `AdminSettings`, `UserDurableObject`, `OverseerDurableObject`, `LanguageModelGatekeeper`.
- **UI flags**: `workshop-shared/src/feature-flags.ts` `UI_FEATURE_FLAGS` = `{key,dev,default}`; gate with
  `useUiFeatureFlag('key')`. ⚠️ `FeatureFlagsProvider` resolves via `authenticatedApi.getUiFeatureFlags()` —
  flags ONLY resolve for AUTHED users; NO frontend/URL override (to render a flag ON for a prod test, flip
  `default` + deploy, or promote via Flagship).
- **`analytics.ts` is WRITE-only** (`recordAnalytics` → events); no read-aggregate — a dashboard needs its own
  Analytics-Engine query or a DO counter.
- **Reusable primitive EXISTS**: `workshop-frontend/src/components/DataTable.tsx` — REUSE it, don't reimplement.
- **Verifying an authed OS surface**: BA sign-in + complete onboarding once (ba-e2e is now onboarded) + set
  `localStorage megabyteOS_entered=1` to skip the splash. Pattern: `scripts/verify-models-catalog.mjs`.

### WS-3 — Beautify-10x
- Mission: every created/visited surface iteratively more gorgeous; per-surface pass-count +
  vision score tracked in `.claude/modifier-matrix.json`.
- Cadence: every-loop
- [x] Seed `.claude/modifier-matrix.json` + deterministic target picker (fire-38, a333e5fe) —
  12 surfaces scored; `scripts/lowest-beauty-surface.mjs` NAMES the lowest-scored actionable
  surface as the next fire's target (skips score-0 unbuilt + superseded os.login; ratchet bar
  9.5). Acceptance met (ran: `→ home.features 8/10 — bento asymmetry`). Beautify continues per-fire.
- [x] home.features 8→9 (fire-38, a333e5fe) — asymmetric bento (auto-rows-fr 3×3, wide+tall cards)
  + featured bottom signatures; verify-apex-journey 27/27, verify-prod 9/9, vision 9/10. Next
  lowest actionable = home.trust (8/10).
- [x] home.signin 8→9.5 (fire-70, outer 70be693d / fork eba4c548) — the OS brand token was ORANGE
  (`--color-kumo-brand:#ff4801`, never remapped off upstream) while the homepage CTA is cyan; a SCOPED
  `.signin-cyan` override (cyan brand + hover + dark #03030a inverse for AA on the light fill + cyan
  brand/link text) makes the Sign-in button + brand mark + magic-link vibrant cyan #00E5FF, matching the
  "Enter the OS" CTA. Also dropped the app `<Header>` from /signin (it mounted `<UserMenu>`→throwing
  `useAuthenticatedApi()` with no AuthProvider → a console error). Real-browser verified
  (`scripts/verify-signin-cyan.mjs`): rgb(0,229,255) + btn hue 209 + app header absent + 0 console errors;
  verify-prod 10/10.

### WS-13 — Global OS shell rebrand (orange→cyan+black)
- Mission: the WHOLE OS shell is still upstream ORANGE-on-VIOLET (`--color-kumo-brand:#ff4801`/`#b84e00`;
  dark surfaces `oklch(... 285)` violet, not black `#060610`) — violates Brian's SUPREME black+cyan brand.
  fire-70 scoped cyan to /signin only; this arc rebrands the shell globally. Needs AUTHED-surface
  verification (service-token browser), so it's a dedicated arc, never a blind global token flip.
- Cadence: as-picked (Beautify)
- [x] Slice A — SHIPPED fire-72 (fork efa4c3b1 / outer 528140de; deployed 613c626c). Remapped the brand-family
  tokens (brand/hover · text-brand/link · accent-100/200 · selection · shadow) orange→CYAN in BOTH light + dark,
  paired `--text-color-kumo-inverse`→#03030a so cyan FILLS keep AA contrast. Light-mode text-brand uses deeper
  cyan #0891b2 (legible on white). FIXED `PersonAvatar` → explicit `text-white` (its hashed-bg initials were the
  ONE `kumo-inverse` usage NOT on a brand fill — a blind global dark-inverse flip would've made them vanish).
  VERIFIED (BA-authed real browser `scripts/verify-shell-cyan.mjs` + screenshots): 0 orange on home + /models,
  cyan logo/nav-accent/icons/send-button, send-button = cyan fill + dark arrow (contrast OK), 0 console errors,
  vision 9/10. verify-prod 10/10. /signin's scoped `.signin-cyan` is now REDUNDANT (global is cyan) — harmless.
  RECIPE for Slice B + future rebrands: (1) grep every brand-family token + its `kumo-inverse` usages; (2) the
  RISK is any `kumo-inverse` on a NON-brand fill (hashed avatar, custom bg) — give those explicit text; (3) cyan
  is LIGHT → fills need dark inverse + light-mode TEXT needs a deeper cyan; (4) VERIFY WITH SCREENSHOTS, not an
  exact-rgb computed-style probe (brand renders via box-shadow / currentColor icons / color-mix — exact match misses it).
- [ ] Slice B — shift the dark base off violet hue 285 toward black #060610 (surfaces/lines/rings), re-check
  contrast on every Kumo surface token; screenshot + vision ≥9/10 on 3+ authed surfaces.

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

### WS-8 — Auth-on-action with Better Auth (Brian 2026-10-02: anonymous OS UI, SSO only on submit, NO Access front-door, NO other domains)
- Mission: **"Log in" takes you STRAIGHT to the OS UI (anonymous) — sign-in (Better Auth) is prompted
  ONLY when you perform a protected action (submit a prompt / write a form).** Better Auth is
  D1-backed + mounted ON `megabyte.space/api/auth/*` ONLY (no `os.` Access page, no cloudflareaccess.com
  in the human flow). Magic-link (SES) Day-1; Google + GitHub SSO once OAuth apps exist. Full plan +
  one-way-door self-argument + rollback: **`docs/decisions/0001-auth-on-action-better-auth.md`** (ADR).
- Cadence: PRIORITY — Brian-directed; BA-1 next. Best in a FRESH full-budget session (large one-way-door;
  the fork's capnweb RPC ↔ Better-Auth-session wiring is the main unknown — see ADR §Risks).
- SUPERSEDES the earlier "Access stays as a thin edge gate / stock Access page never human-facing" —
  Access is REMOVED from the human path (service-token/WARP automation may remain until BA-4).
- Prereqs PROVISIONED (fire-44): D1 `megabyte-auth` (`718b44ef-a33a-4aba-8300-8b70a21dbfd1`, ENAM);
  `BETTER_AUTH_SECRET` → get-secret. Still needed (NOT a blocker — magic-link works without): Google +
  GitHub OAuth apps, callbacks `https://megabyte.space/api/auth/callback/{google,github}`.
- [x] BA-0 — decide + decompose + provision (fire-44, this fire) — ADR 0001 written; D1 + secret
  provisioned; WS-8 rewritten to the auth-on-action sequence; CLAUDE.md § Auth updated.
- [x] BA-1 — Better Auth v0 DARK (fire-45) — `packages/auth` dedicated ISOLATED `megabyte-auth` worker
  (`better-auth` + `better-auth-cloudflare` d1Native, email+password) on D1 `megabyte-auth`; the apex
  FORWARDS `/api/auth/*` → `AUTH` service binding when `BETTER_AUTH="1"`, so it's baked into
  `megabyte.space/api/auth/*` with zero homepage risk. Full round-trip PROVEN (sign-up→sign-in→
  get-session, cookie on the apex domain) via BOTH workers.dev AND megabyte.space. `verify-auth.mjs`
  **4/4**; verify-apex **3/3** (homepage/UX unaffected). Dark: no UI uses it. Access gate UNCHANGED.
- [x] BA-1b — magic-link via SES (fire-47, 61518a1b) — better-auth magicLink plugin; sendMagicLink →
  SES v2 (aws4fetch SigV4, from hey@megabyte.space, verified prod identity). Login gains "Email me a
  sign-in link" → "Check your inbox". Full flow PROVEN (request → SES accepted → token in D1 → verify
  → session cookie on megabyte.space). verify-auth 5/5 (+magic-link leg); verify-apex 30/30; vision 9/10.
- [x] BA-2 — our black/cyan login surface (fire-46, 98dbc6ed) — shipped at a NEW dark `/signin` route
  (cleaner than gating /login: the live `/login` 302 is byte-identical, untouched). `Login.tsx` on
  megabyte.space, same-origin with the BA-1 rail; email+password wired to /api/auth; inline error/
  success + sign-in/sign-up toggle. Vision 9/10; UI→rail sign-in proven in a real browser; axe 0;
  reduced-motion safe; verify-apex-journey 30/30 (+/signin gate). SSO/magic-link buttons = BA-1b + OAuth.
- ★ DISCOVERY (fire-48, see ADR 0001 § Discovery): **BA-3 + BA-4 + BA-5 are ONE coordinated flip**, not
  three independent slices. Nothing reaches the OS backend without passing the Access EDGE gate, so the
  Better-Auth path (BA-3) + anonymous UI (BA-4) are un-E2E-testable until Access is relaxed (BA-5). They
  all ACTIVATE together at the flip. Cross-subdomain cookies = throwaway (end-state is OS-at-apex,
  same-origin). **The auth rail + login are COMPLETE + verified at /signin; the only thing left is the
  flip (the big Brian-gated one-way-door that changes the live apex).** Best run as a single fresh-budget
  fire with rollback staged + Brian's go on the live-apex change.
- ★ FLIP AUTHORIZED (Brian 2026-10-03, "will the loop do the flip?" + full-permission directive): BA-5 is
  NO LONGER Brian-gated. The loop executes the flip (BA-3→BA-4→BA-5) autonomously + carefully (reversible,
  verify each step, rollback-ready). Driving it now.
- [x] BA-3 — backend DUAL-ACCEPT (fire-50, fork ab536d4b) — `server.ts` auth tries the Access JWT first
  (unchanged), else falls back to `verifyBetterAuthSession` (access.ts; public subrequest to
  megabyte.space/api/auth/get-session). Same email identity. Deployed (backend 66b77a33); Access path
  UNBROKEN (verify-os 3/3). BA-session path dark until the relax (every request still carries an Access
  JWT while Access fronts the OS).
- [x] Cross-subdomain cookies (fire-52 code, SALVAGED + landed fire-53 — auth df2be5c9, deploy acc4d37b) — Better Auth session cookie now `Domain=.megabyte.space`
  (`advanced.crossSubDomainCookies` + os. in trustedOrigins), so the OS on os.megabyte.space can read the
  session set on the apex — the flip WITHOUT a full apex re-point. verify-auth 5/5 LIVE (fire-53, rail unbroken).
- [x] BA-4 — router EDGE gate (fire-52, fork 76ce0131) — `router/src/index.ts`: anonymous HTML navs →
  megabyte.space/signin, EXEMPT (dark while Access fronts the OS, incl. the service token): cf-access-jwt
  header, better-auth session cookie, /api/asset/non-nav. Flag-gated `BA_GATE` (unset ⇒ inert). Deployed
  DARK + verified dark: verify-os 3/3 (service token unaffected — the fire-51 regression did NOT recur;
  edge gate, not the fragile frontend whoami).
- [x] BA-5 — RELAX + verify **DONE + LIVE-VERIFIED** (fires 56→58, fork `d302b181`).
  (1) CF Access on os.megabyte.space RELAXED to bypass-everyone (fire-56; pre-relax Access app/policies
  snapshotted to `packages/.../ws-11-rollback-state/*` for rollback). (2) Router `BA_GATE=1` armed (fire-57):
  an anonymous HTML nav to os.megabyte.space 302s to OUR Better Auth `/signin` on the apex — NOT
  cloudflareaccess.com. CAVEAT RESOLVED: service-token (cf-access-client-id), BA-session cookie, and Access-JWT
  are all exempt, so automation still reaches the shell 200 (verify-prod #4 green). The gate is UX-only; the REAL
  boundary is `/api` (backend dual-accept, fail-closed CWE-306, email-verified authz CWE-345 — the data-less
  shell is safe to serve). (3) Both stale verifiers rewritten for the flipped topology (fire-58): `verify-prod.mjs`
  #3 (`f1c75cc6`) + `verify-apex-journey.mjs` funnel (`fba9ce5f`) now assert →megabyte.space/signin, never
  cloudflareaccess.com. **VERIFIED LIVE (fire-58):** real browser anonymous os→302 `/signin`; `verify-ba-flip`
  **3/3** (anon→/signin · BA sign-in→.megabyte.space cookie · authed→OS shell 200); `verify-prod` **9/9** ·
  `verify-os` **3/3** · `verify-apex-journey` **30/30**. Rollback staged (`docs/ws-11-rollback.md` + `BA_GATE=0`
  + re-assert the Access policy). Known-minor (replenished below, not blocking): the gated path is CF-edge-cached
  for some non-browser client fingerprints (data-less shell only); /signin shows CF-injected bot-challenge CSP
  console-noise under automation (filtered as not-ours; real humans typically never trip it).
- [x] BA-2.1 — /signin session-aware (fire-48, b0ba79e7): already-signed-in users see "Already signed in"
  + Continue/Sign-out instead of a redundant form (embarrassingly-easy); both states verified; 30/30.
- ★ BA-4 — anonymous UI + auth-on-ACTION (the FULL-directive gap after fire-58's BA-5; fire-54 adversarial
  finding). BA-5 shipped auth-on-NAVIGATION (anon nav → our /signin), which removes Access but does NOT yet
  "take you directly to the UI" (Brian's words). Two concrete blockers confirmed LIVE in fire-54:
  - [ ] BA-4a — backend anonymous PublicApi (SCOPED fire-59, fork d302b181). The capnweb `/api` connection is
    gated as a WHOLE at `workshop-backend/src/server.ts:845` (`if (env.CF_ACCESS_AUD || allowRaw)` → Access-JWT
    OR allowlisted Better-Auth session OR 403; also `Origin===origin`). There is NO anonymous entry — BOTH
    PublicApi + AuthenticatedApi sit behind this one gate (confirmed live: anon /api → 403). The OS's NATIVE
    design DOES have the PublicApi/AuthenticatedApi split (PublicApi = pre-login/public; AuthenticatedApi =
    per-user) — the Access integration is what gates the whole connection and broke native anonymous PublicApi.
    THE CHANGE: make the connection establishable anonymously (`accessPayload` undefined ⇒ PublicApiImpl) and
    gate only AuthenticatedApi ops (by the native user session + `BA_ALLOWED_EMAILS`). DESIGN decision
    ("which ops are public") is ANSWERED by the native split — don't invent a new taxonomy. RISK: audit every
    `PublicApiImpl` handler that reads `accessPayload` and make it anonymous-safe before relaxing the gate
    (the Access integration may have made some assume auth). — accept: anon /api connects (PublicApi stub, not
    403); a protected/AuthenticatedApi op without a session → typed auth-required error, not a blanket 403.
  - [ ] BA-4b — frontend auth-on-action (frontend is ALREADY READY, fire-59): `useAuth.ts` non-`CF_ACCESS_MODE`
    branch renders anonymously + only calls `login(token)` on action. The change = unset `VITE_CF_ACCESS_MODE`
    (`scripts/deploy.ts` ~L611) + wire the protected-op auth-required → our BA `/signin` (or inline) → retry.
    — accept: a real browser loads the OS anonymously (no redirect, no error), a protected action triggers
    sign-in, then resumes.
  - ⚠️ BA-4a+BA-4b are ATOMIC: unsetting `VITE_CF_ACCESS_MODE` WITHOUT the backend anonymous-PublicApi change
    = frontend renders anon → backend 403s the connection → broken OS. Ship together, TEST on the live auth
    path, next focused fire (sensitive — don't rush in a context-heavy session; fire-51/54 lesson).
  - When BA-4a+4b land, flip the router gate from redirect-on-nav → pass-through (anon shell loads), keeping
    the backend as the real boundary; re-verify `verify-ba-flip.mjs` (update leg 1: anon→shell, not →/signin).
- [x] BA-5 (DUP of the canonical BA-5 line ↑ — now DONE there, fire-58). Left as a pointer; the shipped
  proof + rollback live on the canonical line above.
- [ ] BA-6 — cutover: apex "Log in"/"Enter" → OS UI directly (no Access 302); remove the human Access
  front-door; SSO providers live; `verify-prod` rewritten for the new topology all-green.

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
- [ ] HARDENING (low, not blocking — fire-58): the `BA_GATE` path on os.megabyte.space is CF-edge-cached for some NON-browser client fingerprints — a curl nav (even cache-busted) gets the data-less 200 shell while Node-fetch + real browsers get the 302 `/signin` (curl HEAD saw a cached 302, `cf-cache-status: HIT`). NO data leak (shell is data-less; `/api` dual-accept + fail-closed is the real boundary; real browsers ALWAYS gate to /signin). — ws: WS-8 — accept: `Response.redirect` in the fork router (`packages/router/src/index.ts`, Upstream Sync lane §1.18) carries `Cache-Control: no-store` (or the gated `/` nav is marked non-cacheable) so the gate is deterministic for every client; verify-prod #3 stays green. Submodule change → route via the Upstream Sync lane.

> fire-1 (2026-09-30, aborted on session limit; Brian canceled loops) — Product Discovery + Security
> ran read-only and returned; the 6 mutating agents died at `subagent_tokens: 0` before committing.
> Items below are READY for whenever the loop re-arms.

- [ ] Provision `studio` D1 on a starter-owned worker with schema-introspection endpoints — ws: NEW-database-studio — accept: `GET /api/studio/schema` on prod returns `{tables:[{name,columns:[…]}]}`; binding in starter config, never the submodule (ULTIMATE §Data-UX 15/19)
- [ ] Flag-gated Tables-mode grid MVP (default-OFF `database_studio` flag) — ws: NEW-database-studio — accept: paginated sortable grid of one `studio` table, 0 console errors, vision ≥8/10 (ULTIMATE §Data-UX 16/17/52)
- [ ] Display-vs-store reconcile harness for the grid — ws: NEW-database-studio — accept: `e2e/studio-verify/reconcile.mjs` diffs `SELECT COUNT(*)` vs rendered rows, flags LYING-EMPTY/WRONG-SOURCE (ULTIMATE §Quality 74)
- [ ] Starter-owned analytics ingestion (absorption #1) — ws: NEW-analytics — accept: Analytics Engine/D1 `visitor_events` captures apex pageviews; `GET /api/analytics/live` returns real reconciled count (ULTIMATE §Dashboards 45)
- [x] Web Vitals beacon + p50/p75 card from stored events (fire-42, 3b61caec) — shipped; card matches the Playwright pageview (verify-vitals reconcile). (ULTIMATE §Quality 77)
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

> fire-37 (2026-10-02) appends — resume-reconcile fire; deduped vs above (closes the fire-4 "CF challenge-platform inline residual" tracking gap):

- [ ] Brian decision (security-posture, canonical #4): disable `bot_management.enable_js` on zone megabyte.space (75a6f8d5…) to remove CF's edge-injected `/cdn-cgi/challenge-platform` inline script — ws: WS-7 — accept: served apex HTML has 0 inline `<script>` beyond JSON-LD AND verify-apex-journey step 1b stays green with the inline-CSP tolerance REMOVED (no CF challenge to tolerate). Reversible toggle; weakens one bot-JS signal on a public Worker-served marketing apex (no origin to protect; OS is Access-gated separately).
- [ ] home.how-it-works 9→9.5 — ws: WS-3 — accept: `node scripts/capture-section.mjs https://megabyte.space "#how" /tmp/how.png` + vision ≥9.5; step-card body contrast white/60→/72 + per-step iconography; axe contrast clean.
- [ ] os.landing 9.5→10 — ws: WS-3/WS-11 — accept: a bento/reactive micro-element in the hero lower-right negative space; verify-os-landing PASS + vision ≥9.5; lower-right no longer reads sparse (fork edit via §1.18).

> fire-38 (2026-10-02, Features asymmetric bento 8→9) appends:

- [ ] home.features 9→9.5 — ws: WS-3 — the tall 'Gadgets' card (row-span-2) still has a mid-gap
  between body and its bottom signature. — accept: fill it with a reactive micro-element (a tiny
  live OS-surface preview or an animated capability glyph), `capture-section.mjs "#features"` +
  vision ≥9.5; tall card no longer reads mid-sparse; axe 0 + reduced-motion gated.
- [x] home.trust 8→9 (fire-39, 2076a23c) — per-row iconography (shield/play/eye/cube) + staggered
  `.trust-row` cascade + hover glow; capture vision 9/10; verify-apex-journey 27/27, axe 0,
  verify-reduced-motion 7/7. Next lowest-actionable per the picker = home.hero / os.shell (8.5).
- [ ] (type-hygiene finding) `packages/home` has ~15 pre-existing `noUncheckedIndexedAccess`-strict
  tsc errors in NotFound.tsx / StatusView.tsx / webgl.ts (latent; the vite build tolerates them, so
  they've shipped for many fires). — ws: cleanup — accept: `npx tsc --noEmit` clean in packages/home
  without loosening tsconfig; no runtime behavior change; verify-apex-journey still 27/27.

> fire-39 (2026-10-02, Trust pillars iconography + cascade 8→9) appends:

- [ ] home.trust 9→9.5 — ws: WS-3 — after the right-column enrichment, the LEFT column (headline +
  paragraph) now reads plainer than the right. — accept: a left-column lift (a verify/trust badge or
  an animated shield motif tying to the icons), capture `#trust` + vision ≥9.5; axe 0; reduced-motion
  safe (verify-reduced-motion 7/7).
- [x] Single apex ship gate aggregating reduced-motion (fire-40, f901b51c) — `scripts/verify-apex.mjs`
  runs verify-prod + verify-apex-journey + verify-reduced-motion in one command, non-zero on any fail
  (3/3 green this fire). verify-reduced-motion also extended to assert `.kinetic-word` visibility.
  REMAINING (smaller): auto-run `verify-apex.mjs` from the deploy script / CI (see next-wave).
- [x] home.hero 8.5→9 (fire-40, f901b51c) — kinetic headline (per-word cascade + gradient punchline
  fade, reduced-motion gated); verify-apex 3/3, vision 9/10. Next lowest-actionable = os.shell (8.5).
- [x] os.shell 8.5→9 (fire-41, 7dde63df, fork 1abec09c) — glowing cyan active-nav rail (SidebarItem,
  before: pseudo); 6 OS workers deployed (router d855b35a); verify-os 3/3, shell.png vision 9/10.
  Orange 'Reconnecting' chip skipped (artifact-only). **★ Beautify arc CLOSED: every apex/estate
  surface is now ≥9 (os.landing 9.5, all others 9). The picker will return no sub-9 target next fire
  → the loop MUST rebalance to non-Beautify categories (testing/arch/discovery/security/docs).**

> fire-40 (2026-10-02, kinetic hero headline 8.5→9) appends:

- [ ] home.hero 9→9.5 — ws: WS-3 — the WebGPU particle upgrade (WebGPU→WebGL2→Canvas→reduced-motion
  ladder, honest probe + per-tier screenshot proof) and/or a scroll-scrub camera path locked to the
  field. BIG slice — best in a fresh full-budget session. — accept: forced-path renders per tier,
  verify-apex 3/3, vision ≥9.5.
- [ ] Auto-run `verify-apex.mjs` from the deploy flow / CI — ws: WS-7 — the aggregator exists
  (fire-40) but is invoked manually. — accept: `pnpm --dir packages/home deploy` (or a thin post-deploy
  hook) + a CI job run it after an apex deploy, with a ~15s asset-propagation wait first.
- NOTE (apex Beautify-10x near saturation): after this fire only `os.shell` (8.5) sits below 9 on the
  apex/estate surfaces; `os.landing` is 9.5. The remaining ≥9→9.5 levers are big (WebGPU, scroll-scrub)
  or fork-side (os.shell) — signals the next high-value work is WS-8/WS-11 (Brian-gated) or a
  fresh-session big slice, not continuous apex polish.

> fire-41 (2026-10-02, os.shell cyan active-nav rail 8.5→9 — ★ BEAUTIFY ARC CLOSED) appends:

- ★ REBALANCE MANDATE: every apex/estate surface is now ≥9 (`lowest-beauty-surface.mjs` returns the
  cool os.landing 9.5 as "lowest"). Beautify-10x has NO sub-9 target → the next fires MUST pick
  NON-Beautify categories (the §2 budget has starved testing/arch/security/docs/discovery across
  fires 36-41). Concrete ready slices seeded below.
- [x] Web Vitals field beacon + `/status` CWV card (fire-42, 3b61caec) — web-vitals beacon →
  flag-gated POST /api/vitals → AnalyticsCounter DO (bounded 1000/metric, p50/p75) → good/NI/poor
  CWV card. Causal-proven (verify-vitals.mjs 5/5: real visit → all 4 vitals stored → /status
  reconciles LCP p75); verify-apex 3/3 (journey 28/28 + CWV-contract guard); card vision 9/10.
- [ ] Architecture orphan/drift sweep — ws: WS-6/arch — run an import-graph orphan check over
  `packages/home/src` + the starter workers; confirm no built-but-unwired modules; verify the
  submodule pin matches the LEDGER. — accept: a short findings note + any fix in-fire.
- [ ] Long-Trail case-001 restart (WS-5, standing role 16 — never started) — ws: WS-5 — design the
  checkpointed 60-100-action estate-path case + execute ≥20 actions on the PUBLIC apex (the OS legs
  stay WS-403-blocked). — accept: checkpoint file committed + ≥20 actions with screenshots.
- NOTE: `scripts/verify-os.mjs` shipped this fire (single OS ship gate = verify-prod + verify-os-theme
  + verify-os-landing); mirrors `verify-apex.mjs`. Both still invoked manually (see the deploy/CI
  auto-run next-wave item).

> fire-42 (2026-10-02, field Core Web Vitals beacon + /status card — first NON-Beautify rebalance fire) appends:

- [x] Exclude verification traffic from field vitals (fire-43, 0566a8dd) — beacon self-excludes
  automation (`navigator.webdriver` guard) + a `probe` column isolates verifier samples (POST
  `{probe:true}`, read via `?includeProbe=1`) from the public card; Bearer `POST /api/vitals/reset`
  purged the 35 pre-guard headless samples. verify-vitals rewritten NON-polluting (probe-only) 5/5;
  public field vitals now honest-empty until real visitors; verify-apex 3/3 (guard held through it).
- [ ] `/status` real-time live dot via DO WebSocket/SSE (replaces the 30s poll) — ws: WS-9 —
  per the real-time-data-no-manual-refresh rule. — accept: pushes update the pulse without a reload;
  display-vs-store reconciled.
- [ ] home.status 9→9.5 — ws: WS-3 (deferred, low marginal value) — sparkline axis labels/hover +
  day-over-day delta chip + the CWV card's good/NI/poor legend. — accept: capture + vision ≥9.5.
- NOTE: the §2 budget is rebalancing — fire-42 was product/observability (WS-9). Still-starved
  categories with seeded ready work: architecture (orphan sweep, fire-41 seed), testing (Long-Trail
  case-001 restart, fire-41 seed), security (CSP strict-dynamic ratchet), docs.

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

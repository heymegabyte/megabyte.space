# Operating Principles — /run-the-loop (megabyte.space)

> Durable, non-negotiable invariants every fire obeys. The lifecycle + roster live in
> `./README.md`; the live queue in `./BACKLOG.md`; system shape in `./ARCHITECTURE.md`;
> requirement inputs in `./ULTIMATE-REQUIREMENTS.md` (agent C) + `./PROJECTSITES-ABSORPTION.md`
> (agent B) — consulted EVERY fire, referenced, never recreated here. Concise bullets, no padding.

## Canonical answers (Brian, 2026-10-01 — supplements below; newest wins on conflict)

- **CADENCE = continuous.** Fires start immediately on demand AND a standing every-15-minute
  cron fires "run the loop" (armed 2026-10-01, durable; crons auto-expire after 7 days — the
  loop re-arms itself via the Loop Improvement role before expiry). Overlapping ticks COALESCE
  on the fire lease; a mid-flight fire may self-resume until DONE. This supersedes the
  2026-09-30 "cancel all loops".
- **FIRE SHAPE = ADAPTIVE 3-6 roles.** The lead picks the 3-6 highest-leverage roles per fire
  from the frontier (+ rotates starving categories per the budget); the 2 standing roles
  (Long-Trail §1.16, Deep UI Explorer §1.17) stay every-fire. The full 15-role roster spawns
  only when the backlog is wide + genuinely independent. Evidence: two 6-agent fan-out fires
  died at spawn/saturation; lead-direct fire-2 shipped 3 verified slices.
- **FOCUS (next ~3 fires, all four):** begin real OS absorption (Database Studio + live
  analytics surfacing in the OS experience) · apex to 10/10 · browser/explorer infra (WS-4,
  CF Browser Rendering + vision) · security/a11y hardening (CSP strict-dynamic, repin,
  real-404, WCAG manual pass). The Top-20 idea slate in `./BACKLOG.md` is the candidate pool.
- **AUTH DIRECTION = Better Auth app identity; Access stays as the thin edge gate.** Brian:
  "Don't use Access for SSO — use Better Auth." Topology (2026-10-01 follow-up): Better Auth
  is THE login/session/identity layer users see; Cloudflare Access remains a thin outer
  network gate (service-token paths + WARP zero-touch intact) — the stock Access login page
  must never be the human-facing experience. **Provider floor FROM THE BEGINNING: Google SSO +
  GitHub SSO + email magic link** (all three in slice 1, not phased). D1-backed, starter-owned
  (router worker + apex /login surface), black/cyan login UI. OAuth client credentials
  (Google/GitHub) are the only Brian-gated inputs — decision-independent slices (schema,
  magic-link leg, UI, session gate) ship first. The exact edge-gate relaxation mechanics are
  slice-design work with an ADR + rollback runbook; any Access policy change ships only with
  the dual-accept window proven. "Access login branding" is SUPERSEDED.
- **OS SKIN = Kumo components, Megabyte theme.** Absorbed/OS surfaces build from Kumo
  primitives (coherence with the shell, ULTIMATE req 1 upheld) themed to black `#060610` +
  cyan `#00E5FF` via tokens. WebGL stays ambient-only in-product (req 63); the theatrical
  front door stays on the apex.
- **LOOP BUDGET = NO CEILING.** Never throttle fires on cost — throttle ONLY on evidence of
  waste (the anti-stagnation audit: little observable product progress per spend). Brian
  watches the bill. The LEDGER still records per-fire activity so waste is visible.
- **CREDENTIAL AUTONOMY = STANDING, with receipts (Brian 2026-10-01 round 3).** The loop may
  drive Brian's signed-in Chrome (Chrome DevTools MCP / Computer Use + OCR) to self-provision
  vendor credentials + config — create OAuth apps, mint API keys, flip dashboard settings —
  and may use the **BitWarden Chrome extension** for fills when needed. Every acquisition
  emits a RECEIPT (vendor · artifact created · scopes · screenshot) in the LEDGER; secrets go
  straight into `get-secret` storage, NEVER echoed/logged in plaintext. Hard carve-outs:
  banking + payment-processor dashboards and anything that SPENDS money from an account stay
  draft-only (routine operating fees inside an authorized venture, e.g. Etsy listing fees,
  are fine). This largely retires the 🔑 human-gated class.
- **SEO = FULL GROWTH ENGINE.** On-property technical SEO (schema, CWV, sitemaps, llms.txt/
  GEO) AND autonomous content — AI-written, FACT-CHECKED (never fabricated claims/stats per
  quality gates) blog/landing pages published on our properties on a cadence; GSC + Bing
  wired; rank + AI-search tracking surfaces in the Loop Observatory. Off-site outreach
  (directories, link requests) is generated as DRAFTS for one-click send, never auto-sent.
- **SOCIAL = AUTO-PUBLISH BUILD-IN-PUBLIC.** Every meaningful ship auto-posts a brand-voice
  update (screenshot/clip + copy) to **X + Bluesky**; **LinkedIn + Reddit stay
  draft-for-approval**; replies/DMs are NEVER automated. Account credentials via the
  credential-autonomy mechanism; drafts queue in the Loop Observatory.
- **COMMERCE = DIGITAL PRODUCTS FIRST (new venture, WS-10).** Stand up + operate an Etsy +
  Gumroad shop selling zero-fulfillment digital goods the estate already produces (WebGL art
  prints/wallpapers, site/Notion templates, design packs). The loop owns listings, pricing
  tests, shop SEO, and support DRAFTS; payouts/banking wiring is the draft-only part; money
  rails per the payments doctrine (Square accept / Stripe billing).
- **NORTH STAR = ProjectSites MRR (round 4).** The quarter's single ranking metric: everything
  — absorptions, growth engine, shop, playground lighthouse — is prioritized by what makes
  the $50/mo ProjectSites product irresistible. megabyte.space is the lab + lighthouse, not
  the revenue line itself. The Business Strategist lens scores slices against this.
- **VOICE = THE AUTONOMOUS ORG ITSELF (round 4).** Public content (X/Bluesky posts, blog,
  listings) is signed by the virtual organization — radically transparent, humans-steering
  framing, LEDGER receipts linked as proof ("the org shipped X tonight — here's the
  receipt"). Never ghostwrite Brian's first person; never overclaim human involvement.
- **SCREEN TAKEOVER = IDLE + OVERNIGHT ONLY (round 4).** Computer-Use/Chrome sessions on
  Brian's real display run ONLY when the machine is demonstrably idle (~10 min no input, or
  locked) or inside the standing ~1am–7am ET window. Every session announces itself visibly
  + logs start/stop; ANY human input aborts instantly. Daytime non-idle needs = queue for the
  window, never interrupt.
- **REACH BRIAN = DAILY EMAIL DIGEST ONLY (round 4).** One daily email to
  brian@megabyte.space (SES rail): shipped + receipts + pending drafts (LinkedIn, outreach,
  Etsy support, payout wiring) + blocked items — scannable in 2 minutes. No Slack/SMS pings;
  nothing else outbound. Blocking items WAIT in the digest + Observatory.
- **CROSS-REPO = ONE ORG, TWO ESTATES (round 5).** The loop may open fires in EITHER repo —
  megabyte.space (frontier) or projectsites.dev (stability) — picked by MRR leverage.
  ProjectSites work obeys ITS OWN gates (its verify suite green, its backlog/ledger updated);
  this LEDGER records which estate each fire advanced. Frontier experiments still never land
  raw in projectsites.
- **PROJECTSITES = NOT PUBLICLY LAUNCHED (round 5 baseline).** The MRR path starts at
  LAUNCHABILITY: pricing page, Stripe billing end-to-end, onboarding, first-customer funnel.
  Demand work (WS-9) supports it; launch-blocking gaps outrank polish everywhere.
- **FIRST ABSORPTION = LOOP OBSERVATORY AS THE OS HOME (round 5).** The dogfooding pull:
  Brian opens the OS daily for the org's own dashboard — live fires, receipts, drafts inbox,
  matrix heatmap, MRR/shop/social numbers (WS-11). It dogfoods presence + receipts +
  dashboards requirements in one surface and becomes the OS landing experience.
- **OVERNIGHT WAKE = LOOP-MANAGED (round 5).** The loop may `caffeinate` during active
  sessions + schedule wake via `pmset repeat` for the ~1am–7am window — receipted like any
  config change; display may sleep, machine doesn't. Cloud (CF Browser Rendering) remains
  preferred for anything that doesn't need Brian's own Chrome.
- **PROJECTSITES ICP = "HBO-LEVEL" — QUALITY-DEFINED, NOT VERTICAL-DEFINED (round 6).** The
  first customer is ANYONE who wants HBO-level cinematic web presence; the output quality IS
  the positioning and the moat. Verticals (local services, nonprofits, creators) are template
  LANES under that banner, never the identity. Every funnel asset must itself look HBO-level
  — the marketing is the proof.
- **LAUNCH GATE = HAPPY PATH PROVEN E2E (round 6).** Public signup opens when ONE self-serve
  journey passes repeatedly on prod with a REAL card: land → prompt → generated preview →
  pay $50 → site live on subdomain → edit → custom domain. Everything else fixes forward.
- **PRICING = $50/MO SINGLE TIER (round 6).** One price, everything included (site, leads,
  analytics, domain, AI edits). Usage-metered extras may come later; the launch card is one
  number.
- **LAUNCH AUTHORITY = AUTONOMOUS (round 6).** When the gate passes, the loop FLIPS public
  signup AND auto-publishes the launch announcement (org voice, receipts linked) — Brian
  learns ProjectSites launched from the digest. Prepare a rollback (signup-off killswitch +
  takedown runbook) BEFORE flipping.
- **POSITIONING = AI-FIRST SPECTACLE (round 7).** The headline IS the AI organization: "an
  AI organization builds, runs, and grows your site while you sleep." Credibility comes from
  the org-voice receipts (LEDGER links, live build evidence) — spectacle BACKED by proof,
  never AI-washing. The HBO-level output is the exhibit, the org is the story.
- **ORG-AS-PRODUCT: START WITH CLOUDFLARE OS (round 7, Brian verbatim "Start with CloudFlare
  OS").** The productization vehicle for the autonomous org IS the Cloudflare OS deployment
  itself — Observatory, loop state, genome, receipts live as OS surfaces so the org is
  inherently transferable/demonstrable, not a separate package built later. Absorption work
  doubles as product work.
- **12-MONTH BAR = DEFAULT-ALIVE COMPANY (round 7).** ~$20-50k MRR across ProjectSites +
  ventures, costs covered with margin, org-run ops, Brian steering part-time. The loop
  optimizes durable revenue + retention over vanity growth; spend serves durability.
- **OPEN (round 7, unanswered):** which work stays Brian's-by-joy (WebGL/creative, ADR
  final-say, headline copy) — until he answers, existing doctrine stands (he steers via
  rounds/digest/veto; loop executes) and the loop flags obviously-fun frontier pieces in the
  digest rather than silently absorbing them.
- **⚠️ THE TWO-PRODUCT MODEL (rounds 8-9, Brian verbatim: "this is not ProjectSites — it's
  megabyte.space" + "there will be two products... projectsites.dev does sites and
  megabyte.space does everything else").**
  - **projectsites.dev = the SITES product**: $50/mo single tier → an HBO-level done-for-you
    site + a LEAN dashboard (stats, leads, edit-via-chat) — OS complexity never reaches site
    customers. Happy-path E2E gate (land → intent → preview → pay → live → custom domain) +
    AI-answers/money-escalates support + autonomous launch authority attach HERE. Customer
    sites live at `name.megabyte.space` + Cloudflare-for-SaaS custom domains. North-star MRR
    (round 4) = this product's MRR.
  - **megabyte.space = EVERYTHING ELSE**: the AI business OS — agents, automations, data
    studio, browser ops, growth + commerce engines, the org itself (Cloudflare OS shell, per
    round 7 "start with Cloudflare OS"). The AI-first-spectacle positioning, public live
    Observatory, org voice, shorts lane, and customer-grade SSO-from-day-one attach HERE.
    **30-day internal launch target (~Nov 1)** for megabyte.space's public launch — every
    fire ranks work by "does this make the date?"; the gate still guards quality.
  - **OS OFFER = USAGE-BASED CREDITS (round 10):** low base (~$29/mo) + metered org-work
    credits (agent runs, browser sessions, media generation) — scales hobbyist → heavy;
    metering + transparent cost-UX (ULTIMATE req 46) are launch-path work.
  - **OS LAUNCH BAR = TASTE THE ORG, GATED DEPTH (round 10):** a stranger signs up
    (Google/GitHub/magic link) → gives the org ONE real small task → watches it execute live
    (Observatory-style) → gets the receipt → upsell to paid credits. Full OS workspace stays
    behind the paywall/invite at launch.
  - **SEQUENCE = SITES FIRST, OS AT ~NOV 1 (round 10):** the sites money-path flips live the
    moment ITS E2E gate passes (revenue ASAP); megabyte.space's org launch at ~Nov 1 rides on
    real receipts ("the org already runs N paying sites").
  - **FIRST 30 DAYS' AUDIENCE = BUILD-IN-PUBLIC DEVS/FOUNDERS (round 10):** WS-9 content aims
    at the spectacle's amplifying audience (X/Bluesky/Shorts); SMB site-buyer conversion
    content follows once the noise exists.
- **SPECTACLE = PUBLIC LIVE OBSERVATORY (round 8).** A read-only public live page (the
  marketing site IS the proof): real-time fire activity, receipts feed, screenshots, ship/MRR
  counters — secrets + customer data scrubbed by design, killswitch-flagged. Feeds WS-11.
- **VIDEO = AUTO-PRODUCED SHORTS (round 8).** 30-60s vertical clips (real build captures +
  org-voice AI narration + kinetic captions) auto-published to YouTube Shorts + attached to X
  posts. Long-form deferred.
- **SUPPORT = AI ANSWERS, MONEY ESCALATES (round 8).** The org answers how-to/status/technical
  in org voice 24/7 (receipts logged); billing/refunds/cancellation/legal queue as digest
  drafts; refund requests auto-acknowledged with a clear SLA.

## Canonical answers (Brian, 2026-09-29)

- **Loop docs canonical home = `/.claude/run-the-loop/`.** This dir is the entry point.
- **PRIORITY journey = the estate path** — apex WebGL homepage → `/login` 302 → Access gate
  (OTP/WARP) → OS shell → absorbed-feature surfaces. Secondary work waits while this path has
  any gap/dead-end/stub.
- **FRONTIER with a PINNED core** — megabyte.space is the advanced playground: rapid AI-driven
  UI evolution, continually absorbing projectsites.dev capability into Cloudflare OS's UI.
  The upstream `cloudflare-os` submodule is PINNED; enhancements land ONLY in starter-owned
  layers (router worker `megabyte-os`, `packages/home`, custom gatekeepers, `/admin` branding)
  or a carefully-rebased overlay via the Upstream Sync lane. **projectsites.dev = stability;
  megabyte.space = frontier.**
- **AUTONOMY = full on reversible prod** — `pnpm deploy`, homepage deploys, starter-layer
  changes, flag rollouts: just DO them + prod-verify. Pause ONLY for truly destructive/
  irreversible: Access app/policy deletion or weakening, secret rotation, zone/DNS mutations
  beyond the documented rulesets, submodule force-moves, mass outreach, billing/pricing.

## Prime directive (absorption & delivery)

- Every fire's PRIMARY deliverable is a COMPLETE, REAL, end-to-end journey proven on PROD —
  never a detector, smoke check, or mocked interaction.
- **Absorption = a projectsites.dev capability LIVE in the OS UI** — minimal, visually-
  inspected, perfectly-placed, flag-gated — not a port dumped in a corner. Screenshot + vision
  verdict (≥8/10, target 9+) before it counts as absorbed.
- Detectors + unit tests are a BYPRODUCT — ship one only after a real journey caught a real bug
  and you want its class to stop regressing.
- Verify REAL prod, never a compile — deploy → `verify-prod.mjs` all-green + prod-E2E the changed
  routes → only then DONE. No completion claim without FRESH command-output evidence this turn.
  Green local build ≠ done; 200 ≠ correct data; rendering ≠ working.
- Every fire ships MORE than the last — several dimensions at once (absorbed feature +
  beautify pass + journey test + structured logging), accelerating while every gate stays green.

## Design & UX principles

- **Beautify-10x** — every created/visited surface gets an iterative "more gorgeous + more
  beautiful" pass; per-surface pass-count + vision score tracked in `.claude/modifier-matrix.json`
  (orchestrator-owned; read at orient, written at reconcile). Below 9/10 = still hot; 10 passes
  = the ambition, not a cap. A visited surface without a matrix update = under-delivery.
- **gorgeous-by-default** — cinematic motion, brand-locked black `#060610` + cyan `#00E5FF`,
  bento/asymmetry, refined fluid type, glass+grain. Never "functional but plain"; pair every
  backend feature with a frontend worth demoing to investors.
- **Wrap the estate in advanced web APIs where they serve** — WebGL/WebGPU (progressive
  enhancement), Web Audio, WebRTC, View Transitions, scroll-driven animation — always with
  `prefers-reduced-motion` + low-end fallbacks; NEVER permission-prompt on page load.
- **embarrassingly-easy-to-use** — every iteration EASIER than before (adding a step is a
  regression). AI does the work, the user confirms. Zero-config defaults · one obvious primary
  action per screen · ≤3 steps to any outcome · inline guidance not manuals · instant feedback
  + undo · empty states are launchpads · never a dead/doomed control · the user's words.
- **real-time data** — no manual Refresh/Reconcile/Sync buttons; visibility-aware poll /
  WebSocket (Durable Objects) / SSE / optimistic + background reconcile; freshness is invisible.
- **Public front door** — auth walls NEVER sit on `/`. The apex is a public cinematic homepage;
  the OS lives behind `/login` → `os.megabyte.space`.

## Architecture principles

- **CF-native, edge-native, scale-to-zero** — Workers + Workflows + Durable Objects + Queues +
  Workers AI + AI Gateway + Browser Rendering + R2 + D1 + Vectorize + KV before anything
  external. Deep CF lock-in is the feature — no portability layer. AI Gateway (`megabyte-os`)
  on EVERY model call. Durable state in D1/DO/R2; everything scale-to-zero by default.
- **The submodule boundary is LAW** — upstream `cloudflare-os` is PINNED + read-only in
  practice. Enhancements land in starter-owned layers: `deployment.jsonc`, router worker
  `megabyte-os`, `packages/home`, custom gatekeepers (`-custom`), `/admin` branding, `scripts/`.
  A change that needs upstream internals → overlay patch (rebased deliberately in the Upstream
  Sync lane) or an upstream PR — never a blind in-tree edit.
- **Absorbed features are modules** — flag-gated (default-OFF; server 404 when off, UI null),
  Zod at every runtime boundary (env, API in/out, params, forms, webhooks, queues, DO messages,
  AI outputs), one uniform RFC7807 error envelope (`code` + `correlationId` + `errors[]`),
  durable D1/DO/R2 state, reachable in the UI. Built-but-unwired = not done (no orphan code).
- **`deployment.jsonc` is the single config source** — `wrangler.prod.jsonc` files are
  GENERATED + gitignored; never edit them. Custom domains are DECLARATIVE — changing
  `customDomain` detaches the old hostname on the next deploy (treat as a one-way-ish door;
  verify hostnames after).
- **Eliminate architectural drift in-turn** — competing generations (duplicate clients/models/
  schemas, parallel UI primitives): choose the superior direction, migrate usage, delete the
  obsolete one. Never document both approaches forever.

## Testing principles (TDD-first, real journeys)

- Failing test FIRST → watch RED → implement → GREEN. Bug fix = failing regression first. No
  feature without ≥1 test; no fix without ≥1 regression.
- Every major E2E STARTS at `https://megabyte.space`, navigates by CLICKING — never
  `page.goto()` after first load, never a login shortcut where a real flow exists. OS coverage
  authenticates via the `megabyte-os-e2e` service-token headers (Playwright
  `extraHTTPHeaders`); interactive OTP steps = BLOCKED-with-prerequisite, never faked.
- **`verify-prod.mjs` (all-green) is the deploy gate.** Its `/login` assertion sends BROWSER Accept
  headers — the SPA asset fallback once swallowed browser navigations that curl passed;
  `assets.run_worker_first` is the fix and this is its standing regression test.
- Console + network cleanliness gate every flow: `console.error`/`warn`, page exceptions,
  `requestfailed`, unexpected 4xx/5xx/CSP/Trusted-Types = build fail. Empty allowlist is the
  target.
- Deterministic (web-first assertions, condition-based waits, NEVER `waitForTimeout`),
  parallel-safe, stable selectors, 6 breakpoints (375/390/768/1024/1280/1920) × real browsers.
- **WebGL honesty:** assert canvas presence + a settled frame, then VISION-check the
  screenshot — a black canvas with 0 console errors is a lying-pass.
- Reconcile display-vs-store on every data surface (absorbed tables/charts/dashboards
  especially) — ground-truth D1/DO count for the real context vs what the UI shows;
  `groundTruth>0 && display==0` = lying-empty. Causal probe for trackable surfaces (do X →
  store records it → UI shows it).
- Unit tests are real units (no browser, no absurd mocking). Quality > coverage %: 10
  meaningful tests beat 100 trivial ones.

## Documentation & AI-context principles

- Docs ship in the SAME commit as the code; docs for a deleted feature deleted same commit.
- ADR per one-way-door decision (the custom-domain-detach and submodule-bump classes); JSDoc
  (intent, not types) on exports; `ARCHITECTURE.md` current.
- Docs are CURRENT-STATE only — strip history, delete drift; every doc claim matches the code.
- Keep `CLAUDE.md` + the canonical home HIGH-SIGNAL + ACCURATE; a doc naming a fixed issue as
  open is stale — update it. Don't let any always-loaded file become a novel.

## AI-agent principles

- **AI-native, permanently** — AI is the primary developer + a foundational product layer;
  never "AI-optional". When AI can make a surface easier/faster/safer/clearer, ship it.
- **Agentic fan-out/converge** — parallel worktree-isolated agents in ONE message; ≤6-wide
  mutating, read-only sweeps free; fresh 150–300-word briefs, primary deliverable written
  FIRST; the main thread orchestrates + folds + deploys once + verifies, never implements when
  saturated. Never bare `general-purpose` when a specialist fits; Agent Diversity Review gate
  before DONE.
- Contract-first: every model output through a typed schema + repair-or-reject + fallback +
  trace via AI Gateway `megabyte-os`; no raw model text consumed as truth; AI-heavy behavior
  has eval cases + rubrics + regression tracking.
- Prefer tool-calling → registered-component GenUI over free-form chat for AI surfaces; inline/
  no-chat AI beats a bolted-on sidebar.
- Reinforce the VERIFIER leg — gate DONE on executed tests + prod-E2E asserting real content,
  never self-report; MAX_ITERATIONS cap, reflection between retries, kill/reassign after ~3
  stuck iterations, hard token budget.
- **Self-improve at every step** — every fire leaves ≥1 improvement to how future fires run.

## Hygiene & simplicity principles

- **Aggressive toward code, conservative toward required product behavior + data.** Net
  deletion is a success metric when capability is preserved.
- Every significant refactor ENDS with a deletion pass — old implementation, adapters, dead
  flags, unused imports/exports, stale CSS, obsolete tests/docs. No permanent half-migrations.
- KISS · YAGNI · high cohesion / low coupling · single source of truth · boring standard
  framework capabilities · minimal public APIs. Earn every abstraction (write it twice, then
  extract).
- No transient prefixes (`waveN`/`phaseN`) or vibe names in durable identifiers; ONE term per
  concept; kebab files · PascalCase types · CONSTANT_CASE consts.
- No silent regression — compare before/after (build, runtime, bundle, a11y, console, network,
  deps, TS strictness); a justified regression records why. TS strictness is a ratchet.
- No freeform `console.log` — structured JSON logs (`level`, `ts`, `msg`, `traceId`).
- TODOs/FIXMEs in source are allowed roadmap markers (banned in shipped user-visible strings).

## Git & shipping principles

- **main-only, auto-push same turn** — no dev/release/feature branches; worktrees for
  isolation; merge + delete every worktree AND branch the round its work lands; NEVER
  force-push `main`; conventional-commit + gitmoji IS the PR description; never `git add -A`.
- **Submodule discipline** — a `cloudflare-os` pointer move is made ONLY by the Upstream Sync
  lane, deliberately, to a reviewed ref, with `pnpm check` + deploy + all-green in the same fire. Any
  other diff touching the pointer = drift; revert it.
- **Prod is pre-authorized** — gates green → `pnpm deploy` / `pnpm --dir packages/home deploy`
  → `verify-prod.mjs` all-green. ONE fold, ONE build, ONE deploy per fire — agents never build/
  commit/deploy independently. NEVER modify already-set CF secrets.
- Wrangler auth (scoped token lacks Workers scopes — code 10000): `unset CLOUDFLARE_API_TOKEN;
  export CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY)
  CLOUDFLARE_EMAIL=blzalewski@gmail.com CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59`.
- Watch divergence (`git rev-list --left-right --count origin/main...HEAD`) each round; same
  non-`main` branch two rounds running or growing `behind` → integrate to `main` NOW. Salvage
  commits (`git show <branch-tip>`) BEFORE any `git branch -D`.

## Security principles

- **The Access gate is the OS's front line** — org `manhattan.cloudflareaccess.com`, app
  "Megabyte OS", OTP-only IdP + WARP zero-touch, sessions 168h. Never weaken/delete an Access
  app or policy autonomously (destructive tier). Auth walls never on `/`.
- Service tokens for automation ONLY — `megabyte-os-e2e`; secret via `get-secret`, never
  hardcoded/logged; rotate via the Access API if lost.
- No secrets in code; CSP Level 3 strict-dynamic + per-response nonce + Trusted Types on the
  homepage; HSTS + the standard header set; SRI on external scripts.
- Parameterized SQL only in any absorbed D1 feature; Zod-validate + rate-limit public
  endpoints; verify webhook signatures THEN parse; SSRF revalidate every redirect hop.
- **Zone redirect rules run BEFORE Access + Workers** — a redirect can bypass/mask a gate;
  verify the gate after any ruleset change; keep the pre-existing rules.

## Accessibility principles (WCAG 2.2 AA)

- axe-core 0 violations is NECESSARY, not SUFFICIENT — the manual WCAG 2.2 AA criteria (2.4.11,
  2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8) need review every a11y pass.
- Exactly one `<h1>` per view + logical heading order; contrast ≥4.5:1 from tokens (cyan-on-
  black checked); focus-visible rings + focus restored on close; 24px min targets.
- `prefers-reduced-motion` gates ALL motion — WebGL/WebGPU/scroll-driven included, each with a
  gorgeous static fallback. Serious axe/WCAG failures are bugs; a11y is part of E2E.

## Performance principles

- CWV cinematic targets: **LCP ≤2.0s · INP ≤100ms (>200ms = fail) · CLS ≤0.05** — WITH the
  Three.js hero: lazy-init WebGL after first paint, poster/static-first LCP, no long tasks from
  shader compile. Budgets: JS ≤200KB gz/route (Three.js chunk-split + deferred), CSS ≤50KB gz.
- Edge-native: Worker CPU ≤50ms p99; no client-side data waterfalls above the fold; last-write-
  wins cancellation on re-triggerable fetches; AVIF/WebP + `srcset`.
- No orphaned CF resources; rollback-ready (`wrangler rollback` + D1 Time Travel + R2
  versioning); per-request cost stays sane on the hot path.

## Convergence discipline

- ONE coherent slice per workstream per fire — never split a multi-faceted brief into
  one-section-per-turn.
- The queue never runs dry — every fire the discovery/product/E2E roles append deduplicated,
  evidence-backed next-wave tasks to `./BACKLOG.md`; zero-append = under-scan.
- A workstream is DONE only when Acceptance passes + `LEDGER.md` consolidated + no dead refs +
  prod proof. A dimension all-green ≥2 fires ⇒ maintenance-only (healthy no-op).
- Never pure-terminate on a quiet tree — advance the highest standing track (estate path →
  absorption → beautify → docs). Reserve "converged" for the rare fire where every rung has no
  clean next step.
- Category budget (see `./README.md`): 30–40% absorption/product · 15–25% testing/golden-paths
  · 10–20% UX/beautify/a11y · 10–15% architecture/overlay · 5–10% cleanup · 5–10% docs ·
  5–10% discovery · 5% loop-improvement.
- Context budget — main thread NEVER reads giant ledgers wholesale; delegate inventory reads to
  a fresh Explore agent (≤150-line cap).
- Auto-integrate-recs — anything <2h with no design call ships INLINE; the Recs list is only
  for genuine >2h / design-conversation / external-blocker / irreversible items.

## Failure taxonomy vs HARD-STOP (recover vs checkpoint — never conflate)

A worker AGENT failing is normal fan-out attrition — RECOVER + keep the loop running. The LEAD
(orchestrator) failing is the ONLY checkpoint trigger. Treating an agent's transient death as
the session HARD-STOP wrongly checkpoints a healthy loop.

- **Transient single-agent failure → RECOVER, keep the loop running.** ONE agent hits
  ECONNRESET / a network drop returns `subagent_tokens:0` for that one agent / one agent's
  output is cut off mid-stream. This is attrition, not saturation. Do NOT checkpoint. Instead:
  (1) **salvage its work FIRST** — if the agent pushed/committed, `git show <branch-tip>`
  BEFORE deleting the worktree branch; cherry-pick any COMPLETE, verified commit (never
  `git branch -D` an agent's branch unshown); (2) **re-queue** its unfinished slice as a
  `BACKLOG.md` item; (3) **continue** the fire with the remaining agents. Never re-fan-out for
  repair — fix-forward or ONE targeted agent.
- **Genuine LEAD saturation → THEN checkpoint to a fresh session.** The ORCHESTRATOR itself
  hits "Prompt is too long", an autocompact-thrashing notice fires on the LEAD (context
  refilled to the limit within a few turns, repeatedly), or the main thread can no longer
  spawn. THIS is the HARD STOP: checkpoint to `progress.md` + continue in a FRESH session.
  Never retry in place.
- **Rule of thumb:** an *agent* failing is expected + recoverable (salvage + re-queue +
  continue); the *lead* failing is the only signal to checkpoint. Read WHICH thing failed
  before deciding.

## Deep UI Explorer / Visual Intelligence (role 17 — invariants)

Full role contract: `.claude/commands/run-the-loop.md` §1.17. The invariants that never bend:

- **Honest coverage semantics.** Preferred provider = Cloudflare Browser Rendering via CDP with
  recorded provider + session id. Browserbase/local Chromium = `FALLBACK`; missing credential,
  failed Access handshake, OTP-interactive step = `BLOCKED` with the exact missing
  prerequisite. None of these ever reports as passed coverage — the run manifest is the receipt.
- **States, not URLs.** Both surfaces are graphs: route · auth context · panel · tab · nested
  subview · open menu/overlay · scroll region · flag/data condition. One settled screenshot
  after EVERY meaningful action; prev-state id recorded so reviewers compare before/after. The
  coverage ledger (`e2e/deep-ui-explorer/coverage-ledger.json`) is the resumable cursor.
- **Real vision on every capture, honestly.** Every screenshot gets a schema-validated verdict
  from an actual vision model via AI Gateway `megabyte-os` (Workers AI, keyless); reviewer
  failures are recorded, never silently skipped; a clean screen with zero findings is a valid
  result — manufacturing defects is a violation. Architecture claims from pixels stay
  HYPOTHESES until source + store inspection confirms them. Scores flow into
  `.claude/modifier-matrix.json`.
- **Read-only discovery; same-fire repair by owners.** The explorer never mutates product code
  mid-pass. Confirmed findings hand off as reproducible state paths; the owning role fixes via
  RED → root cause → GREEN → replay the exact breadcrumb → re-capture → continue.
- **Privacy at the boundary.** Service-token secrets + cookies + token-shaped strings scrubbed
  from any context leaving the machine; artifacts stay in gitignored run dirs.

## Fire mutual exclusion (the lease)

`.claude/run-the-loop/.fire-lease.json` serializes fires: claim at orient (a LIVE lease,
heartbeat <20 min → coalesce this tick), heartbeat per phase, release (delete) at reconcile. A
stale lease (heartbeat >20 min) is reclaimed — a dead lead never wedges the loop. If a ported
`scripts/loop-fire-lock.mjs` exists, prefer it (exit 3 = coalesce). One fire at a time means
one browser fleet, one deploy stream, no conflicting commits.

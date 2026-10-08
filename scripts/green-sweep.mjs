#!/usr/bin/env node
/**
 * green-sweep (fire-100): the loop's periodic COHERENCE CHECKPOINT. Runs every prod verifier/journey
 * in sequence against PROD and reports a single pass/fail tally — catches silent cross-fire
 * regressions that no single-surface fire would notice. Run it every few fires (and before declaring
 * a milestone). Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD); exits nonzero if any check fails.
 *
 * Usage: BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD) node scripts/green-sweep.mjs
 *
 * `--static` (fire-270): run ONLY the secret-free, no-browser drift gates (the check-* preamble +
 * verify-resources-launchpad) — ~15s, no BA creds, no prod. WHY: the full sweep is minutes + browser,
 * so it runs only "every few fires" — and a shipped-but-unwired verifier (fire-270: verify-autorag
 * sat SIX fires outside the net) slips past until the next full sweep. The static subset is cheap
 * enough to run EVERY fire at §11, so coverage/a11y-coverage/ledger/types/gate drift is caught the
 * SAME fire it lands. Exits nonzero if any static gate fails (same tally contract as the full sweep).
 */
import { spawn } from 'node:child_process'

const STATIC_ONLY = process.argv.includes('--static')

// The full sweep's browser verifiers need the ba-e2e session; the static subset does not.
if (!STATIC_ONLY && (!process.env.BA_E2E_EMAIL || !process.env.BA_E2E_PASSWORD)) {
  console.log('missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)')
  process.exit(2)
}

// [script, args, the substring that means PASS in its tail output].
//
// This is a CURATED core gate, not every verify-*.mjs on disk — it covers the force-login/auth
// invariant, the live user-facing OS surfaces (Pulse, Connections, Gadgets, Models), a11y in both
// themes, and the long + deep journeys. Deliberately OUT: historical/pre-WS-11 checks (verify-apex*,
// verify-os.mjs/-theme/-landing [stale; verify-os-screens is the NEW comprehensive load gate — kept IN],
// *-cyan, icon-gradients), specialized one-offs run on demand (verify-seo, verify-cwv/
// vitals/apex-cwv perf probes, verify-links, verify-reduced-motion, verify-ba-flip), and the deeper
// per-surface Models checks (default/detail/filter — catalog represents the surface here). Add a check
// here when a NEW user-facing surface/invariant ships; keep it fast + reliable. (fire-112 coverage audit.)
const CHECKS = [
  ['check-provider-policy.mjs', [], 'PROVIDER-POLICY GREEN'], // STATIC GATE: no internal Anthropic/OpenAI API calls or SDK imports in scripts/+.claude/ (agent-provider-policy SSOT; AGENTS.md) — fast/static preamble
  ['check-a11y-coverage.mjs', [], 'A11Y-COVERAGE GREEN'], // DRIFT GATE (fire-151): every fork static route is in verify-a11y's list — fast/static preamble so a new surface can't ship a11y-unaudited (fire-103/117/146/147 class)
  ['check-greensweep-coverage.mjs', [], 'GREENSWEEP-COVERAGE GREEN'], // DRIFT GATE (fire-261): every WS-DEMO surface verifier is wired into THIS sweep — a surface that shipped+deployed but whose verifier died outside green-sweep silently left the regression net (caught fire-257 /search + fire-260 /budgets retroactively)
  ['verify-resources-launchpad.mjs', [], 'RESOURCES-LAUNCHPAD GREEN'], // DRIFT GATE (fire-223): the in-editor Resources launchpad (GadgetEditor→ResourcesPanel) — every "View →" route resolves + stays in sync with /admin PLATFORM_FEATURES + 50-card floor. Static/secret-free preamble; fills the launchpad-had-no-verifier gap (verify-demo-surfaces covers the RAIL, not this)
  ['check-ledger-current.mjs', [], 'every recent feat/fix commit is cited'], // DRIFT GATE (fire-226): a feat/fix committed to main but never cited in LEDGER.md = the committed-feature-without-bookkeeping class (fire-224/225). check-fire-committed only sees DIRTY files; a cleanly-committed-but-unledgered feat leaves a CLEAN tree. Static/secret-free preamble
  ['check-scripts-types.mjs', [], 'SCRIPTS-TYPES GREEN'], // DRIFT GATE (fire-236): scripts/ (the loop's own tooling + *.test.ts) type-checks clean. `pnpm check` + green-sweep never ran types:scripts, so a RED hid for fires ~230-235 (backlog-frontier/loop-fire-lock test types drifted). Static/secret-free preamble
  ['check-stale-copy.mjs', [], 'stale-copy: clean'], // DRIFT GATE (fire-3, WIRED fire-241): retired-stack/slop terms in apex user-visible copy are un-shippable (the "Authentik SSO" live regression no console/axe/screenshot gate caught). Static/secret-free preamble — was ORPHANED (referenced by NO runner) from creation until the fire-241 gate-coverage meta-gate caught it
  ['check-gate-coverage.mjs', [], 'GATE-COVERAGE GREEN'], // META DRIFT GATE (fire-241, §8): every check-*.mjs pass/fail gate is wired into a runner (green-sweep/package.json) or explicitly allowlisted as a standalone orient/§11/discovery tool — so a gate can't be orphaned (written but invoked by nobody) again, the class that hid check-stale-copy. Static/secret-free preamble
  ['check-fork-tests.mjs', [], 'FORK-TESTS OK'], // RATCHET (fire-246, WIRED fire-247): the cloudflare-os fork vitest (~886 tests) — fail-count must not EXCEED baseline(9: known-red useAuth.test.tsx jsdom localStorage, BACKLOG WS-FORK-TESTS). Catches a NEW red fork UNIT that otherwise ships INVISIBLY (nothing else runs fork vitest). Secret-free, ~14s, SERIAL (CPU-bound vitest)
  ['verify-prod.mjs', [], 'assertions green'],
  ['verify-anon-console.mjs', [], 'did not leak pre-login'], // force-login/anon invariant (Brian, fire-90)
  ['verify-login-gate.mjs', [], 'LOGIN-GATE GREEN'], // anon first-load HTML IS the full-screen login (Google+GitHub+magic-link+email/pw); authed gets the SPA (Brian 2026-10-06)
  ['verify-os-screens.mjs', [], 'ALL OS SCREENS LOAD'], // every static OS route loads authed, 0 console errors (Brian 2026-10-06 "make sure all screens can load") — net-new comprehensive load gate
  ['verify-home-composer.mjs', [], '0 console errors'], // the value-path ENTRY — read-only (fire-114)
  ['verify-pulse.mjs', [], '0 console errors'],
  ['verify-pulse-persist.mjs', [], '0 console errors'],
  ['verify-pulse-snooze.mjs', [], '0 console errors'],
  ['verify-cmdk.mjs', [], '0 console errors'],
  ['verify-connections.mjs', [], '0 console errors'],
  ['verify-cost-strip.mjs', [], '0 console errors'],
  ['verify-gadgets-table.mjs', [], '0 console errors'],
  ['verify-resources-panel.mjs', [], 'RESOURCES-PANEL GREEN'], // BROWSER proof (fire-224): the in-editor Resources launchpad RENDERS — open a workspace, click the Resources tab, assert ≥50 cards VISIBLE + 0 console errors (the browser companion to the STATIC verify-resources-launchpad gate)
  ['verify-gadget-pin.mjs', [], '0 console errors'],
  ['verify-gadget-rename.mjs', [], '0 console errors'],
  ['verify-gadget-delete.mjs', [], '0 console errors'],
  ['verify-models-catalog.mjs', [], 'console-error-free'], // the Models surface (fire-112 — was uncovered)
  ['verify-demo-surfaces.mjs', [], 'DEMO-SURFACES GREEN'], // WS-DEMO coming-soon surfaces (Goals, Automations, …) reachable via rail + render (fire-130/133)
  ['verify-analytics.mjs', [], 'ANALYTICS GREEN'], // WS-DEMO Analytics dashboard: reachable via rail + full dashboard renders (fire-146)
  ['verify-activity.mjs', [], 'ACTIVITY GREEN'], // WS-DEMO Activity & Approvals: reachable + renders + HITL Approve is interactive (fire-147)
  ['verify-customers.mjs', [], 'CUSTOMERS GREEN'], // WS-DEMO Customers/People CRM: reachable + renders + row→timeline drill-in (fire-148/149, wired fire-150)
  ['verify-inbox.mjs', [], 'INBOX GREEN'], // WS-DEMO Inbox: reachable + renders + row→thread drill-in (fire-153)
  ['verify-booking.mjs', [], 'BOOKING GREEN'], // WS-DEMO Booking: reachable + renders + appt→detail drill-in (fire-154)
  ['verify-releases.mjs', [], 'RELEASES GREEN'], // WS-DEMO Releases: reachable + renders + release→detail drill-in + rollback (fire-155)
  ['verify-browser-runs.mjs', [], 'BROWSER-RUNS GREEN'], // WS-DEMO Browser Runs: reachable + renders + run→trace drill-in + HITL (fire-156)
  ['verify-billing.mjs', [], 'BILLING GREEN'], // WS-DEMO Billing: reachable + live usage card + sample cost breakdown (fire-157)
  ['verify-experiments.mjs', [], 'EXPERIMENTS GREEN'], // WS-DEMO Experiments: reachable + variant breakdown + ship-winner (fire-158)
  ['verify-forms.mjs', [], 'FORMS GREEN'], // WS-DEMO Forms: reachable + submissions + lead tiers + form→submissions drill-in (fire-159)
  ['verify-audit.mjs', [], 'AUDIT GREEN'], // WS-DEMO Audit: reachable + category scores + findings + target→breakdown drill-in + re-run (fire-163)
  ['verify-logs.mjs', [], 'LOGS GREEN'], // WS-DEMO Logs: reachable + stat strip + level-filter/search narrow + live toggle (fire-166)
  ['verify-domains.mjs', [], 'DOMAINS GREEN'], // WS-DEMO Domains: reachable + status-filter/search narrow + add-domain composer (fire-168)
  ['verify-queues.mjs', [], 'QUEUES GREEN'], // WS-DEMO Queues: reachable + status-filter/search narrow + queue→detail drill-in + retry-failed (fire-169)
  ['verify-secrets.mjs', [], 'SECRETS GREEN'], // WS-DEMO Secrets: reachable + scope-filter/search narrow + rotate + add-secret composer (fire-170)
  ['verify-storage.mjs', [], 'STORAGE GREEN'], // WS-DEMO Storage: reachable + type-filter/search narrow + store→detail drill-in + D1→database link (fire-171)
  ['verify-images.mjs', [], 'IMAGES GREEN'], // WS-DEMO Images (Cloudflare Images): reachable + format-filter narrows gallery + detail named variants + the TRANSFORM PLAYGROUND rewrites the flexible-variant URL live (fire-278 created /images; fire-279 shipped the playground + this dedicated verifier — it was riding only verify-demo-surfaces)
  ['verify-compute.mjs', [], 'COMPUTE GREEN'], // WS-DEMO Compute: reachable + status-filter/search narrow + worker→detail drill-in + logs link (fire-172)
  ['verify-metrics.mjs', [], 'METRICS GREEN'], // WS-DEMO Metrics: reachable + metric-toggle + gadget-select re-draw the chart + cross-links (fire-173)
  ['verify-permissions.mjs', [], 'PERMISSIONS GREEN'], // WS-DEMO Permissions: reachable + role-filter/search narrow + invite composer + capability matrix + activity link (fire-174)
  ['verify-provenance.mjs', [], 'PROVENANCE GREEN'], // WS-DEMO Provenance: reachable + action-filter/search narrow + before→after diffs + activity/releases links (fire-175)
  ['verify-workflows.mjs', [], 'WORKFLOWS GREEN'], // WS-DEMO Workflows: reachable + status-filter/search narrow + workflow→detail step-pipeline drill-in + triggers link (fire-176)
  ['verify-automations.mjs', [], 'AUTOMATIONS GREEN'], // WS-DEMO + DEPTH Automations: reachable + composer adds a row + live listGatekeeperVendors band (fire-220)
  ['verify-ai-gateway.mjs', [], 'AI-GATEWAY GREEN'], // WS-DEMO AI Gateway: reachable + provider-filter/search narrow + cached chips + Models/Costs links (fire-177)
  ['verify-vectorize.mjs', [], 'VECTORIZE GREEN'], // WS-DEMO Vectorize: reachable + metric-filter/search narrow + index→detail sample-query matches drill-in + knowledge link (fire-178)
  ['verify-durable-objects.mjs', [], 'DURABLE-OBJECTS GREEN'], // WS-DEMO Durable Objects: reachable + status-filter/search narrow + namespace→detail instances drill-in + storage/compute links (fire-179)
  ['verify-email.mjs', [], 'EMAIL GREEN'], // WS-DEMO Email: reachable + status-filter/search narrow + masked recipients + inbox/logs links (fire-180)
  ['verify-social.mjs', [], 'SOCIAL GREEN'], // WS-DEMO Social (auto-scheduler post-queue): reachable + platform-filter/search narrow + schedule composer + publish-now (fire-254)
  ['verify-notifications.mjs', [], 'NOTIFICATIONS GREEN'], // WS-DEMO Notifications: reachable + type-filter/search narrow + send-test + activity link (fire-181)
  ['verify-environments.mjs', [], 'ENVIRONMENTS GREEN'], // WS-DEMO Environments (Coder governance): reachable + lifecycle-filter/search narrow + stop-idle action + compute link (fire-182)
  ['verify-approvals.mjs', [], 'APPROVALS GREEN'], // WS-DEMO Approvals (HITL governance queue): reachable + kind-filter/search narrow + per-item approve + auto-approve-low-risk + activity link (fire-183)
  ['verify-approval-bus.mjs', [], 'APPROVAL-BUS GREEN'], // WS-N1 DURABLE APPROVAL BUS (fire-230/231): the LIVE round-trip — Pulse 'Require approval' → /approvals live band → approve → STAYS gone after hard-reload (durable UserDO removal). Non-polluting (drains ba-e2e in a finally). The DEPTH companion to verify-approvals (sample queue)
  ['verify-tasks.mjs', [], 'TASKS GREEN'], // WS-DEMO Tasks (work-tracker primitive): reachable + status-filter/search narrow + per-row retry + retry-failed bulk + activity link (fire-184)
  ['verify-tools.mjs', [], 'TOOLS GREEN'], // WS-DEMO Tools (capability registry, §30 chain): reachable + category-filter/search narrow + enable/disable toggle + live connection count + connections link (fire-185)
  ['verify-presence.mjs', [], 'PRESENCE GREEN'], // WS-DEMO Presence (live activity manifest, §47): reachable + kind-filter/search narrow + self-status toggle + activity link (fire-186)
  ['verify-analytics-engine.mjs', [], 'ANALYTICS-ENGINE GREEN'], // WS-DEMO Analytics Engine (raw CF telemetry): reachable + category-filter/search narrow + SQL-over-events panel + analytics link (fire-192)
  ['verify-hyperdrive.mjs', [], 'HYPERDRIVE GREEN'], // WS-DEMO Hyperdrive (external DB pool/cache): reachable + engine-filter/search narrow + caching toggle + masked hosts + database link (fire-193)
  ['verify-realtime.mjs', [], 'REALTIME GREEN'], // WS-DEMO Realtime (WebRTC SFU calls, §56-58): reachable + status-filter/search narrow + end-call action + presence link (fire-194)
  ['verify-sandboxes.mjs', [], 'SANDBOXES GREEN'], // WS-DEMO Sandboxes (isolated code execution T3, §7/§12): reachable + language-filter/search narrow + kill action + compute link (fire-195)
  ['verify-mcp.mjs', [], 'MCP GREEN'], // WS-DEMO MCP Servers (capability portability layer, #30/#67): reachable + transport-filter/search narrow + enable/disable toggle + tools link (fire-196)
  ['verify-research.mjs', [], 'RESEARCH GREEN'], // WS-DEMO Research (Manus parallel research→synthesize): reachable + status-filter/search narrow + cancel action + agents link (fire-197)
  ['verify-knowledge.mjs', [], 'KNOWLEDGE GREEN'], // WS-DEMO Knowledge (Onyx live/synced layer, #33 view 2): reachable + scope-filter/search narrow + resync action + context/connections links (fire-198)
  ['verify-skills.mjs', [], 'SKILLS GREEN'], // WS-DEMO Agent Skills (reusable-skill registry, #29): reachable + category-filter/search narrow + enable/disable toggle + tools/agents links (fire-199)
  ['verify-artifacts.mjs', [], 'ARTIFACTS GREEN'], // WS-DEMO Artifacts (explorable canvas w/ variants): reachable + type-filter/search narrow + next-variant stepper + outputs/gadgets links (fire-200)
  ['verify-sources.mjs', [], 'SOURCES GREEN'], // WS-DEMO Sources (sync-connector manifest behind Knowledge): reachable + kind-filter/search narrow + sync-now action + knowledge/connections links (fire-201)
  ['verify-database.mjs', [], 'DATABASE GREEN'], // WS-DEMO Database Studio: reachable + renders + table→schema drill-in + row-detail Dialog + FK drill-through to the related record (fire-148/149, verifier+wiring fire-150, row-detail+FK drill-through fire-270)
  ['verify-budgets.mjs', [], 'BUDGETS GREEN'], // WS-DEMO Budgets (cost-governance: spend caps + per-scope quotas, a NORTH-STAR primitive distinct from /billing): reachable + scope-filter/search narrow + add-budget composer + surfaceAccent over/near row borders (fire-259/260, verifier+wiring fire-261)
  ['verify-search.mjs', [], 'SEARCH GREEN'], // WS-DEMO Search (universal content search over 6 types, FTS5/BM25-style): reachable + query/type-chip narrow + <mark> term-highlight (fire-257; the check-greensweep-coverage gate caught this strand too — wiring fire-261)
  ['verify-autorag.mjs', [], 'AUTORAG GREEN'], // WS-DEMO AutoRAG (Cloudflare AI Search / managed RAG: ask→cited-answer + index registry, distinct from /vectorize + /search + /knowledge): reachable + ask swaps cited answer + status/search narrow + accent borders + citation drill-in + stat micro-viz footers (fire-264-269; the check-greensweep-coverage gate caught this 6-fire strand retroactively — wiring fire-270)
  ['verify-a11y.mjs', [], '0 serious'],
  ['verify-a11y.mjs', ['--light'], '0 serious'],
  ['journey-os-nav.mjs', [], 'GOLDEN-PATH GREEN'],
  ['journey-deep.mjs', [], 'DEEP-JOURNEY GREEN'],
  ['journey-responsive.mjs', [], 'RESPONSIVE GREEN'],
  ['journey-keyboard.mjs', [], '0 console errors'],
  ['journey-editor.mjs', [], 'EDITOR-JOURNEY GREEN'], // the fullscreen editor: tab-switch + nav-away + hard-refresh persistence (fire-121)
  ['journey-interconnect.mjs', [], 'INTERCONNECT-JOURNEY GREEN'], // the WS-DEMO surface web: hard-refresh resilience (8 routes) + cross-link navigation lands on rendered destinations (6 links) (fire-191)
]

// PARALLELIZED (fire-161): the sweep grew to 34 checks and, run sequentially, exceeded ~10 min — too
// slow to be a usable gate + flake-fragile when run unattended. Now: the SERIAL group (the fast static
// preamble + the 5 MUTATION verifiers that write shared ba-e2e state — pulse dismissals/snoozes +
// gadget pin/name/existence) runs FIRST, one at a time (racing them would corrupt the state they
// assert on + the reads below). Then the read-only group runs in a BOUNDED CONCURRENCY POOL. Serial-
// then-parallel also means mutations finish + RESTORE state before any parallel read sees it. ~3-4 min.
const SERIAL = new Set([
  'check-a11y-coverage.mjs',
  'check-greensweep-coverage.mjs', // static drift gate (fire-261) — fast preamble, no shared state
  'check-fork-tests.mjs', // CPU-bound vitest (~14s) — SERIAL so it never races the browser journeys (CPU contention → flakes)
  'verify-pulse-persist.mjs',
  'verify-pulse-snooze.mjs',
  'verify-gadget-pin.mjs',
  'verify-gadget-rename.mjs',
  'verify-gadget-delete.mjs',
])
const CONCURRENCY = 4 // 6 overloaded the machine (87% CPU → journey flakes); 4 is the stable sweet spot

// The secret-free, no-browser, no-prod drift gates (lines 28-36's preamble + the static launchpad
// gate). `--static` runs ONLY these — a ~15s subset the loop runs EVERY fire at §11 so coverage/
// a11y-coverage/ledger/types/stale-copy/gate drift (and a newly-shipped verifier that forgot to wire
// into the sweep) is caught the SAME fire, not whenever the minutes-long full sweep next runs (fire-270).
const STATIC = new Set([
  'check-provider-policy.mjs',
  'check-a11y-coverage.mjs',
  'check-greensweep-coverage.mjs',
  'verify-resources-launchpad.mjs',
  'check-ledger-current.mjs',
  'check-scripts-types.mjs',
  'check-stale-copy.mjs',
  'check-gate-coverage.mjs',
  'check-fork-tests.mjs',
])
// When --static, only the secret-free gates run; otherwise the whole curated sweep.
const activeChecks = STATIC_ONLY ? CHECKS.filter((c) => STATIC.has(c[0])) : CHECKS

// Run one check once (async spawn); pass = exit 0 AND the needle is in its output.
function runOnce(script, args, needle) {
  return new Promise((resolve) => {
    const child = spawn('node', [`scripts/${script}`, ...args])
    let out = ''
    const onData = (d) => { out += d.toString() }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    const timer = setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, 180000)
    child.on('close', (code) => { clearTimeout(timer); resolve({ pass: code === 0 && out.includes(needle), code }) })
    child.on('error', () => { clearTimeout(timer); resolve({ pass: false, code: -1 }) })
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// One check with a single DELAYED retry on failure: the immediate post-deploy sweep routinely trips a
// FRESH-DEPLOY first-load flake (unrelated surfaces red once, green moments later — fire-115/140/153+).
// The flake window outlasts a back-to-back retry (fire-156), so wait ~4s first. Absorbs the transient
// without hiding a real regression (a genuinely-broken surface fails both times). ⟳ = flaked-then-passed.
async function runWithRetry([script, args, needle]) {
  let res = await runOnce(script, args, needle)
  let retried = false
  if (!res.pass) { retried = true; await sleep(4000); res = await runOnce(script, args, needle) }
  return { pass: res.pass, code: res.code, retried: retried && res.pass }
}

const labelOf = ([script, args]) => `${script}${args.length ? ' ' + args.join(' ') : ''}`
const logResult = (lbl, r) => console.log(`${r.pass ? (r.retried ? '✅⟳' : '✅') : '❌'} ${lbl}${r.pass ? '' : `  (exit ${r.code}, failed twice)`}`)

const results = []
const serialChecks = activeChecks.filter((c) => SERIAL.has(c[0]))
const parallelChecks = activeChecks.filter((c) => !SERIAL.has(c[0]))

// 1) Serial group (static preamble + mutations) — in order, no racing. Restores shared state.
for (const c of serialChecks) {
  const r = await runWithRetry(c)
  results.push({ label: labelOf(c), ...r })
  logResult(labelOf(c), r)
}

// 2) Read-only group — bounded concurrency pool.
let next = 0
async function worker() {
  while (next < parallelChecks.length) {
    const c = parallelChecks[next++]
    const r = await runWithRetry(c)
    results.push({ label: labelOf(c), ...r })
    logResult(labelOf(c), r)
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, parallelChecks.length) }, worker))

const passed = results.filter((r) => r.pass).length
console.log(`\n${passed}/${activeChecks.length} checks green`)
if (passed !== activeChecks.length) {
  console.log('FAILED: ' + results.filter((r) => !r.pass).map((r) => r.label).join(', '))
  process.exit(1)
}
console.log(
  STATIC_ONLY
    ? '✅ GREEN-SWEEP (static): all secret-free drift gates pass — coverage, a11y-coverage, ledger, types, stale-copy, gate-coverage, fork-tests.'
    : '✅ GREEN-SWEEP: the whole OS is coherent (every verifier + journey + a11y both themes).',
)

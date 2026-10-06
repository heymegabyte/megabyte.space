#!/usr/bin/env node
/**
 * green-sweep (fire-100): the loop's periodic COHERENCE CHECKPOINT. Runs every prod verifier/journey
 * in sequence against PROD and reports a single pass/fail tally — catches silent cross-fire
 * regressions that no single-surface fire would notice. Run it every few fires (and before declaring
 * a milestone). Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD); exits nonzero if any check fails.
 *
 * Usage: BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD) node scripts/green-sweep.mjs
 */
import { spawn } from 'node:child_process'

if (!process.env.BA_E2E_EMAIL || !process.env.BA_E2E_PASSWORD) {
  console.log('missing BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD)')
  process.exit(2)
}

// [script, args, the substring that means PASS in its tail output].
//
// This is a CURATED core gate, not every verify-*.mjs on disk — it covers the force-login/auth
// invariant, the live user-facing OS surfaces (Pulse, Connections, Gadgets, Models), a11y in both
// themes, and the long + deep journeys. Deliberately OUT: historical/pre-WS-11 checks (verify-apex*,
// verify-os*, *-cyan, icon-gradients), specialized one-offs run on demand (verify-seo, verify-cwv/
// vitals/apex-cwv perf probes, verify-links, verify-reduced-motion, verify-ba-flip), and the deeper
// per-surface Models checks (default/detail/filter — catalog represents the surface here). Add a check
// here when a NEW user-facing surface/invariant ships; keep it fast + reliable. (fire-112 coverage audit.)
const CHECKS = [
  ['check-a11y-coverage.mjs', [], 'A11Y-COVERAGE GREEN'], // DRIFT GATE (fire-151): every fork static route is in verify-a11y's list — fast/static preamble so a new surface can't ship a11y-unaudited (fire-103/117/146/147 class)
  ['verify-prod.mjs', [], 'assertions green'],
  ['verify-anon-console.mjs', [], 'did not leak pre-login'], // force-login/anon invariant (Brian, fire-90)
  ['verify-home-composer.mjs', [], '0 console errors'], // the value-path ENTRY — read-only (fire-114)
  ['verify-pulse.mjs', [], '0 console errors'],
  ['verify-pulse-persist.mjs', [], '0 console errors'],
  ['verify-pulse-snooze.mjs', [], '0 console errors'],
  ['verify-cmdk.mjs', [], '0 console errors'],
  ['verify-connections.mjs', [], '0 console errors'],
  ['verify-cost-strip.mjs', [], '0 console errors'],
  ['verify-gadgets-table.mjs', [], '0 console errors'],
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
  ['verify-compute.mjs', [], 'COMPUTE GREEN'], // WS-DEMO Compute: reachable + status-filter/search narrow + worker→detail drill-in + logs link (fire-172)
  ['verify-metrics.mjs', [], 'METRICS GREEN'], // WS-DEMO Metrics: reachable + metric-toggle + gadget-select re-draw the chart + cross-links (fire-173)
  ['verify-permissions.mjs', [], 'PERMISSIONS GREEN'], // WS-DEMO Permissions: reachable + role-filter/search narrow + invite composer + capability matrix + activity link (fire-174)
  ['verify-provenance.mjs', [], 'PROVENANCE GREEN'], // WS-DEMO Provenance: reachable + action-filter/search narrow + before→after diffs + activity/releases links (fire-175)
  ['verify-workflows.mjs', [], 'WORKFLOWS GREEN'], // WS-DEMO Workflows: reachable + status-filter/search narrow + workflow→detail step-pipeline drill-in + triggers link (fire-176)
  ['verify-ai-gateway.mjs', [], 'AI-GATEWAY GREEN'], // WS-DEMO AI Gateway: reachable + provider-filter/search narrow + cached chips + Models/Costs links (fire-177)
  ['verify-database.mjs', [], 'DATABASE GREEN'], // WS-DEMO Database Studio: reachable + renders + table→schema drill-in (fire-148/149, verifier+wiring fire-150)
  ['verify-a11y.mjs', [], '0 serious'],
  ['verify-a11y.mjs', ['--light'], '0 serious'],
  ['journey-os-nav.mjs', [], 'GOLDEN-PATH GREEN'],
  ['journey-deep.mjs', [], 'DEEP-JOURNEY GREEN'],
  ['journey-responsive.mjs', [], 'RESPONSIVE GREEN'],
  ['journey-keyboard.mjs', [], '0 console errors'],
  ['journey-editor.mjs', [], 'EDITOR-JOURNEY GREEN'], // the fullscreen editor: tab-switch + nav-away + hard-refresh persistence (fire-121)
]

// PARALLELIZED (fire-161): the sweep grew to 34 checks and, run sequentially, exceeded ~10 min — too
// slow to be a usable gate + flake-fragile when run unattended. Now: the SERIAL group (the fast static
// preamble + the 5 MUTATION verifiers that write shared ba-e2e state — pulse dismissals/snoozes +
// gadget pin/name/existence) runs FIRST, one at a time (racing them would corrupt the state they
// assert on + the reads below). Then the read-only group runs in a BOUNDED CONCURRENCY POOL. Serial-
// then-parallel also means mutations finish + RESTORE state before any parallel read sees it. ~3-4 min.
const SERIAL = new Set([
  'check-a11y-coverage.mjs',
  'verify-pulse-persist.mjs',
  'verify-pulse-snooze.mjs',
  'verify-gadget-pin.mjs',
  'verify-gadget-rename.mjs',
  'verify-gadget-delete.mjs',
])
const CONCURRENCY = 4 // 6 overloaded the machine (87% CPU → journey flakes); 4 is the stable sweet spot

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
const serialChecks = CHECKS.filter((c) => SERIAL.has(c[0]))
const parallelChecks = CHECKS.filter((c) => !SERIAL.has(c[0]))

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
console.log(`\n${passed}/${CHECKS.length} checks green`)
if (passed !== CHECKS.length) {
  console.log('FAILED: ' + results.filter((r) => !r.pass).map((r) => r.label).join(', '))
  process.exit(1)
}
console.log('✅ GREEN-SWEEP: the whole OS is coherent (every verifier + journey + a11y both themes).')

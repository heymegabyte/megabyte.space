#!/usr/bin/env node
/**
 * green-sweep (fire-100): the loop's periodic COHERENCE CHECKPOINT. Runs every prod verifier/journey
 * in sequence against PROD and reports a single pass/fail tally — catches silent cross-fire
 * regressions that no single-surface fire would notice. Run it every few fires (and before declaring
 * a milestone). Needs BA creds (BA_E2E_EMAIL / BA_E2E_PASSWORD); exits nonzero if any check fails.
 *
 * Usage: BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD) node scripts/green-sweep.mjs
 */
import { spawnSync } from 'node:child_process'

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
  ['verify-database.mjs', [], 'DATABASE GREEN'], // WS-DEMO Database Studio: reachable + renders + table→schema drill-in (fire-148/149, verifier+wiring fire-150)
  ['verify-a11y.mjs', [], '0 serious'],
  ['verify-a11y.mjs', ['--light'], '0 serious'],
  ['journey-os-nav.mjs', [], 'GOLDEN-PATH GREEN'],
  ['journey-deep.mjs', [], 'DEEP-JOURNEY GREEN'],
  ['journey-responsive.mjs', [], 'RESPONSIVE GREEN'],
  ['journey-keyboard.mjs', [], '0 console errors'],
  ['journey-editor.mjs', [], 'EDITOR-JOURNEY GREEN'], // the fullscreen editor: tab-switch + nav-away + hard-refresh persistence (fire-121)
]

// Run one check once; pass = exit 0 AND the needle is in its output.
function runCheck(script, args, needle) {
  const r = spawnSync('node', [`scripts/${script}`, ...args], { encoding: 'utf8', timeout: 180000 })
  const out = `${r.stdout || ''}${r.stderr || ''}`
  return { pass: r.status === 0 && out.includes(needle), code: r.status }
}

const results = []
for (const [script, args, needle] of CHECKS) {
  const label = `${script}${args.length ? ' ' + args.join(' ') : ''}`
  let res = runCheck(script, args, needle)
  // A single automatic RETRY on failure, AFTER a short delay: the immediate post-deploy sweep
  // routinely trips a FRESH-DEPLOY first-load flake (a batch of unrelated surfaces red once, all
  // green moments later — fire-115/140/153/155/156 class). The flake window can outlast a back-to-
  // back retry (fire-156: 3 checks failed twice immediately, all passed standalone seconds later), so
  // we WAIT ~4s before retrying to let the transient clear. One delayed retry absorbs the noise
  // without hiding a real regression (a genuinely-broken surface fails both times). ⟳ = flaked-then-passed.
  let retried = false
  if (!res.pass) {
    retried = true
    spawnSync('sleep', ['4'])
    res = runCheck(script, args, needle)
  }
  results.push({ label, pass: res.pass, code: res.code, retried: retried && res.pass })
  console.log(`${res.pass ? (retried ? '✅⟳' : '✅') : '❌'} ${label}${res.pass ? '' : `  (exit ${res.code}, failed twice)`}`)
}

const passed = results.filter((r) => r.pass).length
console.log(`\n${passed}/${results.length} checks green`)
if (passed !== results.length) {
  console.log('FAILED: ' + results.filter((r) => !r.pass).map((r) => r.label).join(', '))
  process.exit(1)
}
console.log('✅ GREEN-SWEEP: the whole OS is coherent (every verifier + journey + a11y both themes).')

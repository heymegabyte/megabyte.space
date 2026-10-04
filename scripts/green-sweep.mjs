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
  ['verify-goals.mjs', [], 'GOALS GREEN'], // WS-DEMO Goals surface — reachable via rail + renders (fire-130)
  ['verify-a11y.mjs', [], '0 serious'],
  ['verify-a11y.mjs', ['--light'], '0 serious'],
  ['journey-os-nav.mjs', [], 'GOLDEN-PATH GREEN'],
  ['journey-deep.mjs', [], 'DEEP-JOURNEY GREEN'],
  ['journey-responsive.mjs', [], 'RESPONSIVE GREEN'],
  ['journey-keyboard.mjs', [], '0 console errors'],
  ['journey-editor.mjs', [], 'EDITOR-JOURNEY GREEN'], // the fullscreen editor: tab-switch + nav-away + hard-refresh persistence (fire-121)
]

const results = []
for (const [script, args, needle] of CHECKS) {
  const label = `${script}${args.length ? ' ' + args.join(' ') : ''}`
  const r = spawnSync('node', [`scripts/${script}`, ...args], { encoding: 'utf8', timeout: 180000 })
  const out = `${r.stdout || ''}${r.stderr || ''}`
  const pass = r.status === 0 && out.includes(needle)
  results.push({ label, pass, code: r.status })
  console.log(`${pass ? '✅' : '❌'} ${label}${pass ? '' : `  (exit ${r.status})`}`)
}

const passed = results.filter((r) => r.pass).length
console.log(`\n${passed}/${results.length} checks green`)
if (passed !== results.length) {
  console.log('FAILED: ' + results.filter((r) => !r.pass).map((r) => r.label).join(', '))
  process.exit(1)
}
console.log('✅ GREEN-SWEEP: the whole OS is coherent (every verifier + journey + a11y both themes).')

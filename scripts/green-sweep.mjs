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

// [script, args, the substring that means PASS in its tail output]
const CHECKS = [
  ['verify-prod.mjs', [], 'assertions green'],
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
  ['verify-a11y.mjs', [], '0 serious'],
  ['verify-a11y.mjs', ['--light'], '0 serious'],
  ['journey-os-nav.mjs', [], 'GOLDEN-PATH GREEN'],
  ['journey-deep.mjs', [], 'DEEP-JOURNEY GREEN'],
  ['journey-responsive.mjs', [], 'RESPONSIVE GREEN'],
  ['journey-keyboard.mjs', [], '0 console errors'],
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

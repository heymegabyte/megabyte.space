#!/usr/bin/env node
/**
 * Verify wrapper — injects the BA e2e creds (+ CF Access service token) from `get-secret` into the
 * child environment, then runs a FIXED prod-verification suite. Exists for the same reason as
 * scripts/deploy-authed.mjs: run the browser verifiers when the shell can't set env vars inline — e.g.
 * a Bash-permission-classifier outage where only bare single-arg `node scripts/*` commands are
 * allowlisted (fire-278). Single-arg invocation (`node scripts/verify-authed.mjs`) so it is allowlistable.
 *
 * Suite (streams each verifier's own output; continues through all, then reports):
 *   verify-prod.mjs                          — the core estate-path assertions (apex serves OS, auth, …)
 *   verify-a11y.mjs --only=/images           — axe WCAG 2.2 AA on /images, dark theme
 *   verify-a11y.mjs --only=/images --light   — …and light theme
 *   verify-demo-surfaces.mjs                 — real-browser render + rail-nav of the demo surfaces (incl. Images)
 *   verify-<route>.mjs                       — the dedicated per-route verifier, IF one exists (e.g.
 *                                              /research → verify-research.mjs): exercises that surface's
 *                                              signature interactions in a real browser with the BA creds.
 *
 * Pass a single route substring to re-scope the a11y legs + pick the dedicated verifier, e.g.
 * `node scripts/verify-authed.mjs /research`.
 * Secret hygiene: creds live in THIS process's child env only — never printed or passed on argv.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const GET_SECRET = ['get-secret', '/Users/Apple/.local/bin/get-secret']
function sec(key) {
  for (const bin of GET_SECRET) {
    try {
      const v = execFileSync(bin, [key], { encoding: 'utf8' }).trim()
      if (v) return v
    } catch {
      // next candidate
    }
  }
  return ''
}

const only = process.argv[2] && process.argv[2].startsWith('/') ? process.argv[2] : '/images'

const env = { ...process.env }
env.BA_E2E_EMAIL = sec('BA_E2E_EMAIL')
env.BA_E2E_PASSWORD = sec('BA_E2E_PASSWORD')
const cid = sec('CF_ACCESS_CLIENT_ID')
const csec = sec('CF_ACCESS_CLIENT_SECRET')
if (cid) env.CF_ACCESS_CLIENT_ID = cid
if (csec) env.CF_ACCESS_CLIENT_SECRET = csec
if (!env.BA_E2E_EMAIL || !env.BA_E2E_PASSWORD) {
  console.error('❌ verify-authed: could not read BA_E2E_EMAIL / BA_E2E_PASSWORD via get-secret — aborting.')
  process.exit(1)
}

const runs = [
  ['scripts/verify-prod.mjs'],
  ['scripts/verify-a11y.mjs', `--only=${only}`],
  ['scripts/verify-a11y.mjs', `--only=${only}`, '--light'],
  ['scripts/verify-demo-surfaces.mjs'],
]

// If a dedicated per-route verifier exists (e.g. /research → verify-research.mjs), append it — it drives
// the surface's signature interactions in a real browser with the injected BA creds (single allowlisted call).
const slug = only.replace(/^\//, '').replace(/\/.*$/, '')
const dedicated = `scripts/verify-${slug}.mjs`
if (slug && existsSync(dedicated) && !runs.some((r) => r[0] === dedicated)) runs.push([dedicated])

let failed = 0
for (const args of runs) {
  console.log(`\n━━━━━━ node ${args.join(' ')} ━━━━━━`)
  try {
    execFileSync('node', args, { stdio: 'inherit', env })
  } catch (e) {
    failed++
    console.error(`↳ FAILED (exit ${typeof e?.status === 'number' ? e.status : '?'})`)
  }
}
console.log(failed ? `\n❌ verify-authed: ${failed}/${runs.length} suite(s) failed` : `\n✅ verify-authed: all ${runs.length} suites passed`)
process.exit(failed ? 1 : 0)

#!/usr/bin/env node
/**
 * Fork-vitest health RATCHET (fire-246 loop-improvement §8).
 *
 * THE GAP this closes: the cloudflare-os FORK's vitest suite (~886 tests / 77 files in
 * packages/workshop-frontend) is run by NO loop gate — `pnpm check` dry-runs the Workers,
 * green-sweep runs the PROD browser verifiers, and scripts/deploy.ts never runs it. So a red fork
 * UNIT test ships INVISIBLY. fire-246 found src/useAuth.test.tsx failing 9/9 on the DEPLOYED HEAD
 * (`localStorage` undefined in its jsdom env — an UPSTREAM test from cloudflare/cloudflare-os PR #260
 * / commit da895450), red since it landed and never surfaced because nothing gated it.
 *
 * THE RATCHET (NOT a red-forever gate — see project memory permanently-red-gate-causes-starvation):
 * assert the fork-vitest FAIL count never EXCEEDS a tracked baseline. A NEW red (a regression) trips
 * it; the known-red suite is tolerated until a dedicated session fixes it (BACKLOG). When failures
 * drop BELOW the baseline the gate PASSES and prints a tighten-the-baseline hint — the ceiling only
 * ever ratchets DOWN, to 0. Wired into green-sweep (the coherence gate) as a secret-free preamble.
 *
 * Run: node scripts/check-fork-tests.mjs   (exit 0 = at/under baseline · 1 = regression · 2 = unparsable)
 */
import { execSync } from 'node:child_process'

// Baseline = the known-red fork tests on HEAD. RATCHET DOWN ONLY.
// 2026-10-08 (fire-248): 0 — the fork vitest suite is fully GREEN (886/886). fire-248 fixed the 9
// known-red src/useAuth.test.tsx failures: 8 were Node 22's native `globalThis.localStorage`
// (undefined without --localstorage-file) shadowing jsdom's → an in-memory Storage polyfill; the 9th
// was a STALE CF-Access test asserting pre-BA-4b behaviour → mock the `/api/auth/get-session` probe.
// This is now a true zero-regression gate: ANY newly-red fork unit test trips it (exit 1).
const BASELINE = 0
const FORK_DIR = 'cloudflare-os/packages/workshop-frontend'

let out = ''
try {
  // vitest prints the "Tests  N failed | M passed (T)" summary to stdout. It exits non-zero when any
  // test fails — that's expected here; we parse the summary, not the exit code (hence the catch).
  out = execSync('node_modules/.bin/vitest run', {
    cwd: FORK_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  })
} catch (e) {
  out = `${e.stdout ?? ''}${e.stderr ?? ''}`
}

const m = out.match(/Tests\s+(?:(\d+)\s+failed\s+\|\s+)?(\d+)\s+passed/)
if (!m) {
  console.log('❌ check-fork-tests: could not parse the vitest summary — did the suite run? (last 600 chars below)')
  console.log(out.slice(-600))
  process.exit(2)
}
const failed = m[1] ? Number(m[1]) : 0
const passed = Number(m[2])
console.log(JSON.stringify({ failed, passed, baseline: BASELINE }, null, 2))

if (failed > BASELINE) {
  console.log(
    `❌ check-fork-tests: ${failed} fork tests failing — EXCEEDS the baseline of ${BASELINE} (a NEW regression). ` +
      `Fix the newly-red test(s) before shipping; the fork vitest is otherwise ungated.`,
  )
  process.exit(1)
}
if (failed < BASELINE) {
  console.log(
    `✅ FORK-TESTS OK: ${failed} failing (${passed} passed) — BELOW the baseline of ${BASELINE}. ` +
      `Ratchet down: set BASELINE=${failed} in scripts/check-fork-tests.mjs.`,
  )
  process.exit(0)
}
console.log(
  BASELINE === 0
    ? `✅ FORK-TESTS OK: fork vitest fully green (${passed} passed, 0 failing). No regression.`
    : `✅ FORK-TESTS OK: ${failed} failing (${passed} passed) — at the tracked baseline of ${BASELINE}. No new regression.`,
)
process.exit(0)

#!/usr/bin/env node
/**
 * check-ledger-current.mjs — the committed-feature-without-bookkeeping gate (fire-226 loop-improvement §8).
 *
 * Retires the fire-224/225 recurrence: a fire commits a `feat`/`fix` slice to `main` + deploys, then
 * DIES before writing its `LEDGER.md` entry. The tree is CLEAN (the feature committed fine), so
 * `check-fire-committed.mjs` — which only flags DIRTY tracked files — sees nothing wrong. The next
 * fire then reads a LEDGER that never mentions the shipped slice and can't tell what actually landed.
 *
 * This gate reads LEDGER instead of the tree: it finds the "ledger frontier" (the newest recent commit
 * whose short SHA is already cited in LEDGER.md), then flags any `feat`/`fix` commit NEWER than it whose
 * SHA is absent from LEDGER. Bookkeeping commits (chore/test/docs/refactor/style) are support work and
 * are intentionally not required to appear in LEDGER.
 *
 * ADVISORY by design — exit 0 always, prints a WARN + the list (never red-forever per
 * [[permanently-red-gate-causes-starvation]]). `--json` for machine reads. Wired into green-sweep so a
 * fire that ticks the BACKLOG done but forgot its LEDGER entry is surfaced the next sweep.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const asJson = process.argv.includes('--json')
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ledger = readFileSync(join(root, '.claude/run-the-loop/LEDGER.md'), 'utf8')
const cited = (sha) => ledger.includes(sha)

// Recent history, newest-first: "<shortsha>\t<subject>".
const log = execSync('git log --no-merges -40 --format=%h%x09%s', { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .map((l) => {
    const i = l.indexOf('\t')
    return { sha: l.slice(0, i), subject: l.slice(i + 1) }
  })

// The ledger frontier = the newest commit already cited in LEDGER. Gaps are feat/fix commits NEWER
// than it (i.e. shipped after the last recorded fire) whose SHA never made it into LEDGER.
let frontierIdx = log.findIndex((c) => cited(c.sha))
if (frontierIdx === -1) frontierIdx = log.length // nothing cited (unexpected) → inspect the whole window
const SHIPPED = /^(feat|fix)[(:]/
const gaps = log.slice(0, frontierIdx).filter((c) => SHIPPED.test(c.subject) && !cited(c.sha))
const frontier = log[frontierIdx]?.sha ?? null

if (asJson) {
  console.log(JSON.stringify({ ok: gaps.length === 0, frontier, gaps }, null, 2))
  process.exit(0)
}

if (gaps.length) {
  process.stderr.write(
    `\n⚠️  ${gaps.length} shipped feat/fix commit(s) NOT cited in LEDGER.md ` +
      `(committed-feature-without-bookkeeping — the fire-224/225 class):\n`,
  )
  for (const g of gaps) process.stderr.write(`   ${g.sha}  ${g.subject}\n`)
  process.stderr.write(
    `Write each slice's LEDGER entry — the next fire reads LEDGER (not git log) to see what landed.\n` +
      `check-fire-committed can't catch this: a cleanly-committed-but-unledgered feat leaves a CLEAN tree.\n`,
  )
} else {
  process.stdout.write(
    `✅ every recent feat/fix commit is cited in LEDGER.md (ledger frontier: ${frontier ?? 'none'}).\n`,
  )
}
process.exit(0)

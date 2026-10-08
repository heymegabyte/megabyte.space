#!/usr/bin/env node
/**
 * Beautify-10x frontier — the cheap read of `.claude/modifier-matrix.json`.
 *
 * WHY: the matrix is the loop's per-surface aesthetic state (score · passes · next[]), and the
 * run-the-loop command tells the orchestrator to READ it at §0 to pick the lowest-scored surface.
 * But it has grown past 60 KB of prose `notes` — Reading it in the main thread now TRUNCATES (hit
 * at fire-275's orient, 63 KB > the 25 KB tool cap), so the loop can't actually see the frontier it
 * is told to consult. This prints ONLY the hot list — every surface still below the 9.5 bar or under
 * 10 beautify passes, sorted by score ascending (the UX/Visual role targets the top row), with its
 * top queued `next[]` item. The verbose `notes` stay in the JSON; this is the index over them, the
 * exact analog of `backlog-frontier.mjs` over `BACKLOG.md`.
 *
 * Usage: `node scripts/matrix-frontier.mjs` (human) · `--json` (machine) · `--all` (include ≥9.5
 * surfaces too, e.g. for a full audit). Exit 0 always (a report, never a gate).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const MATRIX = join(HERE, '..', '.claude', 'modifier-matrix.json')
const BAR = 9.5 // the ratchet: a surface below this stays "hot"
const MAX_PASSES = 10 // the "10x" ambition

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const includeAll = args.includes('--all')

let matrix
try {
  matrix = JSON.parse(readFileSync(MATRIX, 'utf8'))
} catch (err) {
  console.error(`matrix-frontier: cannot read ${MATRIX}: ${err.message}`)
  process.exit(0) // never a gate — a missing/broken matrix is reported, not fatal
}

const surfaces = matrix.surfaces ?? {}
const rows = Object.entries(surfaces).map(([key, s]) => {
  const score = typeof s.aiVisionScore === 'number' ? s.aiVisionScore : 0
  const passes = typeof s.beautifyPasses === 'number' ? s.beautifyPasses : 0
  const next = Array.isArray(s.next) ? s.next : []
  return {
    key,
    score,
    passes,
    density: typeof s.density === 'number' ? s.density : null,
    lastVisit: s.lastVisit ?? '?',
    hot: score < BAR || passes < MAX_PASSES,
    next: next[0] ?? null,
    nextCount: next.length,
  }
})

const shown = (includeAll ? rows : rows.filter((r) => r.hot)).sort(
  (a, b) => a.score - b.score || a.passes - b.passes || a.key.localeCompare(b.key),
)

/**
 * READY DEPTH LANE — the cluster of actionable hot surfaces sharing the lowest (score, THEN passes) tier.
 * This is the ready DEPTH/BEAUTIFY lane the loop drains top-down: pick the top row, ship its next[0], repeat.
 * Auto-surfaces what fire-275's handoff note hand-curated ("the ~11 CF-integration surfaces at 9.0/1-pass")
 * so the NEXT lead reads it from the tool instead of a prose note. Excludes score 0 (unscored — needs a
 * vision CAPTURE, not a beautify pass) and ≥BAR surfaces (near-done). Grouping by score alone is too coarse
 * (most surfaces sit at 9.0), so we tie-break by passes → the least-worked, freshest-opportunity cluster.
 */
function computeDepthLane(allRows) {
  // A surface is a DEPTH target when it's hot, SCORED (score 0 = unscored → needs a vision capture, not a
  // beautify pass), below the bar, has a queued next[0], and is NOT retired/superseded (e.g. os.login, which
  // is REPLACED by home.signin — a singleton at 6/0 that is not a real beautify target).
  const RETIRED = /\b(replaced|retired|superseded|deprecated)\b/i
  const actionable = allRows.filter(
    (r) => r.hot && r.score > 0 && r.score < BAR && r.next && !RETIRED.test(r.next),
  )
  if (!actionable.length) return null
  const minScore = Math.min(...actionable.map((r) => r.score))
  const atMinScore = actionable.filter((r) => r.score === minScore)
  const minPasses = Math.min(...atMinScore.map((r) => r.passes))
  const lane = atMinScore
    .filter((r) => r.passes === minPasses)
    .sort((a, b) => a.key.localeCompare(b.key))
  return { score: minScore, passes: minPasses, count: lane.length, surfaces: lane.map((r) => r.key), top: lane[0]?.key ?? null }
}
const depthLane = computeDepthLane(rows)

if (asJson) {
  console.log(JSON.stringify({ bar: BAR, total: rows.length, hot: rows.filter((r) => r.hot).length, depthLane, shown }, null, 2))
  process.exit(0)
}

const hotCount = rows.filter((r) => r.hot).length
console.log(
  `Beautify-10x frontier — ${hotCount} hot (< ${BAR} or < ${MAX_PASSES} passes) of ${rows.length} surfaces` +
    (includeAll ? ' · showing ALL' : ' · showing hot only (--all for every surface)'),
)
console.log('(sorted by score asc — the UX/Visual role targets the top row each fire)\n')
for (const r of shown) {
  const flag = r.score < BAR ? '●' : '○' // ● below the bar, ○ at/above but < 10 passes
  const head = `${flag} ${r.key.padEnd(22)} ${String(r.score).padStart(4)} / ${String(r.passes).padStart(2)} passes · seen ${r.lastVisit}`
  console.log(head)
  if (r.next) console.log(`    next: ${r.next.length > 150 ? r.next.slice(0, 147) + '…' : r.next}`)
}

if (depthLane) {
  console.log(
    `\n★ READY DEPTH LANE — ${depthLane.count} surface(s) at the lowest actionable tier ${depthLane.score}/10 · ${depthLane.passes} pass:` +
      `\n  ${depthLane.surfaces.join(', ')}` +
      `\n  → pick the top row (${depthLane.top}), ship its next[0], repeat. (score 0 = unscored → needs a vision capture, not a beautify pass; excluded.)`,
  )
}
process.exit(0)

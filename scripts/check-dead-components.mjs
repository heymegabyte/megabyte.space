#!/usr/bin/env node
/**
 * fire-125 — fork-aware dead-component gate (the interconnectedness sibling of
 * check-route-reachability.mjs). Flags a workshop-frontend component with ZERO usages anywhere in
 * src (no import, no `<JSX>`, no type ref) — the "built but never wired" class the SQL-editor lesson
 * warns about — BUT classifies each by ORIGIN, because this repo's `cloudflare-os` is a FORK that
 * rebases on upstream (per CLAUDE.md § Upgrades):
 *
 *   • FORK-ADDED + 0 usages  → real dead code WE introduced → FAIL (wire it or delete it).
 *   • UPSTREAM  + 0 usages   → inherited surface our OS variant doesn't wire → INFORMATIONAL (leave
 *                              it; deleting upstream files = merge conflicts on every upstream rebase).
 *   • origin UNKNOWN (upstream remote not fetched) → informational (never false-fail on missing git).
 *
 * This is why fire-125's sweep is GREEN despite 6 unreferenced components: all 6 are upstream.
 * Exit 1 only on a FORK-ADDED orphan.
 */
import { readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const FORK = 'cloudflare-os'
const SRC = `${FORK}/packages/workshop-frontend/src`
const COMPONENTS = `${SRC}/components`

// Upstream merge-base (fork rebases on cloudflare/cloudflare-os). Absent remote → null (never fail).
let mergeBase = null
for (const ref of ['upstream/main', 'upstream/master']) {
  try {
    mergeBase = execSync(`git -C ${FORK} merge-base HEAD ${ref}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
    if (mergeBase) break
  } catch { /* remote not fetched — fall through */ }
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.(tsx|ts)$/.test(name) && !/^index\.(tsx|ts)$/.test(name)) out.push(p)
  }
  return out
}

// Count usages of a component's identifier anywhere in src EXCEPT its own file (import / <JSX / type).
function usageCount(file, base) {
  let out = ''
  try {
    out = execSync(`grep -rlE "\\b${base}\\b" ${SRC} --include='*.tsx' --include='*.ts'`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
  } catch { return 0 } // grep exit 1 = no matches at all (not even self) — shouldn't happen, treat as 0
  return out.split('\n').filter(Boolean).filter((f) => !f.endsWith(file.replace(`${FORK}/`, '').replace('packages/workshop-frontend/src/', '')) && !f.includes(file)).length
}

// Is a path present at the upstream merge-base? (⇒ inherited, not our orphan.)
function isUpstream(file) {
  if (!mergeBase) return null
  const rel = file.replace(`${FORK}/`, '')
  try {
    execSync(`git -C ${FORK} cat-file -e ${mergeBase}:${rel}`, { stdio: 'ignore' })
    return true
  } catch { return false }
}

const forkOrphans = []
const upstreamUnwired = []
const unknown = []
for (const file of walk(COMPONENTS)) {
  const base = file.split('/').pop().replace(/\.(tsx|ts)$/, '')
  if (usageCount(file, base) > 0) continue
  const up = isUpstream(file)
  const rel = file.replace(`${SRC}/`, '')
  if (up === true) upstreamUnwired.push(rel)
  else if (up === false) forkOrphans.push(rel)
  else unknown.push(rel)
}

console.log(JSON.stringify({
  forkAddedOrphans: forkOrphans,
  upstreamUnwired: upstreamUnwired.length,
  originUnknown: unknown.length,
  mergeBase: mergeBase ? mergeBase.slice(0, 10) : '(upstream not fetched)',
}, null, 2))
if (upstreamUnwired.length) console.log(`\nℹ️  ${upstreamUnwired.length} upstream component(s) our OS doesn't wire (LEAVE — rebase hygiene): ${upstreamUnwired.join(', ')}`)
if (unknown.length) console.log(`\nℹ️  ${unknown.length} component(s) of unknown origin (upstream remote not fetched) — not failing: ${unknown.join(', ')}`)
if (forkOrphans.length) {
  console.log(`\n❌ FORK-ADDED dead components (we built them, nothing wires them): ${forkOrphans.join(', ')}`)
  console.log('   Wire each into a surface, or delete it (it is OURS, so deleting is safe — no upstream rebase cost).')
  process.exit(1)
}
console.log(`\n✅ NO fork-added dead components (every component WE added is wired; upstream-inherited unwired surface is left for rebase hygiene).`)
process.exit(0)

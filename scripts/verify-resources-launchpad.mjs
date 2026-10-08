#!/usr/bin/env node
/**
 * verify-resources-launchpad — STATIC, secret-free guard for the Editor Resources launchpad
 * (GadgetEditor right-pane → ResourcesPanel.tsx RESOURCES[]). Three source-level invariants
 * (no browser · no BA creds · no CF · runs anywhere, fast):
 *
 *   (1) NO DEAD "View →" LINKS — every card's `to` route resolves to a real route file in
 *       src/routes/. A card that jumps to a non-existent route is a lying launchpad.
 *   (2) SYNC WITH /admin (BIDIRECTIONAL) — every /admin Platform tab feature (AdminPage.tsx
 *       PLATFORM_FEATURES[]) with a management surface has a launchpad card, AND every launchpad
 *       card is also a Platform feature (fire-251), each minus a tiny justified intentional-omit set.
 *       Catches BOTH "added a platform feature but forgot the launchpad card" and the reverse "added
 *       a launchpad card but forgot the /admin feature" — so /admin always demos every surface.
 *   (3) COUNT RATCHET — reports the card count + status breakdown and asserts a floor so a future
 *       edit can't silently drop cards below what shipped.
 *
 * Fills the fire-222/223 gap: the launchpad (38->50 cards) had NO verifier. verify-demo-surfaces
 * covers the SIDEBAR rail, NOT the in-editor launchpad. Green regression net, never a red-forever
 * gate (the floor is the shipped count). Pairs with check-route-reachability (which checks the rail).
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FE = resolve(__dirname, '../cloudflare-os/packages/workshop-frontend')
const ROUTES = resolve(FE, 'src/routes')
const RES_FILE = resolve(FE, 'src/components/ResourcesPanel.tsx')
const ADMIN_FILE = resolve(FE, 'src/AdminPage.tsx')

// The shipped launchpad card count (fire-223). A floor, not a cap — adding cards is fine; dropping
// below this must consciously lower the floor (ratchet, per memory permanently-red-gate-causes-starvation).
const COUNT_FLOOR = 50

// Platform-tab routes a launchpad card deliberately does NOT carry. Keep tiny + justified.
//   /gadgets — the launchpad lives INSIDE a gadget editor; a "Gadgets" card would be circular.
const INTENTIONAL_OMIT = new Set(['/gadgets'])

// The reverse: launchpad routes that deliberately are NOT /admin Platform-tab features. Empty today —
// every Editor resource surface is also a platform capability (fire-251 synced the last three:
// Gatekeepers/Providers/Blueprints); kept for symmetry + any future justified exception.
const ADMIN_INTENTIONAL_OMIT = new Set([])

const fail = []
const pass = []
const ok = (m) => pass.push(m)
const bad = (m) => fail.push(m)

// Slice a `const NAME ... = [ ... ]` array literal body out of a source file (robust to other
// `{ name: … }` objects elsewhere in the file — we only parse the array we asked for).
function sliceArray(src, name) {
  const decl = new RegExp(`const\\s+${name}\\b[^=]*=\\s*\\[`)
  const m = src.match(decl)
  if (!m) return null
  const rest = src.slice(m.index + m[0].length)
  const end = rest.search(/\n\]/)
  return end === -1 ? rest : rest.slice(0, end)
}

// One object-per-line arrays → line-parse (reliable; avoids greedy multi-line regex pitfalls).
function parseEntries(block) {
  const out = []
  for (const line of block.split('\n')) {
    const name = line.match(/name:\s*'([^']+)'/)
    if (!name) continue
    const status = line.match(/status:\s*'([a-z]+)'/)
    const to = line.match(/\bto:\s*'(\/[^']+)'/)
    out.push({ name: name[1], status: status?.[1] ?? null, to: to?.[1] ?? null })
  }
  return out
}

function routeExists(to) {
  const slug = to.replace(/^\//, '')
  return (
    existsSync(resolve(ROUTES, `${slug}.tsx`)) ||
    existsSync(resolve(ROUTES, `${slug}.lazy.tsx`)) ||
    existsSync(resolve(ROUTES, `${slug}/index.tsx`)) ||
    existsSync(resolve(ROUTES, `${slug}/route.tsx`))
  )
}

const resSrc = readFileSync(RES_FILE, 'utf8')
const adminSrc = readFileSync(ADMIN_FILE, 'utf8')

const resBlock = sliceArray(resSrc, 'RESOURCES')
const pfBlock = sliceArray(adminSrc, 'PLATFORM_FEATURES')
if (!resBlock) bad('could not locate RESOURCES[] in ResourcesPanel.tsx')
if (!pfBlock) bad('could not locate PLATFORM_FEATURES[] in AdminPage.tsx')

const resources = resBlock ? parseEntries(resBlock) : []
const features = pfBlock ? parseEntries(pfBlock) : []

// ---- (1) no dead "View →" links ------------------------------------------------------------
const linked = resources.filter((r) => r.to)
const dead = linked.filter((r) => !routeExists(r.to))
if (dead.length === 0) ok(`all ${linked.length} launchpad "View →" links resolve to real route files`)
else bad(`dead launchpad links (route file missing): ${dead.map((r) => `${r.name}→${r.to}`).join(', ')}`)

// ---- (2) sync with the /admin Platform tab -------------------------------------------------
const resRoutes = new Set(linked.map((r) => r.to))
const pfRoutes = [...new Set(features.filter((f) => f.to).map((f) => f.to))]
const missing = pfRoutes.filter((t) => !resRoutes.has(t) && !INTENTIONAL_OMIT.has(t))
if (missing.length === 0) ok(`launchpad covers every /admin platform surface (${pfRoutes.length} routes, ${INTENTIONAL_OMIT.size} intentional omit)`)
else bad(`platform features with NO launchpad card: ${missing.join(', ')} — add a RESOURCES[] card or justify in INTENTIONAL_OMIT`)

// ---- (2b) reverse sync: every launchpad card is also a /admin Platform feature --------------
// Symmetric to (2) (fire-251): catches "added a launchpad card but forgot the /admin Platform tab
// feature" — the exact drift where RESOURCES gained Gatekeepers/Providers/Blueprints (fire-249/250)
// while PLATFORM_FEATURES lagged, so /admin silently stopped demoing every capability the Editor
// surfaces. Keeps "demo /admin with ALL features" (Brian's WS-DEMO directive) an enforced invariant.
const pfRouteSet = new Set(pfRoutes)
const missingFromAdmin = [...resRoutes].filter((t) => !pfRouteSet.has(t) && !ADMIN_INTENTIONAL_OMIT.has(t))
if (missingFromAdmin.length === 0) ok(`/admin Platform tab covers every launchpad surface (${resRoutes.size} routes)`)
else bad(`launchpad routes with NO /admin Platform feature: ${missingFromAdmin.join(', ')} — add a PLATFORM_FEATURES entry or justify in ADMIN_INTENTIONAL_OMIT`)

// ---- (3) count ratchet ----------------------------------------------------------------------
const byStatus = resources.reduce((a, r) => ((a[r.status ?? '?'] = (a[r.status ?? '?'] ?? 0) + 1), a), {})
if (resources.length >= COUNT_FLOOR) ok(`${resources.length} launchpad cards (floor ${COUNT_FLOOR}) — ${JSON.stringify(byStatus)}`)
else bad(`launchpad regressed to ${resources.length} cards (floor ${COUNT_FLOOR}) — a card was dropped`)

// ---- report ---------------------------------------------------------------------------------
for (const p of pass) console.log(`✅ PASS: ${p}`)
for (const f of fail) console.log(`❌ FAIL: ${f}`)
console.log(fail.length === 0 ? '\n✅ RESOURCES-LAUNCHPAD GREEN' : `\n❌ resources-launchpad check failed (${fail.length})`)
process.exit(fail.length === 0 ? 0 : 1)

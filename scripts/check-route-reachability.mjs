#!/usr/bin/env node
/**
 * fire-122 — interconnectedness gate: flag any STATIC OS route that no in-app UI links to (an
 * orphan — URL-reachable but with no nav/⌘K/link entry point, so a user can't GET there). This is
 * the exact class that hid `/context` ("Context & Skills"): built + documented to have a rail entry,
 * but nothing linked to it. Catches the NEXT such orphan deterministically (hooks > rules).
 *
 * Scope: TanStack file-routes under workshop-frontend/src/routes. Only STATIC routes are checked
 * (dynamic `$param` routes are deep-link targets reached via interpolated links — not grep-reliable).
 * A route is "reachable" if some .tsx/.ts (excluding routeTree.gen + the route's own file) contains a
 * `to:`/`to=`/`href=` pointing at its path. ALLOW = routes legitimately reached without a nav ref
 * (the root layout, `/` home, and the auth pages reached by redirect, not a link).
 *
 * Exit 1 (+ the orphan list) on any unreachable static route; 0 when every one has an entry point.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const SRC = 'cloudflare-os/packages/workshop-frontend/src'
const ROUTES_DIR = `${SRC}/routes`

// Reached without an in-app nav ref — not orphans.
const ALLOW = new Set(['__root', 'index', 'signin', 'signup'])

// filename (sans .tsx) → URL path. TanStack: dots are separators; a trailing `_` on a segment is the
// layout-escape marker; `$x` is a param (⇒ dynamic, skipped below).
function toPath(base) {
  return (
    '/' +
    base
      .split('.')
      .map((seg) => seg.replace(/_$/, ''))
      .join('/')
  )
}

const files = readdirSync(ROUTES_DIR)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => f.replace(/\.tsx$/, ''))

const orphans = []
const checked = []
for (const base of files) {
  if (ALLOW.has(base)) continue
  if (base.includes('$')) continue // dynamic deep-link target — not grep-reliable, skip
  const path = toPath(base)
  checked.push(path)
  // Any nav/link reference to this exact path, excluding the generated tree + the route's own file.
  let refs = 0
  try {
    const out = execSync(
      `grep -rnE "to[:=] *['\\"]${path}['\\"]|href=['\\"]${path}['\\"]|to: *['\\"]${path}['\\"]" ${SRC} --include='*.tsx' --include='*.ts' || true`,
      { encoding: 'utf8' },
    )
    refs = out
      .split('\n')
      .filter(Boolean)
      .filter((l) => !l.includes('routeTree.gen') && !l.includes(`/routes/${base}.tsx`)).length
  } catch {
    refs = 0
  }
  if (refs === 0) orphans.push(path)
}

console.log(JSON.stringify({ checkedStaticRoutes: checked.length, orphans }, null, 2))
if (orphans.length) {
  console.log(`\n❌ ORPHAN ROUTES (URL-reachable but no in-app entry point): ${orphans.join(', ')}`)
  console.log('   Wire each into the Sidebar rail / ⌘K / a link — or, if a deliberate redirect/legacy shim, add its basename to ALLOW.')
  process.exit(1)
}
console.log(`\n✅ REACHABILITY: all ${checked.length} static routes have an in-app entry point (0 orphans).`)
process.exit(0)

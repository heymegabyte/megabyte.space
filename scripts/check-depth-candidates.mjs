#!/usr/bin/env node
/**
 * DEPTH-candidate classifier (fire-210 loop-improvement). The DEPTH frontier wires a REAL authenticated
 * RPC behind a "Preview · sample data" demo surface (the fire-187 template: a deriveX/summarizeX pure
 * helper + a fail-soft fetch + an augment-not-replace live band + an honest hybrid chip). Picking the
 * next target BY EYE is error-prone — fire-210's scout mislabeled /outputs (a FULLY-LIVE product surface
 * that already calls listOutputs + has real mutations) as "sample", nearly wasting a slice on a redundant
 * band. This mechanical classifier removes that failure mode. For each fork route it reports:
 *
 *   candidate — a sample surface (SAMPLE_ / "Preview · sample") with NO authenticatedApi call → a genuine
 *               DEPTH target (the menu for the next DEPTH fire).
 *   depth     — calls authenticatedApi.<rpc>() AND has sample data → a DEPTH band already landed (hybrid).
 *   live      — calls authenticatedApi.<rpc>() and has NO sample constant → already fully real. NOT a
 *               DEPTH target (adding a band would be redundant — the /outputs trap).
 *   static    — neither (pure nav / mock-interaction page).
 *
 * Read-only, exit 0 (informational helper, not a pass/fail gate). Run before picking a DEPTH slice.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROUTES = 'cloudflare-os/packages/workshop-frontend/src/routes'

let files
try {
  files = readdirSync(ROUTES).filter((f) => f.endsWith('.tsx') && !f.startsWith('__'))
} catch {
  console.log(`cannot read ${ROUTES} — run from the repo root (submodule checked out?)`)
  process.exit(0)
}

// A real authenticated RPC call anywhere in the route (the "live data" signal). `\s*` around the dot so
// a fluent call chained across a line break — `authenticatedApi\n  .listGadgets()` — is NOT missed (the
// miss that first shipped would have mis-flagged /compute + /knowledge as candidates: self-defeating).
const rpcRe = /authenticatedApi\s*\.\s*(\w+)\s*\(/g
// Any of the honest sample-data markers the demo surfaces use (incl. every DEPTH hybrid chip variant).
const sampleRe = /SAMPLE_|Preview · sample|sample data|sample runtime|sample entries|sample series|sample governance|sample sync|sample traffic|sample catalog|sample presence|sample runs/i

const rows = []
for (const f of files) {
  const src = readFileSync(join(ROUTES, f), 'utf8')
  const rpcs = [...new Set([...src.matchAll(rpcRe)].map((m) => m[1]))]
  const hasSample = sampleRe.test(src)
  const kind = rpcs.length && hasSample ? 'depth' : rpcs.length ? 'live' : hasSample ? 'candidate' : 'static'
  rows.push({ route: '/' + f.replace(/\.tsx$/, '').replace(/\.index$/, ''), kind, rpcs })
}

// RPC usage frequency across every surface that already calls one (depth + live). The next DEPTH fire
// should prefer wiring a LOW-count RPC — spreading live coverage across the RPC surface beats piling an
// Nth band on an already-popular RPC. fire-214 picked listOutputs (then 1×, only /outputs) over
// listGadgets (10×) for /tasks for exactly this reason; this table makes that call mechanical instead of
// by-eye. A count is "how many surfaces already surface this RPC" — the redundancy cost of reusing it.
const rpcUsage = {}
for (const r of rows) for (const rpc of r.rpcs) rpcUsage[rpc] = (rpcUsage[rpc] || 0) + 1
const rpcUsageSorted = Object.entries(rpcUsage).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))

const by = (k) => rows.filter((r) => r.kind === k)
console.log(
  JSON.stringify(
    {
      counts: { candidate: by('candidate').length, depth: by('depth').length, live: by('live').length, static: by('static').length },
      candidates: by('candidate').map((r) => r.route),
      depthDone: by('depth').map((r) => ({ route: r.route, rpcs: r.rpcs })),
      fullyLive: by('live').map((r) => ({ route: r.route, rpcs: r.rpcs })),
      rpcUsage: Object.fromEntries(rpcUsageSorted),
    },
    null,
    2,
  ),
)
// Curated DEPTH-FIT NOTES (fire-224 loop-improvement). The `candidate` list says a surface is SAMPLE-only,
// but NOT whether a real RPC EXISTS to anchor a band — picking a target still cost a scout fire (fire-224
// spent an Explore agent proving /storage→listGadgets was the one genuine fit while /analytics·/logs·
// /activity are BLOCKED: their live contract needs a backend RPC that doesn't exist yet). This map captures
// that analysis so a future DEPTH fire READS it instead of re-discovering. The only DEPTH-suitable RPCs
// that return real per-user data TODAY: listGadgets (your gadgets — runtime[/compute] · governance
// [/environments] · storage-owner[/storage] lenses), whoami (your session — /presence · /permissions),
// getCloudflareUsage (account AI usage — /metrics · /billing · /ai-gateway), listConnectedAccounts,
// listModels, listOutputs. A candidate with no natural fit among those is BLOCKED until its backend RPC lands.
const DEPTH_FIT = {
  '/analytics': 'BLOCKED — needs a real visitor-aggregates RPC (D1 visitor_events → getAnalytics); none exists yet',
  '/logs': 'BLOCKED — the live contract is a per-run Workers-Logs stream (WebSocket), not a stateless RPC',
  '/activity': 'BLOCKED — needs a global listRecentActions (fan-out listActions across gadgets); only per-gadget listActions exists',
}

console.log('\nDEPTH candidates (sample surface, no live RPC yet) — the menu for the next DEPTH fire:')
for (const r of by('candidate')) console.log('  •', r.route, DEPTH_FIT[r.route] ? `— ${DEPTH_FIT[r.route]}` : '')
if (by('candidate').length === 0) console.log('  (none — every sample surface now has a live band; re-run the doc-diff for a NEW surface)')
console.log('  (annotated routes = analyzed; unannotated = FIT NOT YET SCOUTED — confirm a real RPC exists before spending a slice)')
console.log('\n⚠️  NOT DEPTH targets (already fully live — adding a band would be redundant, cf. the /outputs trap):')
for (const r of by('live')) console.log('  •', r.route, '→', r.rpcs.join(', '))
console.log('\nRPC usage across surfaces (prefer a LOW-count RPC for the next DEPTH band — spread live coverage, avoid redundancy):')
for (const [rpc, n] of rpcUsageSorted) console.log(`  ${String(n).padStart(2)}×  ${rpc}`)

// ── Pulse-detector inventory (fire-227 loop-improvement) ──────────────────────────────────────────
// The Opportunity Engine (/pulse) is the OTHER recurring absorption frontier (WS-N1 "more detectors as
// data sources arrive"). Picking the next detector BY EYE cost fire-227 a scout: it read the route + test
// + api.ts only to discover `reconnect-integration` ALREADY existed and that computeOpportunities' input
// space was saturated (onboarding is a blocking SHELL gate, not a nudge). This inventory makes that
// mechanical — a future "add a Pulse detector" fire READS the shipped set + available inputs instead of
// re-deriving it. Parsed live from pulse.tsx so it can't rot.
const PULSE = 'cloudflare-os/packages/workshop-frontend/src/routes/pulse.tsx'
try {
  const psrc = readFileSync(PULSE, 'utf8')
  const start = psrc.indexOf('export function computeOpportunities(')
  const end = psrc.indexOf('function PulseRoute(')
  if (start >= 0 && end > start) {
    const body = psrc.slice(start, end)
    const detectors = [...new Set([...body.matchAll(/id:\s*'([a-z][\w-]*)'/g)].map((m) => m[1]))]
    const sig = body.slice(body.indexOf('(') + 1, body.indexOf('): Opportunity[]'))
    const inputs = sig.split(',').map((s) => s.trim().split(/[:\s]/)[0]).filter(Boolean)
    console.log(`\nPulse Opportunity-Engine detectors shipped (${detectors.length}) — the other absorption frontier (WS-N1):`)
    console.log('  ' + detectors.join(' · '))
    console.log(`  computeOpportunities inputs (a new detector must derive from THESE): ${inputs.join(', ')}`)
    console.log('  → to add a genuinely-new signal, thread a NEW real RPC through computeOpportunities (e.g. getCloudflareUsage')
    console.log('    → a "usage approaching your limit" nudge); the current input space is covered by the detectors above.')
  }
} catch {
  // pulse.tsx unreadable (submodule absent) — skip the Pulse inventory; the DEPTH sections already printed.
}
process.exit(0)

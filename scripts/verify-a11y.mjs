#!/usr/bin/env node
/**
 * fire-93 accessibility audit (expanded 106/108/117): axe-core (WCAG 2.2 AA) over the force-login
 * gate (/signin, anon) + EVERY primary authed OS surface — Home, Pulse, Workspaces, Gadgets,
 * Outputs, Context & Skills, Goals, Automations, Agents, Blueprints, Explore, Models, Providers,
 * Gatekeepers, Connections, Profile, Admin — PLUS /signup (anon) and the fullscreen workspace EDITOR
 * (dynamic /workspace/$id, click-nav). The static-route set is ENFORCED by check-a11y-coverage.mjs,
 * which fails if any fork route (cloudflare-os/.../src/routes/*.tsx) is missing from the list below —
 * so a new surface can never ship a11y-unaudited (the fire-103/117/146/147 recurring class).
 * Reports violations per surface; FAILS on any serious/critical violation (axe 0-violations is a
 * required gate per quality-metrics). BA-authed real Chromium, PROD. Needs BA creds. Both themes.
 */
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const APEX = 'https://megabyte.space'
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD
if (!EMAIL || !PASSWORD) { console.log('missing BA creds'); process.exit(2) }

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const LIGHT = process.argv.includes('--light')
// --only=<substr> scopes the sweep to matching routes (e.g. --only=/analytics) so a single-surface fire
// can run the CANONICAL a11y gate cheaply instead of the full ~40-route dual-theme sweep (fire-273 — born
// of hand-rolling a throwaway scoped audit). The ROUTES list stays COMPLETE (check-a11y-coverage still
// enforces every fork route is listed); --only only subsets the RUNTIME iteration + skips the click-nav
// editor legs. Empty = audit everything (the green-sweep default).
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length)
const MODE = LIGHT ? 'light' : 'dark (default)'
const browser = await chromium.launch()
// axe-core/playwright requires a page from an explicit browser context (not the default newPage()).
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
})
// `--light` forces the light theme (gadgets:theme-mode) so axe audits the light palette too.
await context.addInitScript((light) => {
  try {
    localStorage.setItem('megabyteOS_entered', '1')
    if (light) localStorage.setItem('gadgets:theme-mode', 'light')
  } catch {}
}, LIGHT)
const page = await context.newPage()
console.log(`a11y audit — theme: ${MODE}`)

async function audit(label) {
  const r = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  const v = r.violations.map((x) => ({
    id: x.id, impact: x.impact, n: x.nodes.length, help: x.help,
    targets: x.nodes.slice(0, 3).map((nd) => nd.target.join(' ')),
    sample: x.nodes[0]?.failureSummary?.split('\n').filter((l) => /contrast|ratio|foreground|background/i.test(l)).slice(0, 2).join(' | '),
    html: x.id === 'nested-interactive' ? x.nodes.slice(0, 2).map((nd) => nd.html?.slice(0, 160)) : undefined,
  }))
  const serious = v.filter((x) => x.impact === 'serious' || x.impact === 'critical')
  console.log(`\n── ${label} — ${v.length} violation type(s) (${serious.length} serious/critical)`)
  for (const x of v) {
    console.log(`   ${x.impact === 'serious' || x.impact === 'critical' ? '❌' : '•'} [${x.impact}] ${x.id} ×${x.n} — ${x.help}`)
    for (const t of x.targets) console.log(`        ↳ ${t}`)
    if (x.sample) console.log(`        ⊙ ${x.sample}`)
    for (const h of x.html ?? []) console.log(`        ⧉ ${h}`)
  }
  return { label, violations: v, serious: serious.length }
}

const out = []

// 1. /signin (anonymous — the universal force-login gate).
await page.goto(`${APEX}/signin`, { waitUntil: 'domcontentloaded', timeout: 40000 })
await page.waitForSelector('input[type="email"]', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(800)
out.push(await audit('/signin (anon)'))

// 1b. /signup (anonymous — the Better-Auth create-account route; redirects to / in CF_ACCESS_MODE).
await page.goto(`${APEX}/signup`, { waitUntil: 'domcontentloaded', timeout: 40000 })
await page.waitForTimeout(800)
out.push(await audit('/signup (anon)'))

// Sign in, then audit the authed surfaces.
await page.fill('input[type="email"]', EMAIL)
await page.fill('input[type="password"]', PASSWORD)
await page.click('[data-testid="auth-submit"]')
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(800)

// COVERAGE NOTE (fire-117): when adding a surface, cross-check `ls src/routes/*.tsx` — don't rely on
// the sidebar/⌘K. Routes reached ONLY from menus (UserMenu/Header) evade nav-based memory: /providers
// (fire-103) and /profile (fire-117) were both unaudited for many fires until a sweep caught them.
const ROUTES = [
  ['/', /build|create|describe|workspace|gadget|idea|start/i],
  ['/pulse', /opportunit|all clear/i],
  ['/workspaces', /workspace/i],
  ['/gadgets', /total spend|gadget/i],
  ['/outputs', /output/i],
  ['/context', /context|skill|coming soon/i], // wired into the rail fire-122 (was orphaned) → now audited
  ['/goals', /goal|outcome|coming soon/i], // WS-DEMO: Goals demo surface (fire-130)
  ['/automations', /automation|schedule|coming soon/i], // WS-DEMO: Automations demo surface (fire-133)
  ['/agents', /agent|coworker|coming soon/i], // WS-DEMO: Agents demo surface (fire-140)
  ['/activity', /activity|approval|waiting|recent/i], // WS-DEMO: Activity & Approvals demo surface (fire-147)
  ['/analytics', /analytics|visitors|sample data/i], // WS-DEMO: Analytics dashboard (fire-146 — was unaudited)
  ['/customers', /customer|people|funnel|sample data/i], // WS-DEMO: Customers/People CRM (fire-148/149 — was unaudited)
  ['/inbox', /inbox|conversation|unread|sample data/i], // WS-DEMO: Inbox unified conversations (fire-153)
  ['/booking', /booking|appointment|upcoming|sample data/i], // WS-DEMO: Booking week view (fire-154)
  ['/releases', /releases|deploy|rollback|version|sample data/i], // WS-DEMO: Releases deploy/rollback (fire-155)
  ['/browser-runs', /browser|run|needs input|steps|sample data/i], // WS-DEMO: Browser Runs agentic sessions (fire-156)
  ['/billing', /billing|usage|spend|cost|sample/i], // WS-DEMO: Billing (live usage + sample costs) (fire-157)
  ['/budgets', /budgets|spend cap|monthly cap|sample data/i], // WS-DEMO: Budgets cost-governance (fire-259)
  ['/experiments', /experiments|variant|conversion|winner|sample/i], // WS-DEMO: Experiments A/B (fire-158)
  ['/forms', /forms|submission|lead|spam|sample/i], // WS-DEMO: Forms lead capture (fire-159)
  ['/audit', /audit|accessibility|findings|sample/i], // WS-DEMO: Site/Gadget Audit (fire-163)
  ['/logs', /logs|runtime|stream|sample stream/i], // WS-DEMO: Logs live runtime tail (fire-166)
  ['/domains', /domains|custom route|DNS|SSL|sample data/i], // WS-DEMO: Domains custom routes (fire-168)
  ['/queues', /queues|async|depth|dead-letter|sample data/i], // WS-DEMO: Queues async work (fire-169)
  ['/secrets', /secrets|rotation|never shown|sample data/i], // WS-DEMO: Secrets env-vars (fire-170)
  ['/storage', /storage|d1|kv|r2|usage|sample data/i], // WS-DEMO: Storage D1/KV/R2 (fire-171)
  ['/images', /images|variant|deliver|signed|sample/i], // WS-DEMO: Cloudflare Images — store + deliver variants (fire-278)
  ['/compute', /compute|workers|invocation|cpu|p95|sample runtime/i], // WS-DEMO: Compute edge runtime (fire-172; DEPTH live-workers band fire-210)
  ['/metrics', /metrics|requests|error rate|latency|sample series/i], // WS-DEMO: Metrics per-gadget (fire-173; DEPTH live band fire-205)
  ['/permissions', /permissions|role|capabilit|member|sample data/i], // WS-DEMO: Permissions RBAC (fire-174)
  ['/provenance', /provenance|audit|changed|before|sample data/i], // WS-DEMO: Provenance audit trail (fire-175)
  ['/workflows', /workflows|durable|step|retr|trigger|sample data/i], // WS-DEMO: Workflows durable automation (fire-176)
  ['/ai-gateway', /gateway|cache|provider|latency|sample data/i], // WS-DEMO: AI Gateway proxy (fire-177)
  ['/vectorize', /vectorize|vector|embedding|similarity|index|sample data/i], // WS-DEMO: Vectorize vector DB (fire-178)
  ['/durable-objects', /durable objects|stateful|instance|hibernat|sample data/i], // WS-DEMO: Durable Objects (fire-179)
  ['/email', /email|deliver|bounce|ses|sample data/i], // WS-DEMO: Email SES deliverability (fire-180)
  ['/social', /social|schedule|publish|queue|sample data/i], // WS-DEMO: Social post-queue auto-scheduler (fire-254)
  ['/search', /search|result|index|content|sample data/i], // WS-DEMO: Universal content search (D1 FTS5) (fire-257)
  ['/autorag', /ai search|managed rag|indexes|answer|sample data/i], // WS-DEMO: AI Search / managed RAG — ask→cited-answer + citation drill-in (fire-264, a11y-covered fire-267)
  ['/notifications', /notifications|alert|unread|deploy|security|sample data/i], // WS-DEMO: Notifications center (fire-181)
  ['/environments', /environments|lifecycle|quota|budget|autostop|sample data/i], // WS-DEMO: Environments governance — Coder (fire-182)
  ['/approvals', /approvals|pending|approve|risk|deploy|sample data/i], // WS-DEMO: Approvals HITL governance queue (fire-183)
  ['/tasks', /tasks|running|failed|succeeded|retry|sample runs/i], // WS-DEMO: Tasks work-tracker primitive (fire-184; fire-214 DEPTH live-results band, honesty "sample runs")
  ['/tools', /tools|built-in|connection|mcp|enable|sample catalog/i], // WS-DEMO: Tools capability registry — §30 chain (fire-185)
  ['/presence', /presence|active now|agent|session|device|sample presence/i], // WS-DEMO: Presence manifest + live whoami active-now band — §47 (fire-186, DEPTH fire-203)
  ['/analytics-engine', /analytics engine|dataset|sampl|http_requests|SELECT|sample data/i], // WS-DEMO: Analytics Engine — raw CF telemetry (fire-192)
  ['/hyperdrive', /hyperdrive|postgres|mysql|pool|cache|sample data/i], // WS-DEMO: Hyperdrive — external DB pooling/caching (fire-193)
  ['/realtime', /realtime|room|participant|audio|video|sample data/i], // WS-DEMO: Realtime — WebRTC SFU calls §56-58 (fire-194)
  ['/sandboxes', /sandboxes|python|node|cpu|exit|sample data/i], // WS-DEMO: Sandboxes — isolated code execution T3 (fire-195)
  ['/mcp', /mcp|server|transport|tools exposed|stdio|sample data/i], // WS-DEMO: MCP Servers — protocol capability layer #30/#67 (fire-196)
  ['/research', /research|parallel|sources|findings|synthesiz|sample data/i], // WS-DEMO: Research — Manus parallel research→synthesize (fire-197)
  ['/knowledge', /knowledge|provenance|confidence|stale|via |sample entries/i], // WS-DEMO: Knowledge — Onyx live/synced layer, #33 view 2 (fire-198; DEPTH live-sources band fire-208)
  ['/skills', /agent skills|invocation|success|reusable|per category|sample data/i], // WS-DEMO: Agent Skills — the skill registry #29 (fire-199)
  ['/artifacts', /artifacts|variant|explorable|document|design|sample data/i], // WS-DEMO: Artifacts — explorable artifact canvas w/ variants (fire-200)
  ['/sources', /sources|ingest|records|synced|frequency|connected|sample sync/i], // WS-DEMO: Sources — sync-connector manifest + live connected-accounts band (fire-201, DEPTH fire-202)
  ['/database', /database|schema|tables|sample data/i], // WS-DEMO: Database Studio (fire-148/149 — was unaudited)
  ['/blueprints', /blueprint/i],
  ['/explore', /blueprint|explore|template|featured/i],
  ['/models', /model|available|provider/i],
  ['/providers', /provider/i],
  ['/gatekeepers', /gatekeeper|connect|integration/i],
  ['/connections', /connection|integration|provider/i],
  ['/profile', /profile|account|display name/i],
  ['/admin', /access to this page|admin/i], // fire-151: ba-e2e (non-admin) sees the 'You don't have access' DENIED state — a real non-admin surface worth auditing; the admin CATALOG needs an admin session (verify-admin-platform). Signal matches the denied state so the audit settles honestly, not by timeout. Caught + gate-enforced by check-a11y-coverage.
]
for (const [path, signal] of ROUTES.filter(([p]) => !ONLY || p.includes(ONLY))) {
  await page.goto(`${APEX}${path}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForSelector('aside', { timeout: 25000 }).catch(() => {})
  await page.waitForFunction((re) => new RegExp(re.source, re.flags).test(document.body.innerText), signal, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1200)
  out.push(await audit(path))
}

// 12th surface — the fullscreen workspace EDITOR (dynamic /workspace/$id). Reached by click-nav into
// an existing gadget (no static path). The OS's most complex surface; its a11y was never audited.
await page.goto(`${APEX}/gadgets`, { waitUntil: 'domcontentloaded', timeout: 40000 })
await page.waitForSelector('aside', { timeout: 25000 }).catch(() => {})
await page.waitForTimeout(1200)
const openLink = page.getByRole('link', { name: /^Open / }).first()
if (await openLink.count()) {
  await openLink.click({ timeout: 8000 }).catch(() => {})
  await page.waitForFunction(() => /\/workspace\//.test(location.pathname), { timeout: 20000 }).catch(() => {})
  await page.waitForFunction(() => document.body.innerText.trim().length > 200, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(2500)
  out.push(await audit('/workspace (editor)'))

  // 12b. The editor's Resources tab (ResourcesPanel) — a 16-card grid with Live/Preview/Soon chips +
  // "View →" jumps. Its chips previously used brand-on-tint text (sub-AA in light); audit it so that
  // class can't regress unseen (the Resources tab is reachable only by clicking it inside the editor).
  const resTab = page.getByRole('button', { name: /^Resources$/ }).first()
  if (await resTab.count().then((c) => c > 0).catch(() => false)) {
    await resTab.click({ timeout: 8000 }).catch(() => {})
    await page.waitForFunction(() => /Live|Preview|Soon/.test(document.body.innerText), { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(1000)
    out.push(await audit('/workspace editor — Resources tab'))
  } else {
    console.log('\nℹ️  skipped Resources-tab audit — tab not present (chat-mode pane)')
  }
} else {
  console.log('\nℹ️  skipped /workspace editor audit — no gadget to open')
}

await browser.close()
const totalSerious = out.reduce((n, o) => n + o.serious, 0)
const totalTypes = out.reduce((n, o) => n + o.violations.length, 0)
console.log(`\n${JSON.stringify({ surfaces: out.length, totalViolationTypes: totalTypes, totalSerious }, null, 2)}`)
if (totalSerious) console.log(`\n❌ FAIL: ${totalSerious} serious/critical a11y violation(s) across ${out.length} surfaces`)
else console.log(`\n✅ PASS: 0 serious/critical a11y violations across ${out.length} surfaces${totalTypes ? ` (${totalTypes} minor — review)` : ''}`)
process.exit(totalSerious ? 1 : 0)

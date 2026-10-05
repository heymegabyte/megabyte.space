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
for (const [path, signal] of [
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
  ['/database', /database|schema|tables|sample data/i], // WS-DEMO: Database Studio (fire-148/149 — was unaudited)
  ['/blueprints', /blueprint/i],
  ['/explore', /blueprint|explore|template|featured/i],
  ['/models', /model|available|provider/i],
  ['/providers', /provider/i],
  ['/gatekeepers', /gatekeeper|connect|integration/i],
  ['/connections', /connection|integration|provider/i],
  ['/profile', /profile|account|display name/i],
  ['/admin', /access to this page|admin/i], // fire-151: ba-e2e (non-admin) sees the 'You don't have access' DENIED state — a real non-admin surface worth auditing; the admin CATALOG needs an admin session (verify-admin-platform). Signal matches the denied state so the audit settles honestly, not by timeout. Caught + gate-enforced by check-a11y-coverage.
]) {
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

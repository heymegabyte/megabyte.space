#!/usr/bin/env node
/**
 * fire-91 GP-035 (responsive deep journey): the authed OS must work on smartphone / tablet / desktop
 * — no horizontal overflow, the primary nav reachable (mobile = hamburger drawer; ≥md = sidebar),
 * and 0 console errors at every viewport. Force-login means every MOBILE user now signs in + drives
 * the OS on a phone, so this is a real contract. BA-authed real Chromium, PROD. Needs BA creds.
 */
import { chromium } from 'playwright'

const APEX = 'https://megabyte.space'
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD
if (!EMAIL || !PASSWORD) { console.log('missing BA creds'); process.exit(2) }

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, mobileNav: true },
  { name: 'tablet', width: 768, height: 1024, mobileNav: false },
  { name: 'desktop', width: 1280, height: 900, mobileNav: false },
]

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
})
await page.addInitScript(() => { try { localStorage.setItem('megabyteOS_entered', '1') } catch {} })
let errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

// Sign in once.
await page.goto(`${APEX}/signin`, { waitUntil: 'domcontentloaded', timeout: 40000 })
await page.fill('input[type="email"]', EMAIL)
await page.fill('input[type="password"]', PASSWORD)
await page.click('[data-testid="auth-submit"]')
await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(800)

const overflow = () =>
  page.evaluate(() => {
    const d = document.documentElement
    return { scrollW: d.scrollWidth, innerW: window.innerWidth, overflow: d.scrollWidth - window.innerWidth }
  })

const results = []
for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  const before = errors.length
  // Land on the authed OS (Pulse) at this viewport.
  await page.goto(`${APEX}/pulse`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(1800)
  const o1 = await overflow()

  // Navigate to Gadgets the way a user at this viewport would.
  let navOk = false
  let drawerOk = !vp.mobileNav // n/a on ≥md
  try {
    if (vp.mobileNav) {
      // Mobile: open the hamburger drawer, then tap Gadgets inside it.
      const burger = page.locator('[aria-label="Open menu"]').first()
      if (await burger.isVisible().catch(() => false)) {
        await burger.click({ timeout: 6000 })
        await page.waitForTimeout(500)
        drawerOk = await page.getByRole('link', { name: 'Gadgets', exact: false }).first().isVisible().catch(() => false)
      }
    }
    await page.getByRole('link', { name: 'Gadgets', exact: false }).first().click({ timeout: 6000 })
    await page.waitForTimeout(1500)
    navOk = /\/gadgets/.test(page.url())
  } catch { /* navOk stays false */ }
  const o2 = await overflow()
  const newErrors = errors.length - before
  await page.screenshot({ path: `scripts/.responsive/${vp.name}.png` }).catch(() => {})

  const ok = o1.overflow <= 2 && o2.overflow <= 2 && navOk && drawerOk && newErrors === 0
  results.push({ vp: vp.name, w: vp.width, pulseOverflow: o1.overflow, gadgetsOverflow: o2.overflow, drawerOk, navOk, newErrors, ok })
  console.log(`${ok ? '✅' : '❌'} ${vp.name} (${vp.width}px) — pulseOverflow=${o1.overflow} gadgetsOverflow=${o2.overflow} drawer=${drawerOk} nav=${navOk} err=${newErrors}`)
}

await browser.close()
const passed = results.filter((r) => r.ok).length
console.log(JSON.stringify({ passed, total: results.length, totalConsoleErrors: errors.length, results }, null, 2))
if (errors.length) console.log('errors:', errors.join(' | ').slice(0, 400))
console.log(passed === results.length ? `✅ RESPONSIVE GREEN: ${passed}/${results.length} viewports` : `❌ ${results.length - passed} viewport(s) failed`)
process.exit(passed === results.length && errors.length === 0 ? 0 : 1)

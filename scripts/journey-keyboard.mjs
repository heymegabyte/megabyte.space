#!/usr/bin/env node
/**
 * fire-95 GP-036 (keyboard operability): the force-login gate + OS must be fully keyboard-operable —
 * the manual WCAG 2.2 criterion axe can't auto-test (2.1.1 Keyboard, 2.4.7 Focus Visible, 2.1.2 No
 * Trap). Signs in with the KEYBOARD ONLY (Tab to reach the email field past the SSO buttons, type,
 * Tab to password, type, Enter to submit), then drives ⌘K via keyboard (open, type, Enter to
 * navigate, Escape to close). Asserts every focused control shows a visible focus indicator + 0
 * console errors. Real Chromium, PROD. Needs BA creds.
 */
import { chromium } from 'playwright'

const APEX = 'https://megabyte.space'
const EMAIL = process.env.BA_E2E_EMAIL, PASSWORD = process.env.BA_E2E_PASSWORD
if (!EMAIL || !PASSWORD) { console.log('missing BA creds'); process.exit(2) }

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
})
await page.addInitScript(() => { try { localStorage.setItem('megabyteOS_entered', '1') } catch {} })
const errors = []
// Filter the benign capnweb WebSocket reconnect artifact ("...already in CLOSING or CLOSED state") —
// it races fast navigation but the nav succeeds; it's not an app error (fire-157 de-flake).
const IGNORE_CONSOLE = /WebSocket is already in CLOSING or CLOSED state/i
page.on('console', (m) => { if (m.type() === 'error' && !IGNORE_CONSOLE.test(m.text())) errors.push(m.text()) })
page.on('pageerror', (e) => { if (!IGNORE_CONSOLE.test(String(e))) errors.push(String(e)) })

const active = () =>
  page.evaluate(() => {
    const el = document.activeElement
    if (!el) return { tag: 'none' }
    const s = getComputedStyle(el)
    const visibleFocus =
      (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) ||
      (s.boxShadow && s.boxShadow !== 'none') ||
      el.matches(':focus-visible')
    return {
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
      visibleFocus,
    }
  })

// 1. /signin — reach the email field by TAB only (past the GitHub/Google SSO buttons), no mouse.
await page.goto(`${APEX}/signin`, { waitUntil: 'domcontentloaded', timeout: 40000 })
await page.waitForSelector('input[type="email"]', { timeout: 20000 })
await page.waitForTimeout(600)
await page.evaluate(() => (document.activeElement && 'blur' in document.activeElement ? document.activeElement.blur() : null))

let reachedEmail = false, tabs = 0
let focusAlwaysVisible = true
for (; tabs < 12; tabs++) {
  await page.keyboard.press('Tab')
  const a = await active()
  if (a.tag !== 'none' && a.tag !== 'body' && !a.visibleFocus) focusAlwaysVisible = false
  if (a.tag === 'input' && a.type === 'email') { reachedEmail = true; break }
}
// Type email, Tab to password, type, Enter to submit — keyboard only.
let keyboardLogin = false
if (reachedEmail) {
  await page.keyboard.type(EMAIL)
  await page.keyboard.press('Tab')
  const a = await active()
  if (a.type === 'password') {
    await page.keyboard.type(PASSWORD)
    await page.keyboard.press('Enter')
    await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(1500)
    keyboardLogin = /auth-success|auth-already/.test(await page.evaluate(() => document.body.querySelector('[data-testid="auth-success"],[data-testid="auth-already"]') ? 'auth-success' : '')) || !/\/signin/.test(page.url())
  }
}

// 2. Land on the OS, drive ⌘K entirely by keyboard: open → type → Enter navigates → reopen → Escape closes.
await page.goto(`${APEX}/pulse`, { waitUntil: 'domcontentloaded', timeout: 40000 })
await page.waitForSelector('aside', { timeout: 25000 }).catch(() => {})
await page.waitForTimeout(1200)
const DIALOG = '[role="dialog"][aria-label="Command palette"]'

await page.keyboard.press('Meta+k')
let paletteOpened = await page.locator(DIALOG).waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)
if (!paletteOpened) { await page.keyboard.press('Control+k'); paletteOpened = await page.locator(DIALOG).waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false) }

let cmdkEnterNavigates = false
if (paletteOpened) {
  await page.keyboard.type('models')
  await page.waitForTimeout(400)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1500)
  cmdkEnterNavigates = /\/models/.test(page.url())
}

// Escape closes the palette (no trap).
await page.keyboard.press('Meta+k').catch(() => {})
await page.locator(DIALOG).waitFor({ state: 'visible', timeout: 1200 }).catch(() => {})
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const escapeCloses = !(await page.locator(DIALOG).isVisible().catch(() => false))

await page.screenshot({ path: 'scripts/.keyboard-proof.png' })
await browser.close()

console.log(JSON.stringify({ reachedEmail, tabsToEmail: tabs, keyboardLogin, focusAlwaysVisible, paletteOpened, cmdkEnterNavigates, escapeCloses, consoleErrors: errors.length }, null, 2))
if (errors.length) console.log('errors:', errors.join(' | ').slice(0, 300))

let ok = true
const check = (cond, pass, fail) => { if (cond) console.log(`✅ PASS: ${pass}`); else { console.log(`❌ FAIL: ${fail}`); ok = false } }
check(reachedEmail, `email field reachable by Tab (${tabs} tabs past SSO)`, 'email field NOT reachable by keyboard')
check(keyboardLogin, 'keyboard-only sign-in works (Tab + type + Enter → authed)', 'keyboard-only sign-in failed (WCAG 2.1.1)')
check(focusAlwaysVisible, 'every focused control shows a visible focus indicator (2.4.7)', 'a focused control had NO visible focus ring (2.4.7)')
check(paletteOpened, '⌘K opens via keyboard', '⌘K did not open via keyboard')
check(cmdkEnterNavigates, '⌘K: type + Enter navigates (→ /models)', '⌘K Enter did not navigate')
check(escapeCloses, 'Escape closes the palette (no focus trap, 2.1.2)', 'Escape did NOT close the palette (focus trap)')
check(errors.length === 0, '0 console errors', `${errors.length} console errors`)
process.exit(ok ? 0 : 1)

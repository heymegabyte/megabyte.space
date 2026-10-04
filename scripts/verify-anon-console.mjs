#!/usr/bin/env node
/**
 * fire-90 repro + proof: an ANONYMOUS visitor (no BA session, cleared storage) to the apex must be
 * FORCED to sign in before the OS, with ZERO console errors. Captures console.error + pageerror on
 * the first anonymous load. Pre-fix this is RED (the fire-86 global CommandPaletteHost mount calls
 * the throwing useAuthenticatedApi() with no AuthProvider on the anonymous path); post-fix GREEN.
 * No creds needed — this is the anonymous path.
 */
import { chromium } from 'playwright'

const APEX = 'https://megabyte.space'
const PATH = process.argv[2] || '/'
const ENTERED = process.argv.includes('--entered')
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
})
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(`pageerror: ${String(e)}`))

// Fresh anonymous visit — clear storage (or pre-set the entered flag to test the dismissed path).
await page.addInitScript((entered) => {
  try { localStorage.clear(); if (entered) localStorage.setItem('megabyteOS_entered', '1') } catch {}
}, ENTERED)
await page.goto(`${APEX}${PATH}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
await page.waitForTimeout(3500) // let the shell settle + any authed-RPC attempts fire

const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 200).replace(/\s+/g, ' ')
const url = page.url().replace(APEX, '')
// Is a sign-in affordance forced/visible? (landing "Enter" or the /signin surface).
const signInVisible = await page
  .locator('text=/sign in|signin|enter the os|continue with|magic link|log ?in/i')
  .first()
  .isVisible()
  .catch(() => false)
// Did the raw OS shell leak in anonymously? (the sidebar nav should NOT render pre-login.)
const osShellLeaked = await page.locator('aside nav').first().isVisible().catch(() => false)

await page.screenshot({ path: 'scripts/.anon-console-proof.png' })
await browser.close()

console.log(JSON.stringify({ url, signInVisible, osShellLeaked, consoleErrors: errors.length, bodyPreview: bodyText }, null, 2))
if (errors.length) console.log('\nERRORS:\n' + errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n').slice(0, 1200))

let ok = true
if (errors.length) { console.log(`\n❌ FAIL: ${errors.length} console error(s) on the anonymous load`); ok = false }
else console.log('\n✅ PASS: 0 console errors on the anonymous load')
if (osShellLeaked) { console.log('❌ FAIL: the OS shell (sidebar nav) rendered WITHOUT login — force-login not enforced'); ok = false }
else console.log('✅ PASS: the OS shell did not leak pre-login')
process.exit(ok ? 0 : 1)

#!/usr/bin/env node
/**
 * verify-login-gate: an anonymous visitor is sent to the canonical /login screen, offering
 * Better Auth Google + GitHub + magic-link. An AUTHED visitor (session cookie) gets the OS SPA, not
 * the gate (no flash). Pure HTTP against the RAW HTML — proves the login is in the first-load bytes,
 * not JS-rendered. Authed leg needs BA_E2E_EMAIL / BA_E2E_PASSWORD.
 */
const APEX = 'https://megabyte.space'
const email = process.env.BA_E2E_EMAIL, password = process.env.BA_E2E_PASSWORD
const R = []
const rec = (name, pass, note = '') => { R.push(pass); console.log(`${pass ? '✅' : '❌'} ${name}${note ? ' — ' + note : ''}`) }

async function getHtml(path, cookie) {
  const res = await fetch(APEX + path, {
    headers: { accept: 'text/html,application/xhtml+xml', ...(cookie ? { cookie } : {}) },
    redirect: 'manual',
  })
  return { status: res.status, ctype: res.headers.get('content-type') || '', body: await res.text() }
}

// 1. ANON / → canonical same-origin /login.
{
  const res = await fetch(APEX + '/', { headers: { accept: 'text/html' }, redirect: 'manual' })
  rec('anon / → /login', res.status === 302 && new URL(res.headers.get('location'), APEX).pathname === '/login', `status=${res.status}`)
}

// 2. /login contains the three public methods and no password field.
{
  const a = await getHtml('/login')
  rec('anon /login → login page', a.status === 200 && /data-testid="login-gate"/.test(a.body), `status=${a.status}`)
  rec('/login → Google SSO', /Google/i.test(a.body) && /sign-in\/social/.test(a.body))
  rec('/login → GitHub SSO', /GitHub/i.test(a.body))
  rec('/login → magic email', /type="email"/i.test(a.body) && /sign-in\/magic-link/.test(a.body))
  rec('/login → password UI hidden', !/type="password"|mb-password/i.test(a.body))
  const b = await getHtml('/logs')
  rec('anon /logs → /login', b.status === 302, `status=${b.status}`)
}

// 3. AUTHED / → the OS SPA, NOT the gate (no authed flash).
if (email && password) {
  const si = await fetch(APEX + '/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', origin: APEX },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  })
  const set = typeof si.headers.getSetCookie === 'function' ? si.headers.getSetCookie() : [si.headers.get('set-cookie')].filter(Boolean)
  const cookie = set.map((c) => c.split(';')[0]).join('; ')
  const gotCookie = /better-auth\.session_token=/.test(cookie)
  rec('ba-e2e email sign-in → session cookie', gotCookie)
  if (gotCookie) {
    const { status, body } = await getHtml('/', cookie)
    rec('authed / → OS SPA (id="root"), NOT the gate', status === 200 && /id="root"/.test(body) && !/data-testid="login-gate"/.test(body), `status=${status}`)
  }
} else {
  rec('authed leg (skipped — no BA_E2E creds)', true)
}

const passed = R.filter(Boolean).length
console.log(`\n${passed}/${R.length} assertions green`)
if (passed === R.length) console.log('✅ LOGIN-GATE GREEN')
else { console.log('❌ LOGIN-GATE RED'); process.exit(1) }

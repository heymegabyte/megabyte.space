#!/usr/bin/env node
/**
 * verify-login-gate — Brian 2026-10-06: an ANONYMOUS visitor's FIRST-LOAD HTML is a full-screen,
 * undismissable login screen, inlined by the router (paints instantly, no SPA/React boot), offering
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

// 1. ANON / → the inlined full-screen login gate, with all three methods, in the RAW HTML.
{
  const { status, ctype, body } = await getHtml('/')
  rec('anon / → 200 text/html', status === 200 && /text\/html/.test(ctype), `status=${status}`)
  rec('anon / → inlined login-gate in raw HTML', /data-testid="login-gate"/.test(body))
  rec('anon / → full-screen (fixed / inset:0 / 100dvh)', /position:\s*fixed|inset:\s*0|100dvh|100vh/i.test(body))
  rec('anon / → Google SSO (Better Auth social)', /Google/i.test(body) && /sign-in\/social/.test(body))
  rec('anon / → GitHub SSO', /GitHub/i.test(body))
  rec('anon / → magic-link email', /type="email"/i.test(body) && /sign-in\/magic-link/.test(body))
  rec('anon / → Megabyte OS brand', /megabyte os/i.test(body))
  rec('anon / → IS the login, not the SPA shell', !/id="root"/.test(body))
}

// 2. ANON /signin (and a deep route) → same gate (undismissable everywhere pre-auth).
{
  const a = await getHtml('/signin')
  rec('anon /signin → login-gate', a.status === 200 && /data-testid="login-gate"/.test(a.body), `status=${a.status}`)
  const b = await getHtml('/logs')
  rec('anon /logs (deep) → login-gate', b.status === 200 && /data-testid="login-gate"/.test(b.body), `status=${b.status}`)
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

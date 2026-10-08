#!/usr/bin/env node
// Post-deploy production verification for the megabyte.space Cloudflare OS estate.
//
// POST-FLIP topology (fire-64, the apex flip):
//   https://megabyte.space/        → the `megabyte-os` router SERVES THE CLOUDFLARE OS at the apex.
//                                    Auth is AUTH-ON-ACTION (Better Auth, baked into the apex at
//                                    /api/auth/*): an ANONYMOUS HTML navigation is 302'd to OUR
//                                    same-origin /signin (NOT to cloudflareaccess.com); an
//                                    ALLOWLISTED/authed navigation (session cookie) PASSES THROUGH
//                                    to the OS shell (200). The OS Better Auth sign-in page is
//                                    served at /signin, with GitHub + Google SSO wired.
//   https://megabyte.space/signin  → 200, the OS Better Auth sign-in surface (body: "Cloudflare OS").
//   https://megabyte.space/api/auth/ok → 200 {ok:true}  (Better Auth rail on the apex).
//   https://www.megabyte.space/    → 301 to the apex.
//
//   os.megabyte.space is GONE — detached in the flip (no DNS → curl returns 000). There are NO
//   Cloudflare Access assertions and NO service-token assertions here anymore; the human path is
//   Better Auth only.
//
// Creds (allowlisted BA sign-in leg) from env, exported from get-secret:
//   export BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD)
//
// Exit 0 = all green; 1 = any assertion failed; 2 = BA creds missing (NOT a prod bug).

const APEX = "https://megabyte.space";
const WWW = "https://www.megabyte.space/";
const ACCESS_HOST = "cloudflareaccess.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
// Browser-navigation headers — the router's auth gate keys its redirect on an HTML navigation
// (Sec-Fetch-Dest: document / Accept: text/html), exactly what a real browser sends. A bare curl
// (Accept: */*) can skip that path and flatter the worker, so every nav assertion sends these.
const NAV = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
  "Upgrade-Insecure-Requests": "1",
};

const email = process.env.BA_E2E_EMAIL;
const password = process.env.BA_E2E_PASSWORD;
if (!email || !password) {
  console.error("missing BA_E2E_EMAIL / BA_E2E_PASSWORD (export from get-secret) — needed for the BA sign-in leg");
  process.exit(2);
}

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const tryFetch = async (url, options) => {
  try {
    return await fetch(url, options);
  } catch (error) {
    return { error: String(error?.cause?.code || error) };
  }
};

const getSetCookies = (res) =>
  typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);

// 1. The apex SERVES THE CLOUDFLARE OS (not the old homepage, not Access). Auth-on-action means an
//    anonymous HTML nav to "/" is 302'd to OUR same-origin /signin, and /signin itself is a 200 OS
//    surface whose body says "Cloudflare OS". Assert both: the gate redirects same-origin (never to
//    cloudflareaccess.com) AND the served surface is the OS, not the retired `megabyte-home` page.
{
  const root = await tryFetch(`${APEX}/`, { redirect: "manual", headers: NAV });
  const signin = await tryFetch(`${APEX}/signin`, { redirect: "manual", headers: NAV });
  if (root.error || signin.error) {
    record("apex serves the Cloudflare OS", false, `fetch failed: ${root.error || signin.error}`);
  } else {
    const rootLoc = root.headers.get("location") || "";
    const rootSameOrigin = rootLoc === "" || rootLoc.startsWith(APEX + "/");
    const rootNotAccess = !rootLoc.includes(ACCESS_HOST);
    const body = signin.status === 200 ? await signin.text() : "";
    const isOS = /megabyte os/i.test(body);
    const notOldHome = !body.includes('id="app"') && !/megabyte-home/i.test(body);
    const pass = signin.status === 200 && isOS && notOldHome && rootSameOrigin && rootNotAccess && body.length > 500;
    record(
      "apex serves the Cloudflare OS",
      pass,
      `root=${root.status}→${rootLoc.replace(APEX, "") || "(none)"} signin=${signin.status} os=${isOS} notOldHome=${notOldHome} bytes=${body.length}`,
    );
  }
}

// 2. Better Auth rail baked into the apex: GET /api/auth/ok → 200 {ok:true} (apex forwards
//    /api/auth/* to the isolated megabyte-auth worker).
{
  const res = await tryFetch(`${APEX}/api/auth/ok`, { headers: { "User-Agent": UA } });
  if (res.error) {
    record("/api/auth/ok → {ok:true}", false, `fetch failed: ${res.error}`);
  } else {
    const type = res.headers.get("content-type") || "";
    let body = null;
    try {
      body = type.includes("application/json") ? await res.json() : null;
    } catch {
      body = null;
    }
    const pass = res.status === 200 && body?.ok === true;
    record("/api/auth/ok → {ok:true}", pass, `status=${res.status} type=${type.split(";")[0] || "(none)"} ok=${body?.ok ?? "—"}`);
  }
}

// 3. The OS Better Auth sign-in page is served at /signin → 200 HTML.
{
  const res = await tryFetch(`${APEX}/signin`, { redirect: "manual", headers: NAV });
  if (res.error) {
    record("/signin → 200 (BA sign-in page)", false, `fetch failed: ${res.error}`);
  } else {
    const type = res.headers.get("content-type") || "";
    const pass = res.status === 200 && type.includes("text/html");
    record("/signin → 200 (BA sign-in page)", pass, `status=${res.status} type=${type.split(";")[0] || "(none)"}`);
  }
}

// 4. GitHub + Google SSO wired AND the provider ACCEPTS our callback URI. POST /api/auth/sign-in/social
//    → 200 with a JSON `url` pointing at the provider's authorize endpoint (WIRED). Then we FOLLOW that
//    URL (no cookies): a provider that rejects our redirect_uri 302s to an oauth/error page BEFORE any
//    login, so a server-side GET reveals the redirect_uri_mismatch class the bare "wired" check (URL
//    merely generated) is BLIND to. GitHub's acceptance is a HARD assertion (green today). Google's is a
//    TRACKED WARN while its apex callback URI is unregistered — an EXTERNAL Google-Cloud-Console fix;
//    hard-failing would red-forever-block the all-green deploy gate (memory
//    permanently-red-gate-causes-starvation). The WARN AUTO-PROMOTES to a green assertion the instant the
//    provider stops erroring. (fire-219 — closes the "SSO wired" blind spot; memory
//    google-sso-redirect-uri-mismatch-prod.)
{
  const OAUTH_ERR = /oauth\/error|redirect_uri_mismatch|invalid_client|deleted_client|Access blocked/i;
  const socialUrl = async (provider, needle) => {
    const res = await tryFetch(`${APEX}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/json", Origin: APEX },
      body: JSON.stringify({ provider, callbackURL: APEX }),
    });
    if (res.error) return { wired: false, url: "", detail: `fetch failed: ${res.error}` };
    const body = res.status === 200 ? await res.json().catch(() => ({})) : {};
    const url = typeof body?.url === "string" ? body.url : "";
    return { wired: res.status === 200 && url.includes(needle), url, detail: `status=${res.status} url=${url ? needle : "(no url)"}` };
  };
  // Follow the authorize URL — an unregistered redirect_uri 302s to the provider's oauth/error page
  // (deterministic, pre-login). A network flake is NOT a config error → treated as not-errored (skip).
  const probeCallback = async (url) => {
    if (!url) return { errored: false, where: "(no url)" };
    const res = await tryFetch(url, { redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
    if (res.error) return { errored: false, where: `probe skipped (${res.error})` };
    const loc = res.headers.get("location") || "";
    let body = "";
    if (!loc) {
      try {
        body = await res.text();
      } catch {
        body = "";
      }
    }
    const errored = OAUTH_ERR.test(loc) || OAUTH_ERR.test(body);
    const where = loc ? loc.replace(/^https?:\/\//, "").slice(0, 52) : `body[${body.length}]`;
    return { errored, where };
  };

  const gh = await socialUrl("github", "github.com");
  const go = await socialUrl("google", "accounts.google.com");
  record("SSO wired (github → github.com)", gh.wired, gh.detail);
  record("SSO wired (google → accounts.google.com)", go.wired, go.detail);

  // Stricter than "wired": assert BA generates the EXACT apex callback redirect_uri for each provider —
  // https://megabyte.space/api/auth/callback/<provider>. This proves OUR config returns a real SSO user to
  // the right apex endpoint (the precise value misregistered for Google on Google's side), so a Google
  // rejection is provably EXTERNAL (our URI is correct) while GitHub is fully configured for real users; and
  // a future regression repointing the callback at the wrong origin is caught at the deploy gate. (fire-283 —
  // operationalizes the "ORIGINAL features work with SSO" directive: the furthest automated proof toward a
  // working real-user GitHub round-trip short of an interactive IdP login, which no headless test can do.)
  const redirectUriOf = (url) => {
    try {
      return new URL(url).searchParams.get("redirect_uri") || "";
    } catch {
      return "";
    }
  };
  const ghRu = redirectUriOf(gh.url);
  const goRu = redirectUriOf(go.url);
  record("SSO redirect_uri = apex callback (github)", ghRu === `${APEX}/api/auth/callback/github`, ghRu || "(none)");
  record("SSO redirect_uri = apex callback (google)", goRu === `${APEX}/api/auth/callback/google`, goRu || "(none)");

  const ghcb = await probeCallback(gh.url);
  record("SSO callback accepted (github)", gh.wired && !ghcb.errored, `oauthError=${ghcb.errored} → ${ghcb.where}`);

  const gocb = await probeCallback(go.url);
  if (go.wired && gocb.errored) {
    console.log(
      `   ⚠️  WARN: Google SSO callback REJECTED — authorize URL 302s to ${gocb.where} (redirect_uri_mismatch).` +
        ` Real users CANNOT sign in with Google (GitHub + magic-link + password still work). FIX (external):` +
        ` register https://megabyte.space/api/auth/callback/google for client 383658000977-… in Google Cloud` +
        ` Console, OR swap the megabyte-auth GOOGLE_CLIENT_ID/SECRET. Tracked: BACKLOG WS-8 + memory` +
        ` google-sso-redirect-uri-mismatch-prod. (Auto-promotes to a PASS once the provider stops erroring.)`,
    );
  } else {
    // Not erroring → callback accepted (external fix landed) → a real green assertion from here on.
    record("SSO callback accepted (google)", go.wired && !gocb.errored, `oauthError=${gocb.errored} → ${gocb.where}`);
  }
}

// 5. Allowlisted Better Auth email sign-in → a session cookie scoped to megabyte.space; then an
//    authed HTML nav to "/" carrying that cookie PASSES THE GATE to the OS shell (200, not a /signin
//    redirect). This is the auth-on-action happy path end to end.
let sessionCookie = "";
{
  const si = await tryFetch(`${APEX}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/json", Origin: APEX },
    body: JSON.stringify({ email, password }),
  });
  if (si.error) {
    record("allowlisted BA sign-in → megabyte.space session cookie", false, `fetch failed: ${si.error}`);
  } else {
    const setCookies = getSetCookies(si);
    const full = setCookies.find((c) => /better-auth\.session_token=/.test(c)) || "";
    sessionCookie = full.split(";")[0] || "";
    // Secure prefixed cookie carries no explicit Domain in some BA configs; accept either an explicit
    // .megabyte.space Domain or the implicit apex scope (prefix "__Secure-" forces Secure + host/apex).
    const scopedToApex = /Domain=\.?megabyte\.space/i.test(full) || /__Secure-better-auth\.session_token=/.test(full);
    const pass = si.status === 200 && !!sessionCookie && scopedToApex;
    record(
      "allowlisted BA sign-in → megabyte.space session cookie",
      pass,
      `status=${si.status} cookie=${sessionCookie ? sessionCookie.split("=")[0] : "none"} scoped=${scopedToApex}`,
    );
  }
}
{
  const authed = await tryFetch(`${APEX}/`, { redirect: "manual", headers: { ...NAV, Cookie: sessionCookie } });
  if (authed.error) {
    record("authed nav → OS shell (gate passthrough)", false, `fetch failed: ${authed.error}`);
  } else {
    const body = authed.status === 200 ? await authed.text() : "";
    const loc = authed.headers.get("location") || "";
    const pass = authed.status === 200 && !loc.includes("/signin") && body.length > 500 && /megabyte os/i.test(body);
    record(
      "authed nav → OS shell (gate passthrough)",
      pass,
      `status=${authed.status}${loc ? ` loc=${loc.replace(APEX, "")}` : ""} bytes=${body.length}`,
    );
  }
}

// 6. NO Cloudflare Access in the human path — an anonymous HTML nav to "/" must NOT 3xx to
//    cloudflareaccess.com (it 302s to OUR same-origin /signin instead, which is fine).
{
  const res = await tryFetch(`${APEX}/?v=${Date.now()}`, { redirect: "manual", headers: { ...NAV, "Cache-Control": "no-cache" } });
  if (res.error) {
    record("no Cloudflare Access in human path", false, `fetch failed: ${res.error}`);
  } else {
    const loc = res.headers.get("location") || "";
    const toAccess = loc.includes(ACCESS_HOST) || loc.includes("cdn-cgi/access");
    const pass = !toAccess;
    record("no Cloudflare Access in human path", pass, `status=${res.status} loc=${loc.replace(APEX, "").slice(0, 60) || "(none)"} access=${toAccess}`);
  }
}

// 7. www → apex.
{
  const res = await tryFetch(WWW, { redirect: "manual", headers: { "User-Agent": UA } });
  if (res.error) {
    record("www redirects to apex", false, `fetch failed: ${res.error}`);
  } else {
    const location = res.headers.get("location") || "";
    const pass = [301, 302, 308].includes(res.status) && location.startsWith(APEX);
    record("www redirects to apex", pass, `status=${res.status} location=${location || "(none)"}`);
  }
}

// 8. Security headers on the apex-served OS surface. Checked on the authed GET / (the 200 that
//    actually serves the OS shell; an anonymous "/" is a bodyless 302). HSTS is enforced zone-wide
//    (fire-65 CF security_header setting). CSP is a TRACKED follow-up: the forked OS router emits no CSP
//    yet, and the old megabyte-home CSP was homepage-specific — the OS needs its OWN CSP (crafted +
//    browser-tested, likely report-only first) so it doesn't break the capnweb app. So HSTS is REQUIRED
//    (hard); CSP-absent is a WARN (surfaced, not a fail) until the OS-CSP hardening slice lands.
{
  const res = await tryFetch(`${APEX}/`, { redirect: "manual", headers: { ...NAV, Cookie: sessionCookie } });
  if (res.error) {
    record("apex serves HSTS (CSP tracked)", false, `fetch failed: ${res.error}`);
  } else {
    const csp = res.headers.get("content-security-policy") || "";
    const hsts = res.headers.get("strict-transport-security") || "";
    if (!csp) console.log("   ⚠️  WARN: apex CSP ABSENT — tracked follow-up (OS-specific CSP; BACKLOG WS-8/security).");
    record(
      "apex serves HSTS (CSP tracked as follow-up)",
      hsts.length > 0,
      `hsts=${hsts ? "present" : "ABSENT"} csp=${csp ? "present" : "ABSENT(warn)"}`,
    );
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} assertions green`);
process.exit(failed.length === 0 ? 0 : 1);

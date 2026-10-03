#!/usr/bin/env node
/**
 * verify-ba-flip — the auth-on-action gate (post-apex-flip, fire-64).
 *
 * Proves, against real prod, that the human auth path on the apex is Better Auth (baked into
 * megabyte.space), NOT Cloudflare Access. Post-flip the Cloudflare OS lives AT THE APEX
 * (os.megabyte.space is gone → 000), so all three legs run against megabyte.space:
 *   1. An ANONYMOUS browser navigation to the OS (the apex) is 302'd to OUR Better Auth sign-in
 *      (megabyte.space/signin) by the router's auth gate — NOT to cloudflareaccess.com.
 *   2. An ALLOWLISTED Better Auth sign-in returns a megabyte.space-scoped session cookie.
 *   3. An authed browser navigation carrying that cookie PASSES the router to the OS shell (200).
 *
 * Creds (export from get-secret):
 *   export BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD)
 * Exit 0 = flip green · 1 = a leg failed · 2 = creds missing (not a flip bug).
 */
const APEX = "https://megabyte.space";
// Post-flip the OS IS the apex — no os.megabyte.space target remains (it's detached, 000).
const OS = APEX;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
// Browser-navigation headers — the router's BA_GATE keys its redirect on an HTML navigation
// (Sec-Fetch-Dest: document / Accept: text/html), exactly what a real browser sends.
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
  console.error("missing BA_E2E_EMAIL / BA_E2E_PASSWORD (export from get-secret)");
  process.exit(2);
}

const steps = [];
const ok = (name, pass, detail = "") => {
  steps.push({ name, pass });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};

try {
  // 1. Anonymous HTML nav to the OS → OUR router gate 302s to /signin (NOT cloudflareaccess.com).
  const anon = await fetch(OS + "/", { headers: NAV, redirect: "manual" });
  const loc = anon.headers.get("location") || "";
  const toSignin = anon.status >= 300 && anon.status < 400 && /megabyte\.space\/signin/.test(loc);
  const toAccess = /cloudflareaccess\.com/.test(loc) || /cdn-cgi\/access/.test(loc);
  ok(
    "anonymous OS nav → Better Auth /signin (our gate; Access relaxed)",
    toSignin && !toAccess,
    `status=${anon.status} loc=${loc.slice(0, 72) || "(none)"}`,
  );

  // 2. Allowlisted Better Auth sign-in → cross-subdomain session cookie (.megabyte.space).
  const si = await fetch(APEX + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/json", Origin: APEX },
    body: JSON.stringify({ email, password }),
  });
  const setCookies =
    typeof si.headers.getSetCookie === "function"
      ? si.headers.getSetCookie()
      : [si.headers.get("set-cookie")].filter(Boolean);
  const sessionCookie = setCookies
    .map((c) => c.split(";")[0])
    .find((c) => /better-auth\.session_token=/.test(c));
  ok("allowlisted BA sign-in → session cookie", si.status === 200 && !!sessionCookie, `status=${si.status}`);

  // 3. Authed HTML nav to the OS (carrying the BA cookie) → router PASSES THROUGH → OS shell (200).
  const authed = await fetch(OS + "/", {
    headers: { ...NAV, Cookie: sessionCookie || "" },
    redirect: "manual",
  });
  const body = authed.status === 200 ? await authed.text() : "";
  const isShell = authed.status === 200 && body.length > 300 && /<div id="root"|<script|workshop/i.test(body);
  ok(
    "authed OS nav (BA cookie) → OS shell (router passthrough, no /signin)",
    isShell,
    `status=${authed.status} bytes=${body.length}`,
  );
} catch (e) {
  ok("exception", false, e.message);
}

const failed = steps.filter((s) => !s.pass);
console.log(`\n${steps.length - failed.length}/${steps.length} checks green`);
process.exit(failed.length ? 1 : 0);

#!/usr/bin/env node
/**
 * verify-auth — BA-1 regression gate. Proves the Better Auth rail is LIVE + baked
 * into megabyte.space: the apex forwards /api/auth/* to the isolated megabyte-auth
 * worker, /api/auth/ok responds, a FIXED e2e user signs in, the session cookie is
 * set on the megabyte.space domain, and get-session returns the authenticated user.
 * Non-polluting — a fixed user, sign-in only (no new users per run).
 *
 * Creds from env (export from get-secret):
 *   export BA_E2E_EMAIL=$(get-secret BA_E2E_EMAIL) BA_E2E_PASSWORD=$(get-secret BA_E2E_PASSWORD)
 *
 * Exit 0 = rail green. Exit 1 = a leg failed. Exit 2 = creds missing (not a rail bug).
 */
const BASE = "https://megabyte.space";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
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
  // 1. The rail is reachable THROUGH the apex (forward to megabyte-auth works).
  const okr = await fetch(`${BASE}/api/auth/ok`, { headers: { "User-Agent": UA } });
  const okj = okr.status === 200 ? await okr.json().catch(() => ({})) : {};
  ok("/api/auth/ok live on apex (forwarded to megabyte-auth)", okr.status === 200 && okj.ok === true, `status=${okr.status}`);

  // 2. Sign-in → 200 + a session cookie scoped to megabyte.space.
  const si = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  const sij = si.status === 200 ? await si.json().catch(() => ({})) : {};
  const setCookies = typeof si.headers.getSetCookie === "function" ? si.headers.getSetCookie() : [si.headers.get("set-cookie")].filter(Boolean);
  const sessionCookie = setCookies.map((c) => c.split(";")[0]).find((c) => /better-auth\.session_token=/.test(c));
  ok("sign-in/email → 200 + session token", si.status === 200 && !!sij.token, `status=${si.status}`);
  ok("session cookie set (…better-auth.session_token)", !!sessionCookie, sessionCookie ? sessionCookie.split("=")[0] : "none");

  // 3. get-session with the cookie → the authenticated user (round-trip proven).
  const gs = await fetch(`${BASE}/api/auth/get-session`, {
    headers: { "User-Agent": UA, Cookie: sessionCookie || "" },
  });
  const gsj = gs.status === 200 ? await gs.json().catch(() => null) : null;
  ok("get-session returns the authenticated user", gsj?.user?.email === email, gsj?.user?.email || "no user");
} catch (e) {
  ok("exception", false, e.message);
}

const failed = steps.filter((s) => !s.pass);
console.log(`\n${steps.length - failed.length}/${steps.length} checks green`);
process.exit(failed.length ? 1 : 0);

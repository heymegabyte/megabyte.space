#!/usr/bin/env node
/**
 * verify-error-rate — post-deploy health gate for the apex OS router (ESTATE-UPGRADES #9, the
 * error-rate half). Queries the LIVE Cloudflare Workers error rate for the `megabyte-os` script via
 * the GraphQL Analytics `workersInvocationsAdaptive` dataset and FAILS if it exceeds a threshold over
 * a recent window — so a bad deploy (a route throwing, a binding gone) is caught by data, not a user.
 *
 * Why this dataset (not RUM): `rumPageloadEventsAdaptiveGroups` is NOT exposed on this account's plan
 * (verified "unknown field"), but `workersInvocationsAdaptive` IS — it returns per-script requests +
 * errors. Confirmed live: megabyte-os = 2147 req / 0 err over 6h.
 *
 * Version-pinning: CF Worker deploys are ATOMIC (the new version serves immediately), so a window that
 * STARTS at deploy time captures only new-version traffic — pass ERR_SINCE=<deploy ISO> to pin the gate
 * to the just-shipped version without needing a scriptVersion dimension (which the plan may not expose).
 *
 * Fail-soft: zero requests in the window = PASS with a note (no traffic ≠ a failure) — a low-traffic
 * apex must never red-flag a clean deploy just because nobody hit it in the last N minutes.
 *
 * Env:
 *   ERR_SCRIPT       worker script name           (default "megabyte-os")
 *   ERR_WINDOW_MIN   lookback window in minutes   (default 30; ignored if ERR_SINCE set)
 *   ERR_SINCE        RFC3339 window start         (overrides ERR_WINDOW_MIN; use for deploy-time pin)
 *   ERR_MAX_PCT      max tolerated error %        (default 1.0)
 *   CLOUDFLARE_ACCOUNT_ID  account tag            (default the estate account)
 *   CLOUDFLARE_API_KEY / CLOUDFLARE_EMAIL         CF global-key auth (key falls back to get-secret)
 *
 * Usage:   node scripts/verify-error-rate.mjs
 *          ERR_SINCE="2026-10-25T22:00:00Z" node scripts/verify-error-rate.mjs   # post-deploy pin
 * Exit 0 = green (under threshold OR no traffic). Exit 1 = over threshold OR query failed.
 *
 * Importable:  import { verifyErrorRate } from "./verify-error-rate.mjs"  → { ok, rate, requests, errors, note }
 */
import { execFileSync } from "node:child_process";

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "84fa0d1b16ff8086dd958c468ce7fd59";
const EMAIL = process.env.CLOUDFLARE_EMAIL || "blzalewski@gmail.com";
const SCRIPT = process.env.ERR_SCRIPT || "megabyte-os";
const WINDOW_MIN = Number(process.env.ERR_WINDOW_MIN || 30);
const MAX_PCT = Number(process.env.ERR_MAX_PCT || 1.0);

function resolveKey() {
  if (process.env.CLOUDFLARE_API_KEY) return process.env.CLOUDFLARE_API_KEY;
  try {
    const bin = `${process.env.HOME}/.local/bin/get-secret`;
    return execFileSync(bin, ["CLOUDFLARE_API_KEY"], { encoding: "utf8" }).trim();
  } catch {
    try {
      return execFileSync("get-secret", ["CLOUDFLARE_API_KEY"], { encoding: "utf8" }).trim();
    } catch {
      return "";
    }
  }
}

export async function verifyErrorRate({
  script = SCRIPT,
  windowMin = WINDOW_MIN,
  since = process.env.ERR_SINCE,
  maxPct = MAX_PCT,
} = {}) {
  const key = resolveKey();
  if (!key) return { ok: false, note: "no CLOUDFLARE_API_KEY (env or get-secret)" };

  const sinceIso = since || new Date(Date.now() - windowMin * 60_000).toISOString();
  const query = `query($a:String!,$s:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:1000,filter:{scriptName:"${script}",datetime_geq:$s}){sum{requests errors}}}}}`;
  const body = JSON.stringify({ query, variables: { a: ACCOUNT, s: sinceIso } });

  let json;
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "X-Auth-Email": EMAIL,
        "X-Auth-Key": key,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(25_000),
    });
    json = await res.json();
  } catch (e) {
    return { ok: false, note: `GraphQL request failed: ${String(e)}` };
  }
  if (json?.errors?.length) {
    return { ok: false, note: `GraphQL errors: ${JSON.stringify(json.errors).slice(0, 200)}` };
  }
  const rows = json?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive;
  if (!Array.isArray(rows)) return { ok: false, note: "dataset unavailable in response" };

  let requests = 0;
  let errors = 0;
  for (const r of rows) {
    requests += r?.sum?.requests || 0;
    errors += r?.sum?.errors || 0;
  }
  if (requests === 0) {
    return { ok: true, rate: 0, requests: 0, errors: 0, note: `no traffic since ${sinceIso} (fail-soft PASS)` };
  }
  const rate = (100 * errors) / requests;
  return {
    ok: rate <= maxPct,
    rate: Number(rate.toFixed(3)),
    requests,
    errors,
    since: sinceIso,
    maxPct,
    note: `${errors}/${requests} errors = ${rate.toFixed(3)}% (max ${maxPct}%) since ${sinceIso}`,
  };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await verifyErrorRate();
  console.log("\n━━━ apex error-rate gate (ESTATE #9) ━━━");
  console.log(`  script=${SCRIPT}  window=${process.env.ERR_SINCE ? "since " + process.env.ERR_SINCE : WINDOW_MIN + "m"}  threshold=${MAX_PCT}%`);
  console.log(`  ${r.ok ? "✅" : "❌"} ${r.note}`);
  console.log(`\n${r.ok ? "GREEN" : "RED"} — apex error-rate ${r.ok ? "within" : "EXCEEDS"} budget`);
  process.exit(r.ok ? 0 : 1);
}

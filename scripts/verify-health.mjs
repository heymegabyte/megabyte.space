#!/usr/bin/env node
/**
 * verify-health — regression net for the version-stamped /health endpoints on the two standalone
 * OS workers (ESTATE-UPGRADES #9, the "verify" half). Each /health MUST return 200 +
 * { ok:true, version:{ id:<uuid> } } — the CF version_metadata binding — so monitoring (Uptime
 * Kuma / status.megabyte.space) can assert the LIVE deployed version. If a future deploy drops the
 * endpoint or breaks the binding, this fails LOUD instead of the gap going silent.
 *
 * Usage: node scripts/verify-health.mjs   (no auth — both endpoints are public)
 * Exit 0 = all green. Exit 1 = ≥1 check failed (named in the summary).
 */
const TARGETS = [
  ["apex", "https://megabyte.space/health"],
  ["mcp", "https://mcp.megabyte.space/health"],
  ["os-agent", "https://megabyte-os-agent.manhattan.workers.dev/health"],
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok: !!ok, detail });

for (const [label, url] of TARGETS) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    check(`${label} /health → 200`, res.status === 200, `status=${res.status}`);
    let body = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON body → the ok/version checks below fail with a clear reason */
    }
    check(`${label} ok:true`, body?.ok === true, `ok=${JSON.stringify(body?.ok)}`);
    const id = body?.version?.id;
    check(`${label} version.id is a UUID`, typeof id === "string" && UUID.test(id), `id=${id ?? "(absent)"}`);
  } catch (e) {
    check(`${label} /health reachable`, false, String(e));
  }
}

console.log("\n━━━ /health version endpoints (ESTATE #9) ━━━");
for (const c of checks) console.log(`  ${c.ok ? "✅" : "❌"} ${c.name}${c.detail ? `  (${c.detail})` : ""}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks green`);
process.exit(failed.length ? 1 : 0);

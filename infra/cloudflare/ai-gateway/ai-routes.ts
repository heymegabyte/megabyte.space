#!/usr/bin/env node
/**
 * ai-routes — the AI Gateway Dynamic Routing control plane.
 *
 *   node ai-routes.ts plan [--drift-check]        secret-free semantic diff repo<->Cloudflare
 *   node ai-routes.ts apply [--gateway <id>]       idempotent reconcile; verify; auto-rollback
 *   node ai-routes.ts verify [--probe-models]      live contract checks (+ refresh capability matrix)
 *   node ai-routes.ts status                       managed routes + active version/deployment ids
 *   node ai-routes.ts rollback <gw> <route> [ver]  deploy a prior version (default: previous)
 *   node ai-routes.ts degraded-mode <gw> --enable|--disable   emergency economical routing
 *
 * Safety: management via global key, data plane via run token, both from get-secret at
 * runtime — never printed. Only the exact 8 managed route names are ever mutated; the
 * unrelated pre-existing route "hey" on megabyte-space is never touched.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GATEWAYS, MANAGED_ROUTES, gatewayById } from "./gateways.ts";
import { buildRoutes, routeBatchNoLimit, ROUTE_PURPOSE, RESTRICTED_PROVIDER_ALLOWLIST } from "./routes.ts";
import { graphHash, validateGraph, start, end, fallbackChain, type RouteGraph } from "./graph.ts";
import { MODELS, QUARANTINED } from "./models.ts";
import { VERIFY_CASES } from "./verify-cases.ts";
import * as cf from "./lib/cf.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const NOW = new Date().toISOString();

function nowStamp(): string {
  return NOW;
}

function desiredRoutesFor(gatewayId: string): RouteGraph[] {
  return buildRoutes(gatewayById(gatewayId).profile);
}

interface Rec {
  gateway: string;
  route: string;
  routeId?: string;
  action: "create" | "created" | "update" | "updated" | "noop" | "error";
  priorVersionId?: string;
  deployedVersionId?: string;
  desiredHash: string;
  currentHash?: string;
  verification?: string;
  detail?: string;
}

async function createAndDeployVersion(gw: string, routeId: string, elements: RouteGraph["elements"]) {
  const cv = await cf.createVersion(gw, routeId, elements);
  if (!cv.success) return { ok: false, versionId: undefined as string | undefined, detail: `version: ${cv.errorText}` };
  let versionId: string | undefined = cv.body?.result?.version_id || cv.body?.result?.id;
  let dep = versionId ? await cf.deployVersion(gw, routeId, versionId) : { success: false, errorText: "no version id" };
  if (!dep.success) {
    const vers = await cf.listVersions(gw, routeId);
    const newest = vers
      .map((v) => ({ id: v.version_id || v.id, created: v.created_at || "" }))
      .sort((a, b) => String(b.created).localeCompare(String(a.created)))[0];
    if (newest?.id) {
      versionId = String(newest.id);
      dep = await cf.deployVersion(gw, routeId, String(newest.id));
    }
  }
  return { ok: dep.success, versionId, detail: dep.success ? "" : (dep as cf.CFResult).errorText };
}

async function activeVersionId(gw: string, routeName: string): Promise<string | undefined> {
  return (await cf.getRouteByName(gw, routeName))?.activeVersionId;
}

async function reconcile(gw: string, desired: RouteGraph, apply: boolean): Promise<Rec> {
  const desiredHash = graphHash(desired.elements);
  const existing = await cf.getRouteByName(gw, desired.name);

  if (!existing) {
    if (!apply) return { gateway: gw, route: desired.name, action: "create", desiredHash };
    const c = await cf.createRoute(gw, desired.name, desired.elements);
    if (!c.success) return { gateway: gw, route: desired.name, action: "error", desiredHash, detail: c.errorText };
    const routeId = c.body?.result?.id;
    const deployedVersionId = c.body?.result?.version?.version_id || (await activeVersionId(gw, desired.name));
    return { gateway: gw, route: desired.name, action: "created", routeId, deployedVersionId, desiredHash };
  }

  const currentElements = await cf.activeElements(gw, existing);
  const currentHash = graphHash(currentElements);
  if (currentHash === desiredHash) {
    return { gateway: gw, route: desired.name, action: "noop", routeId: existing.id, desiredHash, currentHash };
  }
  if (!apply) return { gateway: gw, route: desired.name, action: "update", routeId: existing.id, desiredHash, currentHash };

  const priorVersionId = existing.activeVersionId;
  const r = await createAndDeployVersion(gw, existing.id, desired.elements);
  if (!r.ok) return { gateway: gw, route: desired.name, action: "error", routeId: existing.id, priorVersionId, desiredHash, currentHash, detail: r.detail };
  return { gateway: gw, route: desired.name, action: "updated", routeId: existing.id, priorVersionId, deployedVersionId: r.versionId, desiredHash, currentHash };
}

/** Verify a just-applied route; auto-rollback to the prior version if it regressed. */
async function verifyAndMaybeRollback(rec: Rec): Promise<void> {
  const vc = VERIFY_CASES.find((c) => c.route === rec.route);
  if (!vc || rec.action === "error" || rec.action === "noop") return;
  // Tolerate edge propagation after a fresh deploy: a just-deployed version can take a few
  // seconds to serve, so retry briefly before concluding a regression (prevents a false rollback
  // when the old version is still momentarily live).
  let res = await cf.callDynamicRoute(rec.gateway, rec.route, { metadata: vc.metadata });
  for (let i = 0; i < 4 && !(res.status === 200 && res.provider === vc.expectProvider); i++) {
    await new Promise((r) => setTimeout(r, 5000));
    res = await cf.callDynamicRoute(rec.gateway, rec.route, { metadata: vc.metadata });
  }
  const pass = res.status === 200 && res.provider === vc.expectProvider;
  if (pass) {
    rec.verification = `ok ${res.provider}/${res.model}`;
    return;
  }
  // Regression: roll back to the prior version if we replaced one.
  if (rec.action === "updated" && rec.priorVersionId && rec.routeId) {
    const rb = await cf.deployVersion(rec.gateway, rec.routeId, rec.priorVersionId);
    rec.verification = `FAILED (HTTP ${res.status}, provider ${res.provider}; expected ${vc.expectProvider}) -> ROLLED BACK to ${rec.priorVersionId} (${rb.success ? "ok" : "ROLLBACK FAILED: " + rb.errorText})`;
  } else {
    rec.verification = `WARN (HTTP ${res.status}, provider ${res.provider}; expected ${vc.expectProvider}) — new route, no prior version to roll back to`;
  }
}

function printRec(r: Rec): void {
  const icon = r.action === "error" ? "✗" : r.action === "noop" ? "·" : r.action.startsWith("create") ? "+" : "~";
  const v = r.verification ? `  verify=${r.verification}` : "";
  const d = r.detail ? `  detail=${r.detail}` : "";
  console.log(`  ${icon} ${r.gateway}/${r.route} [${r.action}] hash=${r.desiredHash}${r.currentHash && r.currentHash !== r.desiredHash ? `<-${r.currentHash}` : ""}${v}${d}`);
}

async function cmdPlan(driftCheck: boolean): Promise<number> {
  console.log(`ai-routes plan @ ${nowStamp()}\n`);
  let drift = 0;
  for (const gw of GATEWAYS) {
    console.log(`gateway ${gw.id} (${gw.profile}):`);
    for (const desired of desiredRoutesFor(gw.id)) {
      const ve = validateGraph(desired);
      if (ve.length) {
        console.log(`  ✗ ${desired.name} INVALID: ${ve.join("; ")}`);
        drift++;
        continue;
      }
      const rec = await reconcile(gw.id, desired, false);
      printRec(rec);
      if (rec.action !== "noop") drift++;
    }
  }
  console.log(`\n${drift === 0 ? "✅ no drift — Cloudflare matches repo intent" : `⚠️  ${drift} route(s) differ from repo intent`}`);
  if (driftCheck && drift > 0) return 1;
  return 0;
}

async function cmdApply(onlyGateway?: string): Promise<number> {
  console.log(`ai-routes apply @ ${nowStamp()}`);
  const tok = await cf.verifyRunToken();
  console.log(`run token: ${tok.ok ? "active" : "INVALID"} | account ${cf.accountId()}\n`);
  const gateways = GATEWAYS.filter((g) => !onlyGateway || g.id === onlyGateway);
  const manifest: Rec[] = [];
  let errors = 0;
  for (const gw of gateways) {
    console.log(`gateway ${gw.id} (${gw.profile}) — safer-first order:`);
    for (const desired of desiredRoutesFor(gw.id)) {
      const ve = validateGraph(desired);
      if (ve.length) {
        console.log(`  ✗ ${desired.name} INVALID (skipped): ${ve.join("; ")}`);
        errors++;
        continue;
      }
      let rec = await reconcile(gw.id, desired, true);
      // Beta safety net: if batch failed (rate-node shape rejected), retry without the limit.
      if (rec.action === "error" && desired.name === "batch") {
        console.log(`  … batch with rate-limit node rejected (${rec.detail}); retrying rate-less batch`);
        rec = await reconcile(gw.id, routeBatchNoLimit(gw.profile), true);
      }
      await verifyAndMaybeRollback(rec);
      // backfill deployed version id for the manifest
      if (!rec.deployedVersionId) rec.deployedVersionId = await activeVersionId(gw.id, desired.name);
      printRec(rec);
      manifest.push(rec);
      if (rec.action === "error") errors++;
    }
  }
  writeManifest(manifest);
  console.log(`\nwrote manifest.json (${manifest.length} routes). ${errors === 0 ? "✅ apply clean" : `⚠️ ${errors} error(s)`}`);
  return errors === 0 ? 0 : 1;
}

function writeManifest(recs: Rec[]): void {
  const manifest = {
    generated_at: nowStamp(),
    account_id: cf.accountId(),
    note: "Secret-free deployment manifest. Cloudflare remains authoritative for version/deployment history.",
    routes: recs.map((r) => ({
      gateway: r.gateway,
      route: r.route,
      route_id: r.routeId,
      prior_version_id: r.priorVersionId ?? null,
      deployed_version_id: r.deployedVersionId ?? null,
      graph_hash: r.desiredHash,
      action: r.action,
      verification: r.verification ?? null,
      purpose: ROUTE_PURPOSE[r.route],
    })),
  };
  writeFileSync(join(HERE, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

async function cmdVerify(probeModels: boolean): Promise<number> {
  console.log(`ai-routes verify @ ${nowStamp()}\n`);
  let fail = 0;
  for (const gw of GATEWAYS) {
    console.log(`gateway ${gw.id}:`);
    for (const vc of VERIFY_CASES) {
      const res = await cf.callDynamicRoute(gw.id, vc.route, { metadata: vc.metadata });
      const pass = res.status === 200 && res.provider === vc.expectProvider;
      if (!pass) fail++;
      console.log(`  ${pass ? "✅" : "❌"} ${vc.route} <${vc.label}> -> HTTP ${res.status} ${res.provider}/${res.model} (expect ${vc.expectProvider}) ${vc.note}`);
    }
  }
  if (probeModels) await probeModelPool();
  console.log(`\n${fail === 0 ? "✅ all contract cases passed on both gateways" : `❌ ${fail} contract case(s) failed`}`);
  return fail === 0 ? 0 : 1;
}

async function probeModelPool(): Promise<void> {
  console.log(`\nprobing model pool (capability-matrix.json)…`);
  const results: Record<string, { provider: string; model: string; status: number; ok: boolean }> = {};
  for (const [key, mc] of Object.entries(MODELS)) {
    const run = cf.secret("CLOUDFLARE_API_TOKEN");
    const r = await fetch(`https://gateway.ai.cloudflare.com/v1/${cf.accountId()}/megabyte-space/compat/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-aig-authorization": `Bearer ${run}` },
      body: JSON.stringify({ model: `${mc.provider}/${mc.model}`, messages: [{ role: "user", content: "Reply OK" }], max_tokens: 3, temperature: 0 }),
    });
    results[key] = { provider: mc.provider, model: mc.model, status: r.status, ok: r.status === 200 };
  }
  writeFileSync(
    join(HERE, "capability-matrix.json"),
    JSON.stringify({ generated_at: nowStamp(), note: "Live health of the proven model pool (gateway megabyte-space). No secrets.", quarantined: QUARANTINED, models: results }, null, 2) + "\n",
  );
  const healthy = Object.values(results).filter((r) => r.ok).length;
  console.log(`  ${healthy}/${Object.keys(results).length} models healthy -> capability-matrix.json`);
}

async function cmdStatus(): Promise<number> {
  console.log(`ai-routes status @ ${nowStamp()}\n`);
  for (const gw of GATEWAYS) {
    const routes = await cf.listRoutes(gw.id);
    const managed = routes.filter((r) => (MANAGED_ROUTES as readonly string[]).includes(r.name));
    const other = routes.filter((r) => !(MANAGED_ROUTES as readonly string[]).includes(r.name));
    console.log(`gateway ${gw.id}: ${managed.length}/${MANAGED_ROUTES.length} managed routes present${other.length ? ` (+${other.length} unmanaged, preserved: ${other.map((o) => o.name).join(", ")})` : ""}`);
    for (const name of MANAGED_ROUTES) {
      const r = managed.find((x) => x.name === name);
      console.log(r ? `  • ${name}  id=${r.id?.slice(0, 8)} activeVersion=${r.activeVersionId?.slice(0, 8) ?? "?"}` : `  ✗ ${name} MISSING`);
    }
  }
  return 0;
}

async function cmdRollback(gw: string, routeName: string, versionId?: string): Promise<number> {
  const route = await cf.getRouteByName(gw, routeName);
  if (!route) {
    console.log(`route ${gw}/${routeName} not found`);
    return 1;
  }
  const versions = await cf.listVersions(gw, route.id);
  const sorted = versions
    .map((v) => ({ id: v.version_id || v.id, created: v.created_at || "" }))
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
  const target = versionId || sorted.find((v) => v.id !== route.activeVersionId)?.id;
  if (!target) {
    console.log(`no prior version available to roll back to for ${gw}/${routeName}`);
    return 1;
  }
  const dep = await cf.deployVersion(gw, route.id, target);
  console.log(`rollback ${gw}/${routeName} -> version ${target} : ${dep.success ? "✅ deployed" : "❌ " + dep.errorText}`);
  if (dep.success) {
    const res = await cf.callDynamicRoute(gw, routeName, { metadata: VERIFY_CASES.find((c) => c.route === routeName)?.metadata });
    console.log(`  post-rollback call -> HTTP ${res.status} ${res.provider}/${res.model}`);
  }
  return dep.success ? 0 : 1;
}

function emergencyGraph(name: string, profile: "megabyte" | "projectsites"): RouteGraph {
  // workers-ai-only resilient economical chain; removes premium/external providers.
  const chain = fallbackChain("deg", [MODELS.cheapest, MODELS.fast, MODELS.tiny], { timeout: 15000, retries: 1 }, "end");
  void profile;
  return { name, elements: [start(chain.entry), ...chain.elements, end()] };
}

async function cmdDegraded(gw: string, enable: boolean): Promise<number> {
  const g = gatewayById(gw);
  const NONCRITICAL = ["general", "economy", "code", "batch", "research"];
  console.log(`ai-routes degraded-mode ${gw} --${enable ? "enable" : "disable"} @ ${nowStamp()}`);
  console.log(enable ? "routing noncritical traffic to workers-ai economical models; preserving critical/architect/restricted" : "restoring normal route policy");
  let fail = 0;
  for (const name of NONCRITICAL) {
    const desired = enable ? emergencyGraph(name, g.profile) : desiredRoutesFor(gw).find((r) => r.name === name)!;
    const existing = await cf.getRouteByName(gw, name);
    if (!existing) {
      console.log(`  ✗ ${name} missing (run apply first)`);
      fail++;
      continue;
    }
    const r = await createAndDeployVersion(gw, existing.id, desired.elements);
    console.log(`  ${r.ok ? "✅" : "❌"} ${name} -> ${enable ? "DEGRADED" : "normal"} ${r.ok ? `version ${r.versionId}` : r.detail}`);
    if (!r.ok) fail++;
  }
  console.log(fail === 0 ? "✅ done (fully reversible: re-run with the opposite flag)" : `⚠️ ${fail} failures`);
  return fail === 0 ? 0 : 1;
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (f: string) => rest.includes(f);
  const argAfter = (i: number) => rest[i];
  let code = 0;
  switch (cmd) {
    case "plan":
      code = await cmdPlan(flag("--drift-check"));
      break;
    case "apply": {
      const gi = rest.indexOf("--gateway");
      code = await cmdApply(gi >= 0 ? rest[gi + 1] : undefined);
      break;
    }
    case "verify":
      code = await cmdVerify(flag("--probe-models"));
      break;
    case "status":
      code = await cmdStatus();
      break;
    case "rollback":
      code = await cmdRollback(argAfter(0), argAfter(1), argAfter(2));
      break;
    case "degraded-mode": {
      const gw = argAfter(0);
      if (!gw || (!flag("--enable") && !flag("--disable"))) {
        console.log("usage: ai-routes degraded-mode <gateway> --enable|--disable");
        code = 1;
        break;
      }
      code = await cmdDegraded(gw, flag("--enable"));
      break;
    }
    default:
      console.log(
        [
          "ai-routes — AI Gateway Dynamic Routing control plane",
          "",
          "  plan [--drift-check]                      secret-free diff repo<->Cloudflare (exit 1 on drift w/ --drift-check)",
          "  apply [--gateway <id>]                    idempotent reconcile + verify + auto-rollback",
          "  verify [--probe-models]                   live contract checks (+ refresh capability-matrix.json)",
          "  status                                    managed routes + active versions",
          "  rollback <gw> <route> [versionId]         deploy a prior version (default: previous)",
          "  degraded-mode <gw> --enable|--disable     emergency economical routing (reversible)",
          "",
          `  gateways: ${GATEWAYS.map((g) => g.id).join(", ")}`,
          `  routes:   ${MANAGED_ROUTES.join(", ")}`,
          `  restricted provider allowlist: ${RESTRICTED_PROVIDER_ALLOWLIST.join(", ")}`,
        ].join("\n"),
      );
  }
  process.exit(code);
}

main().catch((e) => {
  console.error("ai-routes fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});

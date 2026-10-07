/**
 * Contract tests. Run: `node --test infra/cloudflare/ai-gateway/tests/contract.test.ts`
 *
 * Pure tests (metadata contract, entitlement clamp, graph validity, cross-provider failover)
 * always run and are cheap. The live contract tests hit the deployed routes through BOTH
 * gateways and skip automatically when CF credentials are not resolvable (e.g. untrusted CI).
 * They always bypass cache so they reflect live routing.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { GATEWAYS } from "../gateways.ts";
import { VERIFY_CASES } from "../verify-cases.ts";
import { validateMetadata, clampQualityToPlan, PLANS } from "../metadata.ts";
import { buildRoutes } from "../routes.ts";
import { validateGraph, distinctProviders, type ModelElement } from "../graph.ts";
import { buildGatewayRequest } from "../policy.ts";
import * as cf from "../lib/cf.ts";

function modelProviders(profile: "megabyte" | "projectsites", route: string): string[] {
  const g = buildRoutes(profile).find((r) => r.name === route)!;
  return g.elements.filter((e): e is ModelElement => e.type === "model").map((e) => e.properties.provider);
}

// ---------- pure / offline ----------

test("metadata: rejects unknown fields, empty ids, and bad enums", () => {
  assert.ok(validateMetadata({ tenant_id: "t", actor_id: "a", plan: "pro", quality: "high", environment: "production" }).ok);
  assert.ok(!validateMetadata({ tenant_id: "t", actor_id: "a", plan: "pro", quality: "high", environment: "production", workload: "code" }).ok);
  assert.ok(!validateMetadata({ tenant_id: "", actor_id: "a", plan: "pro", quality: "high", environment: "production" }).ok);
  assert.ok(!validateMetadata({ tenant_id: "t", actor_id: "a", plan: "wizard", quality: "high", environment: "production" }).ok);
});

test("entitlement: quality is clamped down to the plan cap, never up", () => {
  assert.equal(clampQualityToPlan("maximum", "free"), "balanced");
  assert.equal(clampQualityToPlan("high", "starter"), "balanced");
  assert.equal(clampQualityToPlan("maximum", "pro"), "high");
  assert.equal(clampQualityToPlan("maximum", "enterprise"), "maximum");
  assert.equal(clampQualityToPlan("economy", "enterprise"), "economy");
});

test("all 8 route graphs are structurally valid on both profiles", () => {
  for (const profile of ["megabyte", "projectsites"] as const) {
    const routes = buildRoutes(profile);
    assert.equal(routes.length, 8);
    for (const g of routes) assert.deepEqual(validateGraph(g), [], `${profile}/${g.name} invalid`);
  }
});

test("critical + architect fail across provider boundaries (true resilience)", () => {
  for (const profile of ["megabyte", "projectsites"] as const) {
    for (const route of ["critical", "architect"]) {
      const g = buildRoutes(profile).find((r) => r.name === route)!;
      const models = g.elements.filter((e): e is ModelElement => e.type === "model").map((e) => ({ provider: e.properties.provider, model: e.properties.model }));
      assert.ok(distinctProviders(models) >= 2, `${profile}/${route} must span >=2 providers`);
    }
  }
});

test("restricted is a workers-ai-only provider allowlist", () => {
  for (const profile of ["megabyte", "projectsites"] as const) {
    assert.deepEqual([...new Set(modelProviders(profile, "restricted"))], ["workers-ai"], `${profile}/restricted must be workers-ai only`);
  }
});

test("policy: a free user cannot widen their Auto Router pool via a header", () => {
  const req = buildGatewayRequest({
    workload: "auto",
    metadata: { tenant_id: "t", actor_id: "a", plan: "free", quality: "maximum", environment: "production" },
    autoRouterAllowlist: ["openai", "workers-ai"],
  });
  assert.equal(req.model, "cloudflare/auto");
  assert.deepEqual(req.allowlist, ["workers-ai"]); // openai stripped; free is workers-ai only
});

test("policy: restricted always skips cache + disables payload logging; vision is bounced", () => {
  const restricted = buildGatewayRequest({ workload: "restricted", metadata: { tenant_id: "t", actor_id: "a", plan: "internal", quality: "high", environment: "internal" } });
  assert.equal(restricted.headers["cf-aig-skip-cache"], "true");
  assert.equal(restricted.headers["cf-aig-collect-log"], "false");
  const vision = buildGatewayRequest({ workload: "general", modality: "vision", metadata: { tenant_id: "t", actor_id: "a", plan: "pro", quality: "high", environment: "production" } });
  assert.ok(vision.unsupported, "vision must be bounced off Dynamic Routes");
});

// ---------- live (skips without creds) ----------

const haveCreds = !!cf.secret("CLOUDFLARE_API_TOKEN") && !!cf.secret("CLOUDFLARE_API_KEY");

for (const gw of GATEWAYS) {
  for (const vc of VERIFY_CASES) {
    test(`[live] ${gw.id} ${vc.route} <${vc.label}> selects ${vc.expectProvider}`, { skip: !haveCreds }, async () => {
      const res = await cf.callDynamicRoute(gw.id, vc.route, { metadata: vc.metadata }); // skipCache defaults true
      assert.equal(res.status, 200, `HTTP ${res.status}: ${res.raw.slice(0, 120)}`);
      assert.equal(res.provider, vc.expectProvider, `got ${res.provider}/${res.model}`);
    });
  }
}

test("plan sanity: every plan has an entitlement cap", () => {
  for (const p of PLANS) assert.ok(clampQualityToPlan("maximum", p));
});

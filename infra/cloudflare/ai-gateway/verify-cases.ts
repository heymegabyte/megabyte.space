/**
 * Representative contract cases: a routing-metadata input and the provider we expect the
 * route to select for it. Shared by `ai-routes.ts verify` and tests/contract.test.ts so the
 * live behavior and the automated test assert the same thing. Each case is provider-stable
 * across BOTH product profiles (megabyte + projectsites), so one expectation fits both gateways.
 *
 * Provider is asserted via the cf-aig-provider response header (verified to be present on
 * dynamic-route responses on 2026-10-06). We assert the PROVIDER class, not an exact model,
 * so a model swap within a lane does not break the contract.
 */

import type { RoutingMetadata } from "./metadata.ts";

export interface VerifyCase {
  route: string;
  label: string;
  metadata: RoutingMetadata;
  expectProvider: "workers-ai" | "openai" | "anthropic";
  note: string;
}

const m = (
  plan: RoutingMetadata["plan"],
  quality: RoutingMetadata["quality"],
  environment: RoutingMetadata["environment"],
  tenant = "t_verify",
  actor = "a_verify",
): RoutingMetadata => ({ tenant_id: tenant, actor_id: actor, plan, quality, environment });

export const VERIFY_CASES: VerifyCase[] = [
  { route: "economy", label: "economy/free/prod", metadata: m("free", "economy", "production"), expectProvider: "workers-ai", note: "cheapest keyless lane" },
  { route: "general", label: "general/free-asks-high (capped)", metadata: m("free", "high", "production"), expectProvider: "workers-ai", note: "free/starter capped to balanced(70b) even if header claims high" },
  { route: "general", label: "general/enterprise/maximum", metadata: m("enterprise", "maximum", "production"), expectProvider: "anthropic", note: "maximum -> claude-sonnet-4-5 (Unified Billing)" },
  { route: "general", label: "general/pro/preview (downgraded)", metadata: m("pro", "balanced", "preview"), expectProvider: "workers-ai", note: "preview/test cheaper than prod -> economy lane" },
  { route: "code", label: "code/pro/balanced (routine)", metadata: m("pro", "balanced", "production"), expectProvider: "workers-ai", note: "routine coding -> qwen2.5-coder-32b" },
  { route: "code", label: "code/enterprise/maximum (strong)", metadata: m("enterprise", "maximum", "production"), expectProvider: "anthropic", note: "high|maximum -> claude (Unified Billing)" },
  { route: "architect", label: "architect/internal/maximum", metadata: m("internal", "maximum", "internal"), expectProvider: "anthropic", note: "frontier judgment -> claude-sonnet-4-5 (Unified Billing)" },
  { route: "research", label: "research/enterprise/high", metadata: m("enterprise", "high", "production"), expectProvider: "anthropic", note: "high -> claude reasoning (Unified Billing)" },
  { route: "critical", label: "critical/enterprise/maximum", metadata: m("enterprise", "maximum", "production"), expectProvider: "anthropic", note: "strong primary -> claude-sonnet-4-5, no bargain downgrade" },
  { route: "batch", label: "batch/pro/economy", metadata: m("pro", "economy", "production"), expectProvider: "workers-ai", note: "throughput -> deepseek-v4-flash (under count limit)" },
  { route: "restricted", label: "restricted/internal/high", metadata: m("internal", "high", "internal"), expectProvider: "workers-ai", note: "provider allowlist: workers-ai only" },
];

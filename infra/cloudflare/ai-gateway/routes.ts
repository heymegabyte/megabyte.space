/**
 * The eight managed Dynamic Route graphs, built per product profile.
 *
 * Route names are IDENTICAL across both gateways so application code can switch gateways
 * without changing intent names. The graph STRUCTURE is identical per route; only the
 * model lanes differ by profile (megabyte = stronger defaults; projectsites = cost-contained).
 *
 * All model choices come from the PROVEN pool in models.ts. Fallback chains are
 * cross-provider (openai <-> workers-ai) on every route that can fail expensively.
 * `restricted` is intentionally workers-ai-only (provider allowlist, data stays on CF).
 */

import { MODELS } from "./models.ts";
import type { GatewayProfile } from "./gateways.ts";
import {
  type RouteGraph,
  type Element,
  type ModelChoice,
  start,
  end,
  conditional,
  rate,
  fallbackChain,
} from "./graph.ts";

const M = MODELS;

interface Lanes {
  economy: ModelChoice[];
  balanced: ModelChoice[];
  high: ModelChoice[];
  maximum: ModelChoice[];
  codeRoutine: ModelChoice[];
  codeStrong: ModelChoice[];
  architect: ModelChoice[];
  researchBase: ModelChoice[];
  researchHigh: ModelChoice[];
  critical: ModelChoice[];
  batchMain: ModelChoice[];
  batchDegraded: ModelChoice[];
  restricted: ModelChoice[];
}

const LANES: Record<GatewayProfile, Lanes> = {
  megabyte: {
    economy: [M.deepseekFlash, M.fast, M.oaiMini],
    balanced: [M.general, M.oaiMini],
    high: [M.anthropicHaiku, M.oai41mini, M.general],
    maximum: [M.anthropicSonnet, M.oai41, M.deepseekPro],
    codeRoutine: [M.codeRoutine, M.fast, M.oaiMini],
    codeStrong: [M.anthropicSonnet, M.oai41mini, M.codeRoutine],
    architect: [M.anthropicSonnet, M.oai41, M.deepseekPro, M.reasoning],
    researchBase: [M.reasoning, M.general, M.oaiMini],
    researchHigh: [M.anthropicSonnet, M.oai41, M.reasoning],
    critical: [M.anthropicSonnet, M.oai41, M.deepseekPro, M.general],
    batchMain: [M.deepseekFlash, M.cheapest],
    batchDegraded: [M.cheapest, M.tiny],
    restricted: [M.general, M.deepseekPro],
  },
  projectsites: {
    economy: [M.cheapest, M.deepseekFlash, M.oaiMini],
    balanced: [M.general, M.oaiMini],
    high: [M.anthropicHaiku, M.oai41mini, M.general],
    maximum: [M.anthropicSonnet, M.oai41, M.deepseekPro],
    codeRoutine: [M.codeRoutine, M.fast, M.oaiMini],
    codeStrong: [M.anthropicHaiku, M.oai41mini, M.codeRoutine],
    architect: [M.anthropicHaiku, M.oai41mini, M.deepseekPro],
    researchBase: [M.reasoning, M.general],
    researchHigh: [M.anthropicHaiku, M.oai41mini, M.reasoning],
    critical: [M.anthropicSonnet, M.oai41, M.deepseekPro, M.general],
    batchMain: [M.deepseekFlash, M.cheapest],
    batchDegraded: [M.cheapest, M.tiny],
    restricted: [M.general, M.deepseekPro],
  },
};

/**
 * Batch budget guard. No authoritative monetary budget exists in repo/product config, so
 * we deploy ONLY a clearly-safe COUNT guard per tenant that DEGRADES to the cheapest lane
 * instead of failing. Monetary (cost-type) caps are intentionally left disabled until a real
 * negotiated/observed budget exists — change `enabled`/`limit` here (config-as-code) to tune.
 */
export const BATCH_LIMIT = {
  enabled: true,
  limitType: "count" as const,
  key: "metadata.tenant_id",
  limit: 100000, // requests per window per tenant — high enough never to hit normal traffic
  window: 86400, // 24h
};

export const RESTRICTED_PROVIDER_ALLOWLIST = ["workers-ai"] as const;

/** Per-route human purpose, surfaced in the manifest + README. */
export const ROUTE_PURPOSE: Record<string, string> = {
  general: "General-purpose deterministic policy routing (our policy, not Auto Router). Branches on plan/quality/environment.",
  economy: "Lowest practical cost while useful. The shared degradation target for budget/burst overflow.",
  code: "Routine software implementation/debug/tests/refactors; escalates to stronger coding models at quality high|maximum.",
  architect: "Architecture, high-impact judgment, final arbitration. Strongest proven models, cross-provider, long timeouts.",
  research: "Synthesis/reasoning over supplied evidence (NOT a web crawler). Reasoning + long-context models.",
  critical: "Correctness + availability over minimum cost. Highest provider diversity, careful retries, no bargain downgrade.",
  batch: "High-volume background work. Count-limit per tenant that degrades to the cheapest lane instead of breaking.",
  restricted: "Sensitive/internal. workers-ai-only provider allowlist; request layer adds skip-cache + payload-log-off.",
};

function routeGeneral(L: Lanes): RouteGraph {
  const eco = fallbackChain("eco", L.economy, { timeout: 20000, retries: 1 }, "end");
  const bal = fallbackChain("bal", L.balanced, { timeout: 30000, retries: 1 }, "end");
  const high = fallbackChain("high", L.high, { timeout: 45000, retries: 1 }, "end");
  const max = fallbackChain("max", L.maximum, { timeout: 60000, retries: 2 }, "end");
  const elements: Element[] = [
    start("c_freecap"),
    // Defense-in-depth entitlement cap: free/starter never get high/maximum, even if the
    // (server-attached, but belt-and-suspenders) header claims it.
    conditional(
      "c_freecap",
      { $and: [{ "metadata.plan": { $in: ["free", "starter"] } }, { "metadata.quality": { $in: ["high", "maximum"] } }] },
      bal.entry,
      "c_env",
    ),
    // preview/test are cheaper than production unless quality is explicitly maximum.
    conditional(
      "c_env",
      { $and: [{ "metadata.environment": { $in: ["preview", "test"] } }, { "metadata.quality": { $ne: "maximum" } }] },
      eco.entry,
      "c_max",
    ),
    conditional("c_max", { "metadata.quality": { $eq: "maximum" } }, max.entry, "c_high"),
    conditional("c_high", { "metadata.quality": { $eq: "high" } }, high.entry, "c_bal"),
    conditional("c_bal", { "metadata.quality": { $eq: "balanced" } }, bal.entry, eco.entry),
    ...eco.elements,
    ...bal.elements,
    ...high.elements,
    ...max.elements,
    end(),
  ];
  return { name: "general", elements };
}

function routeEconomy(L: Lanes): RouteGraph {
  const ch = fallbackChain("eco", L.economy, { timeout: 15000, retries: 1 }, "end");
  return { name: "economy", elements: [start(ch.entry), ...ch.elements, end()] };
}

function routeCode(L: Lanes): RouteGraph {
  const routine = fallbackChain("rt", L.codeRoutine, { timeout: 30000, retries: 1 }, "end");
  const strong = fallbackChain("st", L.codeStrong, { timeout: 60000, retries: 2 }, "end");
  return {
    name: "code",
    elements: [
      start("c_q"),
      conditional("c_q", { "metadata.quality": { $in: ["high", "maximum"] } }, strong.entry, routine.entry),
      ...routine.elements,
      ...strong.elements,
      end(),
    ],
  };
}

function routeArchitect(L: Lanes): RouteGraph {
  const ch = fallbackChain("arch", L.architect, { timeout: 120000, retries: 2 }, "end");
  return { name: "architect", elements: [start(ch.entry), ...ch.elements, end()] };
}

function routeResearch(L: Lanes): RouteGraph {
  const base = fallbackChain("rb", L.researchBase, { timeout: 90000, retries: 1 }, "end");
  const high = fallbackChain("rh", L.researchHigh, { timeout: 90000, retries: 1 }, "end");
  return {
    name: "research",
    elements: [
      start("c_q"),
      conditional("c_q", { "metadata.quality": { $in: ["high", "maximum"] } }, high.entry, base.entry),
      ...base.elements,
      ...high.elements,
      end(),
    ],
  };
}

function routeCritical(L: Lanes): RouteGraph {
  const ch = fallbackChain("crit", L.critical, { timeout: 60000, retries: 2 }, "end");
  return { name: "critical", elements: [start(ch.entry), ...ch.elements, end()] };
}

function routeBatch(L: Lanes): RouteGraph {
  const main = fallbackChain("bm", L.batchMain, { timeout: 45000, retries: 1 }, "end");
  const degraded = fallbackChain("bd", L.batchDegraded, { timeout: 30000, retries: 1 }, "end");
  const entry = BATCH_LIMIT.enabled ? "limit" : main.entry;
  const elements: Element[] = [start(entry)];
  if (BATCH_LIMIT.enabled) {
    elements.push(
      rate(
        "limit",
        { limitType: BATCH_LIMIT.limitType, key: BATCH_LIMIT.key, limit: BATCH_LIMIT.limit, window: BATCH_LIMIT.window },
        main.entry,
        degraded.entry,
      ),
    );
  }
  elements.push(...main.elements, ...degraded.elements, end());
  return { name: "batch", elements };
}

/** Variant without the rate node — used by apply as a safe fallback if the live rate-node
 *  shape is rejected, so a single beta quirk never poisons the whole batch deploy. */
export function routeBatchNoLimit(profile: GatewayProfile): RouteGraph {
  const L = LANES[profile];
  const main = fallbackChain("bm", L.batchMain, { timeout: 45000, retries: 1 }, "end");
  const degraded = fallbackChain("bd", L.batchDegraded, { timeout: 30000, retries: 1 }, "end");
  return { name: "batch", elements: [start(main.entry), ...main.elements, ...degraded.elements, end()] };
}

function routeRestricted(L: Lanes): RouteGraph {
  const ch = fallbackChain("res", L.restricted, { timeout: 30000, retries: 1 }, "end");
  return { name: "restricted", elements: [start(ch.entry), ...ch.elements, end()] };
}

export function buildRoutes(profile: GatewayProfile): RouteGraph[] {
  const L = LANES[profile];
  return [
    routeGeneral(L),
    routeEconomy(L),
    routeCode(L),
    routeArchitect(L),
    routeResearch(L),
    routeCritical(L),
    routeBatch(L),
    routeRestricted(L),
  ];
}

export function lanesFor(profile: GatewayProfile): Lanes {
  return LANES[profile];
}

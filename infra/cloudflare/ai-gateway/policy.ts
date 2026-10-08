/**
 * Thin policy router — the ONE place application code expresses routing intent.
 *
 * It chooses between:
 *   - explicit `dynamic/<intent>` for hard business policy (our 8 managed routes),
 *   - `cloudflare/auto` (Auto Router) for ambiguous/general traffic where semantic routing wins,
 *   - a provider-native path for modalities Dynamic Routes do not support.
 *
 * It also builds the request headers (metadata, session, cache, custom cost). App code asks for
 * intents — never raw provider model ids.
 *
 * SECURITY (non-negotiable): every input must be SERVER-DERIVED. Never forward raw client
 * headers. `quality` is clamped to the plan's entitlement, and the Auto Router allowlist is the
 * INTERSECTION of any requested pool with the plan's entitlement — a user header can never widen
 * the model pool or quality tier.
 */

import { type RoutingMetadata, type Plan, clampQualityToPlan, toMetadataHeader } from "./metadata.ts";
import { type ManagedRoute } from "./gateways.ts";

export type Workload = ManagedRoute | "auto";
export type Modality = "text" | "vision" | "image" | "audio" | "speech" | "video";

export interface CustomCost {
  // Real negotiated per-token rates only — never invented. Mirrors cf-aig-custom-cost.
  inputTokenCost?: number;
  outputTokenCost?: number;
  cacheReadTokenCost?: number;
  cacheWriteTokenCost?: number;
}

export interface PolicyInput {
  workload: Workload;
  metadata: RoutingMetadata; // SERVER-DERIVED
  modality?: Modality; // default "text"
  sessionId?: string; // multi-turn agents/chats -> cf-aig-session-id (session stability)
  cache?: { key?: string; ttlSeconds?: number; skip?: boolean };
  customCost?: CustomCost;
  autoRouterAllowlist?: string[]; // only meaningful for workload "auto"; clamped by plan below
}

export interface GatewayRequest {
  model: string; // dynamic/<intent> | cloudflare/auto | provider-native:<modality>
  headers: Record<string, string>;
  allowlist?: string[]; // server-enforced Auto Router provider pool (apply via current Auto Router control)
  unsupported?: string; // set when the modality must bypass Dynamic Routes/Auto Router
}

const SENSITIVE: Workload = "restricted";

/** Plan -> broadest Auto Router provider pool the plan may use (server-enforced). */
export const PLAN_AUTOROUTER_ALLOWLIST: Record<Plan, string[]> = {
  free: ["workers-ai"],
  starter: ["workers-ai"],
  pro: ["workers-ai", "openai", "anthropic"],
  enterprise: ["workers-ai", "openai", "anthropic"],
  internal: ["workers-ai", "openai", "anthropic"],
};

export function buildGatewayRequest(input: PolicyInput): GatewayRequest {
  const modality = input.modality ?? "text";
  // Defense-in-depth entitlement clamp (the route graphs also cap this server-side).
  const md: RoutingMetadata = {
    ...input.metadata,
    quality: clampQualityToPlan(input.metadata.quality, input.metadata.plan),
  };
  const headers: Record<string, string> = { "cf-aig-metadata": toMetadataHeader(md) };

  // Capability gating: Dynamic Routes + Auto Router are text Chat-Completions ONLY.
  if (modality !== "text") {
    return {
      model: `provider-native:${modality}`,
      headers,
      unsupported: `modality '${modality}' must use the provider-native AI Gateway path, not Dynamic Routes/Auto Router`,
    };
  }

  if (input.sessionId) headers["cf-aig-session-id"] = input.sessionId;

  // Cache controls. Restricted ALWAYS skips cache; never cache personalized content by default.
  if (input.workload === SENSITIVE || input.cache?.skip) {
    headers["cf-aig-skip-cache"] = "true";
  } else {
    if (input.cache?.key) headers["cf-aig-cache-key"] = input.cache.key;
    if (input.cache?.ttlSeconds != null) headers["cf-aig-cache-ttl"] = String(input.cache.ttlSeconds);
  }
  // Restricted also disables prompt/response payload logging while preserving usage metrics.
  if (input.workload === SENSITIVE) headers["cf-aig-collect-log"] = "false";

  // Custom cost (only when real negotiated numbers are supplied).
  if (input.customCost && Object.keys(input.customCost).length > 0) {
    headers["cf-aig-custom-cost"] = JSON.stringify(input.customCost);
  }

  if (input.workload === "auto") {
    const planPool = PLAN_AUTOROUTER_ALLOWLIST[md.plan];
    const allowlist = input.autoRouterAllowlist
      ? input.autoRouterAllowlist.filter((p) => planPool.includes(p))
      : planPool;
    return { model: "cloudflare/auto", headers, allowlist };
  }

  return { model: `dynamic/${input.workload}`, headers };
}

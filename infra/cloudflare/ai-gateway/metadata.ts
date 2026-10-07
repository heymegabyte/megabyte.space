/**
 * AI Gateway routing metadata contract — the ONE shared schema across BOTH products
 * (megabyte-space + projectsites-dev). Cloudflare persists at most FIVE custom metadata
 * fields per request, so we spend them on exactly these five. Workload is deliberately
 * NOT a field: the dynamic route name already encodes workload (dynamic/code,
 * dynamic/architect, dynamic/batch, ...).
 *
 * SECURITY (non-negotiable): never trust routing metadata supplied directly by an
 * untrusted browser/client. The server / policy Worker MUST derive authoritative
 * tenant_id, actor_id, plan, quality entitlement and environment server-side before
 * attaching them via the `cf-aig-metadata` header. Any client-supplied quality/plan
 * must be clamped to the caller's real entitlement (see clampQualityToPlan). A user must
 * never be able to widen their model pool or quality tier by sending a header.
 */

export const PLANS = ["free", "starter", "pro", "enterprise", "internal"] as const;
export type Plan = (typeof PLANS)[number];

export const QUALITIES = ["economy", "balanced", "high", "maximum"] as const;
export type Quality = (typeof QUALITIES)[number];

export const ENVIRONMENTS = ["preview", "production", "internal", "test"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

/** The five — and only five — custom metadata fields. */
export const METADATA_FIELDS = ["tenant_id", "actor_id", "plan", "quality", "environment"] as const;

export interface RoutingMetadata {
  tenant_id: string;
  actor_id: string;
  plan: Plan;
  quality: Quality;
  environment: Environment;
}

const MAX_ID_LEN = 128;

function isBoundedString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}

export interface ValidationResult {
  ok: boolean;
  value?: RoutingMetadata;
  errors: string[];
}

/** Strict validation. Unknown fields are rejected so we never exceed CF's 5-field cap. */
export function validateMetadata(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: ["metadata must be an object"] };
  }
  const o = input as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (!(METADATA_FIELDS as readonly string[]).includes(k)) {
      errors.push(`unknown metadata field "${k}" (only ${METADATA_FIELDS.join(", ")} are allowed)`);
    }
  }
  if (!isBoundedString(o.tenant_id, MAX_ID_LEN)) errors.push("tenant_id must be a non-empty string <= 128 chars");
  if (!isBoundedString(o.actor_id, MAX_ID_LEN)) errors.push("actor_id must be a non-empty string <= 128 chars");
  if (!PLANS.includes(o.plan as Plan)) errors.push(`plan must be one of: ${PLANS.join(", ")}`);
  if (!QUALITIES.includes(o.quality as Quality)) errors.push(`quality must be one of: ${QUALITIES.join(", ")}`);
  if (!ENVIRONMENTS.includes(o.environment as Environment)) errors.push(`environment must be one of: ${ENVIRONMENTS.join(", ")}`);
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    value: {
      tenant_id: o.tenant_id as string,
      actor_id: o.actor_id as string,
      plan: o.plan as Plan,
      quality: o.quality as Quality,
      environment: o.environment as Environment,
    },
  };
}

/** The maximum quality tier a plan is entitled to. The server MUST clamp requests to this. */
export const PLAN_MAX_QUALITY: Record<Plan, Quality> = {
  free: "balanced",
  starter: "balanced",
  pro: "high",
  enterprise: "maximum",
  internal: "maximum",
};

const QUALITY_RANK: Record<Quality, number> = { economy: 0, balanced: 1, high: 2, maximum: 3 };

/** Clamp a requested quality DOWN to the plan's entitlement. Never upgrades. */
export function clampQualityToPlan(requested: Quality, plan: Plan): Quality {
  const cap = PLAN_MAX_QUALITY[plan];
  return QUALITY_RANK[requested] <= QUALITY_RANK[cap] ? requested : cap;
}

/** Serialize to the `cf-aig-metadata` header value (<=5 fields, validated). */
export function toMetadataHeader(m: RoutingMetadata): string {
  const v = validateMetadata(m);
  if (!v.ok) throw new Error("invalid routing metadata: " + v.errors.join("; "));
  return JSON.stringify({
    tenant_id: m.tenant_id,
    actor_id: m.actor_id,
    plan: m.plan,
    quality: m.quality,
    environment: m.environment,
  });
}

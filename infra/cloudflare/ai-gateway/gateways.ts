/**
 * The two application/security boundaries. We deliberately use exactly TWO gateways and
 * many tenants (metadata.tenant_id) rather than a gateway-per-customer design.
 */

export type GatewayProfile = "megabyte" | "projectsites";

export interface GatewayDef {
  id: string;
  label: string;
  profile: GatewayProfile;
  notes: string;
}

export const GATEWAYS: GatewayDef[] = [
  {
    id: "megabyte-space",
    label: "Megabyte OS — internal/personal agents + Cloudflare OS",
    profile: "megabyte",
    notes:
      "Stronger default intelligence; frontier used more aggressively for architecture/review; broad model pool; long-running agents; session stability; fast canary adoption of new models.",
  },
  {
    id: "projectsites-dev",
    label: "ProjectSites — multi-tenant production",
    profile: "projectsites",
    notes:
      "Tenant isolation + per-tenant attribution; hard cost containment; plan-aware routing; graceful degradation; strong cheap defaults; frontier escalation only when justified; avoid Unified-Billing surprises on free traffic.",
  },
];

export function gatewayById(id: string): GatewayDef {
  const g = GATEWAYS.find((x) => x.id === id);
  if (!g) throw new Error(`unknown gateway: ${id}`);
  return g;
}

/** Non-secret. Also present in CLAUDE.md; cf.ts prefers get-secret CLOUDFLARE_ACCOUNT_ID. */
export const ACCOUNT_ID_FALLBACK = "84fa0d1b16ff8086dd958c468ce7fd59";

/** The eight managed route intents. The CF resource name is the part after `dynamic/`. */
export const MANAGED_ROUTES = [
  "general",
  "economy",
  "code",
  "architect",
  "research",
  "critical",
  "batch",
  "restricted",
] as const;
export type ManagedRoute = (typeof MANAGED_ROUTES)[number];

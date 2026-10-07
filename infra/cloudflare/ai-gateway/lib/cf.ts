/**
 * Cloudflare AI Gateway API client — control plane (management) + data plane (verification).
 *
 * Secrets are resolved at RUNTIME via get-secret and never printed/returned/serialized:
 *   - management    : global API key (X-Auth-Key/X-Auth-Email) — the scoped CLOUDFLARE_API_TOKEN
 *                     lacks AI Gateway API scope on this account, so we use the documented fallback.
 *   - data plane    : CLOUDFLARE_API_TOKEN as the `cf-aig-authorization` run token
 *                     (it carries the "AI Gateway Run" permission).
 *
 * Nothing here ever writes a secret into a file, log line, or returned object.
 */

import { execFileSync } from "node:child_process";
import { ACCOUNT_ID_FALLBACK } from "../gateways.ts";
import type { Element } from "../graph.ts";
import type { RoutingMetadata } from "../metadata.ts";

const API = "https://api.cloudflare.com/client/v4";
const EMAIL = "blzalewski@gmail.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export function secret(name: string): string {
  try {
    return execFileSync("get-secret", [name], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export function accountId(): string {
  return process.env.CLOUDFLARE_ACCOUNT_ID || secret("CLOUDFLARE_ACCOUNT_ID") || ACCOUNT_ID_FALLBACK;
}

function mgmtHeaders(): Record<string, string> {
  const key = secret("CLOUDFLARE_API_KEY");
  if (!key) throw new Error("CLOUDFLARE_API_KEY unavailable from get-secret");
  return { "X-Auth-Key": key, "X-Auth-Email": EMAIL, "content-type": "application/json" };
}

export interface CFResult {
  status: number;
  ok: boolean;
  success: boolean;
  body: Json;
  errorText: string;
}

async function mgmt(path: string, init: RequestInit = {}): Promise<CFResult> {
  const r = await fetch(`${API}${path}`, { ...init, headers: { ...mgmtHeaders(), ...(init.headers as Record<string, string>) } });
  let body: Json = {};
  try {
    body = await r.json();
  } catch {
    /* non-json */
  }
  const errorText = body?.errors ? JSON.stringify(body.errors).slice(0, 240) : "";
  return { status: r.status, ok: r.ok, success: !!body?.success, body, errorText };
}

export interface RouteSummary {
  id: string;
  name: string;
  elements: Element[];
  activeVersionId?: string;
  deploymentId?: string;
}

export async function listRoutes(gw: string): Promise<RouteSummary[]> {
  const a = accountId();
  const { body } = await mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/routes?per_page=100`);
  const routes: Json[] = body?.data?.routes ?? body?.result ?? [];
  return routes.map((r) => ({
    id: r.id,
    name: r.name,
    elements: r.elements || [],
    activeVersionId: r.version?.version_id,
    deploymentId: r.deployment?.deployment_id,
  }));
}

export async function getRouteByName(gw: string, name: string): Promise<RouteSummary | undefined> {
  return (await listRoutes(gw)).find((r) => r.name === name);
}

export async function createRoute(gw: string, name: string, elements: Element[]): Promise<CFResult> {
  const a = accountId();
  return mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/routes`, { method: "POST", body: JSON.stringify({ name, elements }) });
}

export async function createVersion(gw: string, routeId: string, elements: Element[]): Promise<CFResult> {
  const a = accountId();
  return mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/routes/${routeId}/versions`, {
    method: "POST",
    body: JSON.stringify({ elements }),
  });
}

export async function listVersions(gw: string, routeId: string): Promise<Json[]> {
  const a = accountId();
  // NOTE: a `per_page` query param BREAKS this sub-endpoint (returns an empty {result:{}}).
  // The versions array is under data.versions.
  const { body } = await mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/routes/${routeId}/versions`);
  const arr = body?.data?.versions ?? body?.result;
  return Array.isArray(arr) ? arr : [];
}

export async function listDeployments(gw: string, routeId: string): Promise<Json[]> {
  const a = accountId();
  const { body } = await mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/routes/${routeId}/deployments`);
  const arr = body?.data?.deployments ?? body?.result;
  return Array.isArray(arr) ? arr : [];
}

/** The route/version list responses do NOT include the graph; it lives in version.data.
 *  Fetch a specific version and return its elements array (data may be an object or a JSON string). */
export async function getVersionElements(gw: string, routeId: string, versionId: string): Promise<Element[]> {
  const a = accountId();
  const { body } = await mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/routes/${routeId}/versions/${versionId}`);
  const vr = body?.result ?? body;
  const data = vr?.data;
  if (!data) return [];
  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  return Array.isArray(parsed) ? parsed : (parsed?.elements ?? []);
}

/** The currently-deployed graph for a route (empty array if none/unresolvable). */
export async function activeElements(gw: string, summary: RouteSummary): Promise<Element[]> {
  if (!summary.activeVersionId) return [];
  try {
    return await getVersionElements(gw, summary.id, summary.activeVersionId);
  } catch {
    return [];
  }
}

export async function deployVersion(gw: string, routeId: string, versionId: string): Promise<CFResult> {
  const a = accountId();
  return mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/routes/${routeId}/deployments`, {
    method: "POST",
    body: JSON.stringify({ version_id: versionId }),
  });
}

export async function deleteRoute(gw: string, routeId: string): Promise<CFResult> {
  const a = accountId();
  return mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/routes/${routeId}`, { method: "DELETE" });
}

export async function getGateway(gw: string): Promise<CFResult> {
  const a = accountId();
  return mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}`);
}

export async function listProviderConfigs(gw: string): Promise<Json[]> {
  const a = accountId();
  const { body } = await mgmt(`/accounts/${a}/ai-gateway/gateways/${gw}/provider_configs`);
  return body?.result ?? [];
}

export interface RouteCallResult {
  status: number;
  model: string | null;
  provider: string | null;
  content: string | null;
  cfRay: string | null;
  logId: string | null;
  raw: string;
}

/** Data-plane call through dynamic/<routeName>. Uses the run token; metadata via cf-aig-metadata.
 *  skipCache defaults to TRUE: a verifier must test LIVE routing, never a cached response (and a
 *  gateway with cache_ttl>0, e.g. megabyte-space=300s, would otherwise serve stale selections). */
export async function callDynamicRoute(
  gw: string,
  routeName: string,
  opts: { prompt?: string; metadata?: Record<string, string> | RoutingMetadata; headers?: Record<string, string>; maxTokens?: number; skipCache?: boolean } = {},
): Promise<RouteCallResult> {
  const a = accountId();
  const run = secret("CLOUDFLARE_API_TOKEN");
  if (!run) throw new Error("CLOUDFLARE_API_TOKEN (gateway run token) unavailable from get-secret");
  const headers: Record<string, string> = { "content-type": "application/json", "cf-aig-authorization": `Bearer ${run}` };
  if (opts.skipCache !== false) headers["cf-aig-skip-cache"] = "true";
  if (opts.metadata) headers["cf-aig-metadata"] = JSON.stringify(opts.metadata);
  Object.assign(headers, opts.headers || {});
  const r = await fetch(`https://gateway.ai.cloudflare.com/v1/${a}/${gw}/compat/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: `dynamic/${routeName}`,
      messages: [{ role: "user", content: opts.prompt ?? "Reply with the single word OK." }],
      max_tokens: opts.maxTokens ?? 8,
      temperature: 0,
    }),
  });
  const raw = await r.text();
  let content: string | null = null;
  try {
    content = JSON.parse(raw).choices?.[0]?.message?.content ?? null;
  } catch {
    /* error body */
  }
  return {
    status: r.status,
    model: r.headers.get("cf-aig-model"),
    provider: r.headers.get("cf-aig-provider"),
    content,
    cfRay: r.headers.get("cf-ray"),
    logId: r.headers.get("cf-aig-log-id"),
    raw,
  };
}

export async function verifyRunToken(): Promise<{ ok: boolean; status?: string }> {
  const run = secret("CLOUDFLARE_API_TOKEN");
  if (!run) return { ok: false };
  const r = await fetch(`${API}/user/tokens/verify`, { headers: { authorization: `Bearer ${run}` } });
  const b = (await r.json().catch(() => ({}))) as Json;
  return { ok: r.ok, status: b?.result?.status };
}

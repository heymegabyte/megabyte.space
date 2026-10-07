/**
 * Dynamic Routing graph primitives + composable builders + canonicalization.
 *
 * Node shapes are taken verbatim from the current Cloudflare docs
 * (ai-gateway/features/dynamic-routing/json-configuration) and were validated live
 * against both gateways on 2026-10-06 (start/model/end/conditional confirmed serving
 * traffic; cross-provider fallback confirmed failing over deepseek->workers-ai).
 */

import { createHash } from "node:crypto";

export interface ElementRef {
  elementId: string;
}
export type Outputs = Record<string, ElementRef>;

export interface StartElement {
  id: string;
  type: "start";
  outputs: { next: ElementRef };
}
export interface ModelProps {
  provider: string;
  model: string;
  timeout: number;
  retries: number;
}
export interface ModelElement {
  id: string;
  type: "model";
  properties: ModelProps;
  outputs: { success: ElementRef; fallback?: ElementRef };
}
export interface ConditionalElement {
  id: string;
  type: "conditional";
  properties: { conditions: Record<string, unknown> };
  outputs: { true: ElementRef; false: ElementRef };
}
export interface PercentageElement {
  id: string;
  type: "percentage";
  outputs: Record<string, ElementRef>;
}
export interface RateProps {
  limitType: "count" | "cost";
  key: string;
  limit: number;
  window: number;
}
export interface RateElement {
  id: string;
  type: "rate";
  properties: RateProps;
  outputs: { success: ElementRef; fallback?: ElementRef };
}
export interface EndElement {
  id: string;
  type: "end";
  outputs: Record<string, never>;
}

export type Element =
  | StartElement
  | ModelElement
  | ConditionalElement
  | PercentageElement
  | RateElement
  | EndElement;

export interface RouteGraph {
  name: string;
  elements: Element[];
}

export interface ModelChoice {
  provider: string;
  model: string;
}

const ref = (id: string): ElementRef => ({ elementId: id });

export const start = (nextId: string): StartElement => ({
  id: "start",
  type: "start",
  outputs: { next: ref(nextId) },
});

export const end = (): EndElement => ({ id: "end", type: "end", outputs: {} });

export const conditional = (
  id: string,
  conditions: Record<string, unknown>,
  trueId: string,
  falseId: string,
): ConditionalElement => ({
  id,
  type: "conditional",
  properties: { conditions },
  outputs: { true: ref(trueId), false: ref(falseId) },
});

export const rate = (
  id: string,
  props: RateProps,
  successId: string,
  fallbackId: string,
): RateElement => ({
  id,
  type: "rate",
  properties: props,
  outputs: { success: ref(successId), fallback: ref(fallbackId) },
});

export const percentage = (id: string, splits: Record<string, string>): PercentageElement => ({
  id,
  type: "percentage",
  outputs: Object.fromEntries(Object.entries(splits).map(([k, v]) => [k, ref(v)])),
});

/**
 * Build an ordered CROSS-PROVIDER fallback chain of model nodes terminating at `endId`.
 * success -> endId; fallback -> next model; last model's fallback -> endId.
 * Prefer alternating providers in `models` so the chain is true resilience, not three
 * models behind one provider outage.
 */
export function fallbackChain(
  prefix: string,
  models: ModelChoice[],
  opts: { timeout: number; retries: number },
  endId: string,
): { entry: string; elements: ModelElement[] } {
  if (models.length === 0) throw new Error(`fallbackChain ${prefix}: needs >=1 model`);
  const elements: ModelElement[] = models.map((m, i) => {
    const id = `${prefix}_${i}`;
    const nextId = i < models.length - 1 ? `${prefix}_${i + 1}` : endId;
    return {
      id,
      type: "model",
      properties: { provider: m.provider, model: m.model, timeout: opts.timeout, retries: opts.retries },
      outputs: { success: ref(endId), fallback: ref(nextId) },
    };
  });
  return { entry: `${prefix}_0`, elements };
}

/** Count distinct providers in a model list (used to enforce cross-provider resilience). */
export function distinctProviders(models: ModelChoice[]): number {
  return new Set(models.map((m) => m.provider)).size;
}

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) out[k] = sortValue(o[k]);
    return out;
  }
  return v;
}

/** Order-independent canonical serialization used for drift detection + manifest hashing. */
export function canonicalElements(elements: Element[]): string {
  const normalized = elements
    .map((e) => sortValue(e))
    .sort((a, b) => String((a as { id: string }).id).localeCompare(String((b as { id: string }).id)));
  return JSON.stringify(normalized);
}

export function graphHash(elements: Element[]): string {
  return createHash("sha256").update(canonicalElements(elements)).digest("hex").slice(0, 16);
}

/** Structural validation before a graph is ever sent to Cloudflare. */
export function validateGraph(g: RouteGraph): string[] {
  const errors: string[] = [];
  const ids = new Set(g.elements.map((e) => e.id));
  if (!ids.has("start")) errors.push(`${g.name}: missing start element`);
  if (!ids.has("end")) errors.push(`${g.name}: missing end element`);
  if (ids.size !== g.elements.length) errors.push(`${g.name}: duplicate element ids`);
  for (const e of g.elements) {
    for (const out of Object.values(e.outputs as Outputs)) {
      if (out && typeof out === "object" && "elementId" in out) {
        if (!ids.has(out.elementId)) errors.push(`${g.name}: ${e.id} -> missing element ${out.elementId}`);
      }
    }
    if (e.type === "percentage") {
      const sum = Object.keys(e.outputs).reduce((s, k) => s + parseFloat(k), 0);
      if (Math.round(sum) !== 100) errors.push(`${g.name}: percentage ${e.id} sums to ${sum}%, must be 100%`);
    }
  }
  return errors;
}

/**
 * Model capability registry — the PROVEN-healthy pool.
 *
 * Every entry below was verified via live, tiny smoke tests through BOTH gateways
 * (megabyte-space + projectsites-dev) on 2026-10-06. Workers AI models are keyless and
 * keep data on Cloudflare; OpenAI models are reached via the account's Unified Billing
 * (no OpenAI BYOK key is stored on these gateways). Regenerate the machine-readable
 * snapshot with `node ai-routes.ts verify --probe-models` -> capability-matrix.json.
 *
 * Capability gating: Dynamic Routes accept the OpenAI Chat-Completions request shape ONLY.
 * Vision/image/audio/video/Anthropic-Messages/OpenAI-Responses requests must use the
 * provider-native AI Gateway path, never these routes.
 */

import type { ModelChoice } from "./graph.ts";

export const PROVIDERS = {
  WORKERS_AI: "workers-ai",
  OPENAI: "openai",
  DEEPSEEK: "deepseek",
  ANTHROPIC: "anthropic",
} as const;

export const MODELS = {
  // --- Workers AI (keyless; data stays on Cloudflare) ---
  tiny: { provider: PROVIDERS.WORKERS_AI, model: "@cf/meta/llama-3.2-1b-instruct" },
  cheapest: { provider: PROVIDERS.WORKERS_AI, model: "@cf/meta/llama-3.2-3b-instruct" },
  fast: { provider: PROVIDERS.WORKERS_AI, model: "@cf/meta/llama-3.1-8b-instruct-fp8" },
  deepseekFlash: { provider: PROVIDERS.WORKERS_AI, model: "@cf/deepseek-ai/deepseek-v4-flash-0731" },
  general: { provider: PROVIDERS.WORKERS_AI, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" },
  deepseekPro: { provider: PROVIDERS.WORKERS_AI, model: "@cf/deepseek-ai/deepseek-v4-pro-0813" },
  codeRoutine: { provider: PROVIDERS.WORKERS_AI, model: "@cf/qwen/qwen2.5-coder-32b-instruct" },
  reasoning: { provider: PROVIDERS.WORKERS_AI, model: "@cf/qwen/qwq-32b" },
  reasoningDs: { provider: PROVIDERS.WORKERS_AI, model: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b" },
  content: { provider: PROVIDERS.WORKERS_AI, model: "@cf/meta/llama-4-scout-17b-16e-instruct" },
  mistral: { provider: PROVIDERS.WORKERS_AI, model: "@cf/mistralai/mistral-small-3.1-24b-instruct" },
  // --- OpenAI (Unified Billing; no BYOK key stored on these gateways) ---
  oaiMini: { provider: PROVIDERS.OPENAI, model: "gpt-4o-mini" },
  oai4o: { provider: PROVIDERS.OPENAI, model: "gpt-4o" },
  oai41mini: { provider: PROVIDERS.OPENAI, model: "gpt-4.1-mini" },
  oai41: { provider: PROVIDERS.OPENAI, model: "gpt-4.1" },
} satisfies Record<string, ModelChoice>;

export type ModelKey = keyof typeof MODELS;

/** Providers/models deliberately kept OUT of production routes right now, with the reason. */
export const QUARANTINED = [
  {
    provider: "anthropic",
    reason:
      "No valid BYOK credential on these gateways (live smoke: 401 'Invalid Anthropic API Key'). To re-enable: add a funded Anthropic BYOK key via provider_configs, smoke it, then move claude to the front of architect/critical for best-in-class judgment.",
  },
  {
    provider: "deepseek (direct api.deepseek.com)",
    reason:
      "The gateway resolves a STALE account/Unified-Billing DeepSeek key (live smoke: 'api key ****6083 / ****6e22 is invalid') that overrides a freshly-created BYOK provider_config holding the valid get-secret key. Could not be displaced without globally flipping byok_only (which the task forbids). DeepSeek capability is therefore served via Workers AI (@cf/deepseek-ai/deepseek-v4-flash + deepseek-v4-pro + r1-distill), which is keyless and healthy.",
  },
  {
    provider: "openai o-series (o4-mini, o3, ...)",
    reason:
      "Reasoning models reject `max_tokens` (require `max_completion_tokens`), breaking the uniform Chat-Completions contract shared by every route. Use gpt-4.1 / gpt-4o for frontier instead.",
  },
] as const;

/** Human-readable capability guidance consumed by README + docs. */
export const CAPABILITY_NOTES = {
  tools:
    "Tool-calls work on openai/* and the larger Workers AI instruct models; never route tool/function-calling requests to tiny 1b/3b models.",
  vision:
    "Dynamic Routes are text Chat-Completions only. Vision/image/audio/video must use the provider-native AI Gateway path, NOT these routes.",
  longContext: "Prefer gpt-4.1 / llama-3.3-70b / qwq-32b for long-context synthesis (research route).",
} as const;

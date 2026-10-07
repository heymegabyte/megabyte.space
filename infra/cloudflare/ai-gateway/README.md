# AI Gateway Dynamic Routing control plane

Source-controlled, idempotent, reproducible control plane for Cloudflare AI Gateway
**Dynamic Routes** on the two estate gateways:

| Gateway (CF id)    | Product                              | Posture                                   |
| ------------------ | ------------------------------------ | ----------------------------------------- |
| `megabyte-space`   | Megabyte OS (internal/personal + OS) | Stronger defaults, aggressive frontier    |
| `projectsites-dev` | ProjectSites (multi-tenant prod)     | Cost-contained, plan-aware, degrade-first |

Two gateways, **many tenants** (via `metadata.tenant_id`) — never a gateway-per-customer.

## Golden rule for application code

Ask for an **intent**, never a provider model id. Use `policy.ts`:

```ts
import { buildGatewayRequest } from "./policy.ts";
const { model, headers } = buildGatewayRequest({
  workload: "code",               // dynamic/code | ... | "auto" (Auto Router)
  metadata: serverDerivedMeta,    // the 5-field contract, SERVER-DERIVED (never client headers)
  sessionId: conversationId,      // multi-turn -> cf-aig-session-id (session stability)
});
// POST https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/compat/chat/completions
// body: { model, messages, ... }  headers: { ...headers, "cf-aig-authorization": "Bearer <run token>" }
```

## The 8 managed routes (identical names on both gateways)

| `dynamic/<name>` | Purpose                                                         |
| ---------------- | -------------------------------------------------------------- |
| `general`        | Our deterministic policy (plan/quality/environment branching). |
| `economy`        | Lowest practical cost. The shared degradation target.          |
| `code`           | Routine coding; escalates to strong models at high/maximum.    |
| `architect`      | Architecture/judgment/arbitration. Frontier, long timeouts.    |
| `research`       | Synthesis/reasoning over supplied evidence (NOT a web search). |
| `critical`       | Correctness + availability > cost. Max provider diversity.     |
| `batch`          | Background bulk; per-tenant count limit → degrade, not break.  |
| `restricted`     | Sensitive/internal. workers-ai-only allowlist; skip-cache.     |

> The CF resource name is the part **after** `dynamic/`. The unrelated pre-existing route
> `hey` on megabyte-space is never touched.

## Metadata contract (exactly 5 fields — CF persists at most 5)

`tenant_id` · `actor_id` · `plan` (`free|starter|pro|enterprise|internal`) ·
`quality` (`economy|balanced|high|maximum`) · `environment` (`preview|production|internal|test`).

Workload is **not** a field — the route name already encodes it. **Never trust client-supplied
metadata**: the server/policy Worker derives all five and clamps `quality` to the plan's
entitlement (`clampQualityToPlan`). A user header can never widen their pool/tier.

## When Auto Router vs Dynamic Routes

- **Dynamic Routes** (`dynamic/<intent>`) — hard business policy: plan/quality caps, provider
  allowlists, budget degradation, cross-provider failover. Deterministic.
- **Auto Router** (`cloudflare/auto`) — ambiguous/general traffic; CF classifies task/difficulty,
  removes unhealthy providers, honors spend limits + allowlists + session affinity. Always pass
  `cf-aig-session-id` for multi-turn. The allowlist is clamped to the plan server-side.
- **Provider-native path** — anything not text Chat-Completions (vision/image/audio/speech/video,
  Anthropic Messages, OpenAI Responses). `policy.ts` returns `provider-native:<modality>` +
  `unsupported` for these; they must NOT go through Dynamic Routes/Auto Router.

## Commands

```bash
node ai-routes.ts plan [--drift-check]        # secret-free diff repo<->CF (exit 1 on drift w/ flag)
node ai-routes.ts apply [--gateway <id>]      # idempotent reconcile + verify + auto-rollback
node ai-routes.ts verify [--probe-models]     # live contract checks (+ refresh capability-matrix.json)
node ai-routes.ts status                      # managed routes + active version ids
node ai-routes.ts rollback <gw> <route> [ver] # deploy a prior version (default: previous)
node ai-routes.ts degraded-mode <gw> --enable|--disable   # emergency economical routing (reversible)
```

`node --test tests/contract.test.ts` runs the pure tests always + live contract tests when creds exist.

## How apply reconciles (idempotent)

GET route by name → canonicalize + hash the **active version's graph** (`version.data`) vs desired
→ **noop** if equal, **create** (`POST /routes {name,elements}` — creates+deploys in one call) if
absent, else **create a new version** (`POST /routes/{id}/versions`) + **deploy** it
(`POST /routes/{id}/deployments {version_id}`), keeping the prior version id. Then a live verify
call; if it regressed and a prior version exists, it auto-rolls-back. Running apply twice makes no
new versions. `manifest.json` records gateway/route/ids/hash/verification (secret-free); Cloudflare
remains authoritative for full version/deployment history.

## How to…

- **Add a provider/model** — add it to `models.ts` (prove it with `verify --probe-models` first),
  reference it in a lane in `routes.ts`, `plan` then `apply`. A provider needs either a healthy
  BYOK `provider_config` on the gateway or (for OpenAI) Unified Billing; `workers-ai` is keyless.
- **Canary a model** — in `routes.ts` wrap a lane entry in a `percentage` node
  (e.g. `{ "95%": current, "5%": challenger }`), `apply` (new version). Promotion is **not**
  automatic on a 200 — weigh error rate, latency, token cost, User-Insights model-fit, and any
  eval results, then raise the split 1→5→20→50→100 across successive versions.
- **Inspect status** — `node ai-routes.ts status`.
- **Roll back** — `node ai-routes.ts rollback <gw> <route> [versionId]` (CF keeps history; deploying
  an earlier version is the rollback).
- **Degraded mode** — `degraded-mode <gw> --enable` routes noncritical traffic (general/economy/
  code/batch/research) to keyless workers-ai economical models and **preserves** critical/architect/
  restricted; `--disable` restores. Fully reversible.

## Hard constraints

- Dynamic Routes are **OpenAI Chat-Completions-shaped only**. Media/other protocols use the normal
  provider-native AI Gateway path.
- **Never** put provider credentials in route JSON, tests, snapshots, logs, the manifest, or git.
  Secrets resolve at runtime via `get-secret`; BYOK keys live only in Cloudflare Secrets Store.
- Verification calls always send `cf-aig-skip-cache` (megabyte-space has `cache_ttl=300`) so tests
  reflect live routing, never a cached selection.

## Auth model

- **Management** — global API key (`get-secret CLOUDFLARE_API_KEY` + `X-Auth-Email`). The scoped
  `CLOUDFLARE_API_TOKEN` lacks AI Gateway **API** scope on this account.
- **Data plane** (`cf-aig-authorization`) — `get-secret CLOUDFLARE_API_TOKEN`, which carries the
  **AI Gateway Run** permission (added additively; see the estate report). Both gateways have
  authentication ON; the run token is required for every call.

See `MODELS` / `QUARANTINED` in `models.ts` for the proven pool and the providers deliberately
excluded (Anthropic — no valid key; direct DeepSeek API — stale account key overrides BYOK; served
via Workers AI DeepSeek-V4 instead).

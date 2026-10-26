# Estate — 15 Next-Task Backlog ("Integrate all 15 of the ideas")

Decomposed from the 2026 research synthesis (Brian directive 2026-10-26, `/loop 15m`). Per
`split-work-into-ledger`: this is the durable drain queue — the loop advances ONE coherent, verified
slice per fire; it does NOT try to execute all 15 at once. Status: `todo` · `wip` · `done` · `blocked`.
Many items span OTHER repos/hosts (fleet runner, OS fork, Coolify host, GPU box, site repos) — note
the surface so a fire picks a slice it can actually ship + verify from its session.

| # | Idea | Tier | Surface | Status | First slice |
|---|------|------|---------|--------|-------------|
| 1 | Fix the hollow autonomous loop (fail RED on no-op, require real shipped improvement) | 1 | agentskills fleet.py/finalize.py on the self-hosted runner | todo (needs runner access) | make finalize.py exit non-zero on empty diff + add a shipped-improvement assertion |
| 2 | Independent acceptance-contract gate + per-agent cost dashboard (reviewer≠author; tag tokens/model/task) | 1 | Paperclip + claw-orchestrator (fleet host) | todo | wire clawo `runs` + openclaw `usage-cost` + claw-router grants into one per-agent budget view |
| 3 | Dead-man's-switch monitoring mesh (Beszel+Uptime Kuma+Healthchecks cross-wired, auto-register every job) | 1 | HC API + Coolify host + `~/.claude/skills/healthchecks-monitor` | **done (core) · coverage ongoing** | ✅ shipped `hc-register.mjs` (idempotent Mgmt-API registrar) + wired `hc-brand-selfheal` end-to-end (verified up, 2 channels). NEXT: register remaining unmonitored crons (D1/R2 backups, cert/secret renewals, /run-the-loop heartbeat) + a monitor-the-monitors switch + auto-register on deploy |
| 4 | Cloudflare Worker Previews + Artifacts for the fleet (per-branch prod-like envs per agent change) | 2 | fleet CI + CF | todo | add `wrangler preview` per PR branch in the fleet's deploy step |
| 5 | Migrate feature flags to Cloudflare Flagship (sub-ms edge eval; already mandated) | 2 | cloudflare-os fork (OS repo) | todo (needs a Flagship app provisioned) | provision Flagship app → bind `env.FLAGSHIP` → `FlagshipEvaluationProvider` prefers Flagship, D1 fallback |
| 6 | Rebuild OS agent surfaces on Agents SDK / Project Think + Workers-AI large models (Kimi K2.5) | 2 | cloudflare-os fork | todo | pilot ONE OS agent on the `Agent` base class (durable session + sub-agents) |
| 7 | Goals/Outcomes orchestration + shared org-memory + approval-inbox (Autonomous Business OS core) | 3 | cloudflare-os fork (North Star) | todo | ship the approval-inbox surface first (plan+sources+confidence+one-click handoff) |
| 8 | Distribute the OS into agents (MCP tools + MCP Apps `ui://` views) | 3 | cloudflare-os fork + MCP | todo | expose 3 OS capabilities as MCP tools w/ dual text+structured output |
| 9 | vLLM on the AMD ROCm GPU box behind LiteLLM (sovereign/near-free throughput tier) | 4 | Proxmox GPU VM + Coolify LiteLLM | todo | `vllm serve` an INT4 Qwen3.x-27B on ROCm → register in LiteLLM as a model |
| 10 | Finish ComfyUI on the GPU + wire into media/video pipeline | 4 | Proxmox GPU VM | wip (was deploying) | verify ROCm run → expose comfy.megabyte.space (Access) → one media-gen integration |
| 11 | Config-as-code + backups for the Coolify fleet (customizations are ephemeral container-layer today) | 5 | Coolify host + OpenTofu | todo | capture each service's compose + a backup cron; start w/ the health.megabyte.space brand (/opt/hc-brand) |
| 12 | Zero-Trust + secret-rotation coverage audit (every internal svc behind Access, secrets ≤90d, no key leaks) | 5 | CF Access + get-secret | todo | audit CF Access apps vs live subdomains + build a secret-rotation calendar |
| 13 | GEO/AEO pass across public sites (llms.txt, Q&A FAQ, structured data, citation tracking) | 5 | projectsites.dev / agent.megabyte.space / oneprompt.site | todo | one-site GEO audit + Share-of-Model baseline |
| 14 | Estate-wide status rollup + SLOs (one status.megabyte.space, auto-registered at deploy) | 5 | Uptime Kuma + CF | **done (core) · SLOs next** | ✅ shipped bulk registrar `~/.claude/skills/uptime-kuma-register/add-domains.sh` (one container, idempotent) + filled the real gaps (agent/health/docker/monitor/media/llm.megabyte.space) → 87 monitors on status.megabyte.space (Websites 44 · Infrastructure 13 · Docker 30). NEXT: error-budget SLOs + an auto-register-on-deploy hook |
| 15 | Prompt-cache + model-routing cost sweep (CF AI Gateway cache, Dynamic Routes, prefix caching) | 5 | AI Gateway control plane | todo | audit product-AI calls for caching + confirm DeepSeek-default routing holds |

## Drain policy
- One slice per fire, shipped GREEN + verified, then tick/append here. Re-fire drains the next.
- Prefer a slice the firing session can fully ship + verify from its own access (don't half-touch 15).
- Cross-link the archived OpenSpec change / commit per shipped slice (traceability).

## Fire log
- 2026-10-26 fire-2: shipped slice **#14 core** — bulk Uptime Kuma registrar (`add-domains.sh`, one throwaway container) + registered the 6 genuinely-missing owned surfaces (agent + health + the Coolify services docker/monitor/media/llm.megabyte.space); verified 87 monitors live on the public status page (Websites 44 · Infrastructure 13 · Docker 30). External availability now pairs with #3's internal job dead-man's-switch (the research's "need both" story). The apex domains were already covered by the `cloudflare-domain-launch-monitoring` rule.
- 2026-10-26 fire-1: created this 15-idea ledger; shipped slice **#3 core** — reusable idempotent HC Management-API registrar (`~/.claude/skills/healthchecks-monitor/hc-register.mjs`, `--channels "*"` = email+Discord) + registered `hc-brand-selfheal` and wired a heartbeat ping into the durable `/opt/hc-brand/reapply-brand.sh` (timer every 2min; timeout 1800 + grace 1800 → alerts if silent ~1h). Verified via API: status=up, n_pings=1, 2 channels. So health.megabyte.space's brand self-heal (fixed last session) is now a monitored dead-man's-switch.

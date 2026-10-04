# MASTER DIRECTIVE — ULTIMATE Megabyte OS + ProjectSites (2026-10-03)

Canonical architecture + execution directive (Brian, 2026-10-03). The full 155-section prompt lives
in the session transcript; THIS file is the durable DECISION RECORD + decomposition the loop drains.
Per `split-work-into-ledger`: a directive this big is LEDGER INTAKE — decompose + advance one verified
slice per fire, never execute wholesale. Cross-links: [[NORTH-STAR]] · [[CONSTITUTION]] · BACKLOG § ★★★ MASTER DIRECTIVE.

## Authority order (when guidance conflicts)

1. newest explicit user decision → 2. verified current repo state → 3. current vendor docs →
4. project constitution / decision ledger → 5. THIS directive → 6. older prompts / archived plans / obsolete TODOs.
Do NOT resurrect superseded architecture because old files still mention it. On a deliberate change:
update the decision ledger → update skills → update architecture docs → remove contradictory old guidance.

## Product model — SIBLING products on a SHARED KERNEL (supersedes any provider→consumer framing)

- Megabyte + ProjectSites.dev are SIBLINGS sharing a common platform kernel — NOT provider→consumer, NOT parent→child, NOT plugin→host.
- **Megabyte** = the advanced, general-purpose frontier AI OS (new infra/interaction models appear here first).
- **ProjectSites.dev** = the radically simplified website/business product; selectively productizes MATURE Megabyte capabilities AFTER their complexity compresses. "More capability while requiring less understanding" — never "expose every Megabyte control."
- **Core rule:** share infrastructure + primitives; PRESERVE distinct product experiences. deskl.ink stays a separate product that MAY share the WorkspaceRuntime/capability kernel ("a desktop for you, a computer for your AI").

## North Star + Prime Directive

- North Star: Megabyte feels like **a computer that understands intent and assembles the software, knowledge, agents, infra, tools, browsers, databases, and human approvals needed to produce the result** — the user states an OUTCOME; the system does the rest. (Extends [[NORTH-STAR]] Autonomous Business OS.)
- Prime Directive: **increase capability faster than complexity.** Complexity belongs in ARCHITECTURE; power disappears into simplicity. Every feature: can AI infer this? can a default remove this setting? can it happen automatically? can we collapse a screen because this exists? Advanced machinery hides behind "Advanced".

## Superseding DECISIONS recorded this intake (deltas vs prior state)

- **Daytona REMOVED** from the target architecture (not in this repo already — decision recorded; never reintroduce unless Brian reverses).
- **Inngest = approved platform-wide** durable cross-system orchestration (Megabyte + ProjectSites + deskl.ink + shared services). One shared `packages/orchestration` — never duplicate the same state machine in both Inngest AND Workflows. Require idempotency + dedupe + correlation IDs.
- **`@cloudflare/computer` = preferred Megabyte Cloud runtime** (code/files/shell/Git) behind a `WorkspaceRuntime` adapter (never bind the app directly to the unstable API). Adapters: CloudflareComputerRuntime · SupersetRuntimeAdapter · RemoteLinuxRuntime · LocalRuntime.
- **Browser Run = canonical browser/visual computer** (Playwright/CDP/Stagehand/screenshots/Live View/takeover). Agents don't each run their own browser. Model: Computer=code/files/shell · Browser Run=browser/web.
- **Superset STAYS** behind `SupersetRuntimeAdapter` (multi-Claude/Codex identities, quota, persistent sessions, worktrees, terminals, diffs, PRs). Megabyte owns the UI; never depend on Superset schemas/RPC shape directly.
- **OpenCode = a coding ENGINE, not the account pool** (behind `CodingEngine`): heavy use for API models (DeepSeek/MiniMax/Workers-AI/OpenAI-compat). Standalone OpenCode Server is NOT mandatory.
- **DeepSeek-default routing** already = WS-12 (DeepSeek for routine/bulk; MiniMax frontend/visual; Codex/OpenAI independent review; Claude orchestration/architecture/judge). Empirical benchmark history may override.
- **Canonical-domain-first** — collapse service subdomains to product paths; ALREADY satisfied in this estate (apex=OS, `os.` retired fire-82/83). Preserve `*.sites.projectsites.dev` / `*.preview.projectsites.dev` (real runtime identities). Never break prod URLs without redirects.
- **30 concurrent agents = MAX ACTIVE CAPACITY**, not total tasks (continuous slot refill; never run useless work to saturate a meter). One repo → many isolated worktrees (never 30 writers in one checkout). Integration tree (domain integrators → final integrator → review → main), never 30 branches into main.
- **Competition/review for important work** — independent proposals from distinct minds → tests/evidence → judge. Never secretly route "independent" reviewers through the same run.
- **Workspaces = a CAPABILITY GRAPH** (`filesystem://` `git://` `shell://` `browser://` `database://` `r2://` `mcp://` `workflow://` `queue://`), more important than the physical machine.
- **MCP = first-class capability fabric** + **Code Mode** for large tool catalogs (search→inspect-schema→bounded program→compact result; scoped caps, authz, net/time/op/spend/output limits, abort; never unrestricted eval). **MCP Apps** for interactive tools (CSP + sandbox + authed ops + text fallback; rendering ≠ authorization).
- **Continuous knowledge / Onyx** — synchronized authorized knowledge (source id/uri/hash/revision/ACL/freshness), invalidate derived state on change; NOT static uploads, never call indexing "retraining".
- **A2UI + AG-UI** — agent-generated adaptive UI mapped onto NATIVE Megabyte/Kumo components (controlled catalog: plans, evidence/citation cards, run timelines, diffs, approvals, cost/quota). No arbitrary model-generated executable HTML.
- **Evidence gate + TDD required** — intent→plan→impl→unit/integration→real-browser→screenshot→authoritative-backend-state→deploy proof→reversible receipt. 50 Golden Paths (below) are PRODUCT CONTRACTS.

## Role boundaries (don't collapse into "session")

- **Foreman** (Cloudflare Agents/Think) = the BRAIN: interpret goal · gather context · plan · decompose · prioritize · choose specialists · evaluate · decide what remains. Planning MAY run inside an Inngest step, but Inngest ≠ brain.
- **Inngest** = durable cross-system orchestration (retries/waits/lifecycle/long-running state/external events/concurrency/cancellation).
- **Durable Objects** = live scoped identity/state (agent identity, run state, WebSocket coord, leases/locks, presence, controller ownership). **Workflows** = CF-native durable processes. **Queues** = high-volume fan-out.

## Pillar map → backlog workstreams (Phases 0-13 → WS-M1…M13)

- **WS-M0 Reconciliation** (Phase 0) — inspect everything; resolve conflicting docs; record superseding decisions; preserve the active loop. ← THIS intake begins it.
- **WS-M1 Shared contracts** (Phase 1) — Zod schemas + typed contracts for WorkspaceRuntime · CodingEngine · Worker · WorkerPool · Loop · Run · Task · Capability · Connection · Evidence. **← first vertical slice (§152).**
- **WS-M2 Connections** (Phase 2) — AI accounts · provider health · quotas · MCP registry · Git connections (the unified Connections UX).
- **WS-M3 Superset adapter** (Phase 3) — hosts/profiles/sessions/workspaces/terminals/diffs/quota behind `SupersetRuntimeAdapter`.
- **WS-M4 Cloudflare Computer** (Phase 4) — workspace/fs/git/exec + backend selection (isolate vs shell vs container) + isolation + fallback.
- **WS-M5 Inngest scheduler** (Phase 5) — durable task graph · 30-slot pool · retries · refill · loops · approvals · external events.
- **WS-M6 Multi-provider run** (Phase 6) — one goal fans out across ≥2 agent/runtime types.
- **WS-M7 Browser Run** (Phase 7) — universal browser verification for UI work.
- **WS-M8 MCP / Code Mode** (Phase 8) — progressive capability discovery + approval.
- **WS-M9 Data Studio** (Phase 9) — D1/KV/R2/DO/Postgres adapters (native, no iframed NocoDB/etc.).
- **WS-M10 Crawl / knowledge** (Phase 10) — native `/crawl` + DataForSEO + Onyx synchronized knowledge.
- **WS-M11 Adaptive interface** (Phase 11) — A2UI/AG-UI + selective PartyServer/Yjs collaboration.
- **WS-M12 ProjectSites lifecycle** (Phase 12) — GitHub SSO · per-site repo · Preview/Promote · Data · generated-site quality.
- **WS-M13 Autonomous convergence** (Phase 13) — hand to the mature `/run-the-loop` (global → per-project durable loops).

## The 50 Golden Paths (GP-001…050) — product contracts, machine-readable registry to build

Onboarding/workspace: GP-001 first-time onboarding · GP-002 workspace bootstrap. AI pool: GP-003 three Claude identities ·
GP-004 Codex+DeepSeek+MiniMax · GP-005 one-prompt-multi-agent · GP-006 30-worker fan-out · GP-007 continuous slot refill ·
GP-008 quota-aware routing · GP-009 provider failure · GP-010 worker crash recovery · GP-011 client disconnect. Loops:
GP-012 global/project loop · GP-013 pause/resume/cancel · GP-014 worktree isolation · GP-015 conflicted integration.
ProjectSites: GP-016 site creation · GP-017 full editing journey · GP-018 database journey · GP-019 bucket · GP-020 KV ·
GP-021 DO inspection · GP-022 preview→promote · GP-023 production favicon change · GP-024 slug rename · GP-025 GitHub
ownership transfer. Capability: GP-026 MCP tool approval · GP-027 Code Mode composed op · GP-028 MCP App · GP-029 whole-site
crawl · GP-030 DataForSEO+crawl · GP-031 continuous knowledge update · GP-032 access revocation · GP-033 A2UI approval ·
GP-034 Browser-Run visual repair · GP-035 responsive deep journey · GP-036 keyboard/odd interactions · GP-037 loading/failure
states · GP-038 computer backend routing · GP-039 computer fallback · GP-040 browser human takeover. Safety: GP-041 secrets
attack · GP-042 cross-tenant isolation · GP-043 duplicate-event idempotency · GP-044 reboot/process recovery · GP-045 race
three implementations · GP-046 command palette · GP-047 data natural-language · GP-048 deployment rollback · GP-049 full
autonomous project run · GP-050 global portfolio run. → build `GoldenPath` typed registry (WS-M1 Evidence contract) + drain.

## Discipline

- The intake is done when its SPIRIT is decomposed into the ledger — NOT when 155 sections are executed. Drain one verified
  slice per fire. First slices: WS-M1 shared contracts (Zod), then WS-M2 Connections. Reconcile against reality every fire;
  never re-propose what's already shipped (North Star=NORTH-STAR.md, DeepSeek=WS-12, canonical-domain already satisfied).

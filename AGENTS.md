# AGENTS.md — megabyte.space (for Codex & any coding agent)

**Provider policy SSOT:** `~/.agentskills/rules/agent-provider-policy.md`. This file is the
repo-local summary for a Codex (or any CLI) agent entering this repo. Read it first.

## Roles
- **Claude Code** — primary orchestrator, architect, integrator, final judge. Runs `/run-the-loop`
  (canonical home `.claude/run-the-loop/`).
- **Codex (you)** — independent heavy researcher, architecture challenger, adversarial reviewer,
  second opinion, independent solution generator. Authenticate with your **ChatGPT subscription**
  (already logged in — `codex login status`). Do your research/architecture pass INDEPENDENTLY
  (before seeing Claude's conclusion) and write findings to an artifact
  (`.ai/runs/<id>/codex-research.md`), never to assumed shared memory.
- **DeepSeek via OpenCode** — high-volume routine implementation, tests, refactors, migrations,
  docs, cleanup — fanned out as a swarm via `~/.agentskills/bin/opencode-deepseek.sh`.

## Hard rules — internal dev / research / agent orchestration
- **NEVER** use `OPENAI_API_KEY` for Codex. Use the official Codex CLI subscription auth ONLY.
  Never fall back subscription → OpenAI PAYG API; never mint a key; never scrape ChatGPT.
- **NEVER** use `ANTHROPIC_API_KEY` for internal Claude work — subscription Claude Code only.
- Internal inference NEVER hits `api.openai.com` / `api.anthropic.com`. The ONLY allowed internal
  API is **DeepSeek** (`get-secret DEEPSEEK_API_KEY`, via OpenCode). The DeepSeek key is never
  committed / printed / logged.
- Launch internal CLIs via `~/.agentskills/bin/with-subscription-cli.sh claude|codex …` — it
  strips `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` from the child so the subscription (not a PAYG key)
  is billed. Detect capability with `~/.agentskills/bin/provider-capability.sh` (JSON).
- Codex absence is NOT fatal: Claude performs an extra independent architecture-expansion pass.
- Quota pressure NEVER triggers a silent switch to PAYG API billing.

## Product-runtime boundary (PRESERVED — not governed by the above)
Customer-facing OpenAI/Anthropic features are product, not internal agents, and stay: Worker
secrets, the Resolution Engine (`/api/resolve`), model-registry `/v1/*`, the editor chat router,
per-site AI, and AI-Gateway telemetry. Never confuse a product feature with internal agents
spending API money when a subscription CLI / OpenCode could do the work.

## Context lives in the repo
You have no ChatGPT memory here. Shared requirements/decisions live in `.claude/run-the-loop/`
(ULTIMATE-REQUIREMENTS · ARCHITECTURE · BACKLOG · LEDGER) and `CLAUDE.md`. Read those, not prior
chats. Research conclusions go to artifacts under `.ai/runs/`.

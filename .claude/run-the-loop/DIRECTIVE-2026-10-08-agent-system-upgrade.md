# DIRECTIVE — Autonomous Product Engineering System upgrade (Brian, 2026-10-08)

Full 32-section directive lives in the session transcript; THIS file is the durable DECISION RECORD +
reconciliation the loop drains. Per `[[MASTER-DIRECTIVE]]`'s own rule — **a directive this big is LEDGER
INTAKE: decompose + advance ONE verified slice per fire, never execute wholesale** (`split-work-into-ledger`).
Scope = the AGENT-SKILL SYSTEM (`~/.agentskills` + `.claude/run-the-loop/`), NOT the product apps. The
directive explicitly forbids modifying DeskLink/GitLink or unrelated prod apps as part of this upgrade.

## Authority / preservation
Preserve explicit user requirements; reconcile new findings vs reality; never silently override an explicit
prohibition. Where the directive conflicts with an established estate rail, FLAG (don't silently switch) — see
§24 Infisical below.

## Reconciliation — most of this is ALREADY BUILT (Wave 1, verified 2026-10-08)

| Directive § | Status | Where it lives |
|---|---|---|
| §1 philosophy (comprehensive+reactive+finish) | ✅ DONE | predictive-completeness · "what else" loop · committed-completion |
| §2 automatic-improvement-default | ✅ DONE | `auto-integrate-recs` + `proactive-improvements` + `extra-mile` rules |
| §3 surpass-competitors / reinvention / discovery+completion | ✅ DONE | `competitor-research` (≥15% beat gate) + loop two-workstream model |
| §4 inspect/preserve environment | ✅ DONE (this turn) | Wave 1 discovery |
| §5 single `/run-the-loop` entry | ✅ DONE | `.claude/commands/run-the-loop.md` (47K) + canonical home |
| §6 capture/reconcile every user instruction | ✅ SHIPPED (fire 2026-10-08) | `prompt-as-training-signal` + deterministic non-blocking `hooks/capture-prompt.py` → `.agent/prompt-inbox.ndjson` (+ `rules/prompt-ingestion.md`); verified zero-latency single-line append |
| §7 product knowledge ledger | ✅ DONE | BACKLOG/LEDGER/MASTER-DIRECTIVE + OpenSpec |
| §8 portfolio (DeskLink deskl.ink, GitLink gitl.ink) | ✅ SHIPPED (fire 2026-10-08) | `reference/portfolio.md` catalogs DeskLink/GitLink as distinct product identities + directive capability lists; estate-doc-backed claims cited |
| §9 multi-model arch (claude/codex/opencode, 3 Claude seats, ClawRouter) | ✅ DONE | `agent-provider-policy` + `claude-pool.sh` (3 seats + failover) + `research-orchestrator.sh` + OpenClaw design |
| §10 recursive research-expansion engine | ✅ DONE | `research-expansion-orchestration` rule + `bin/research-orchestrator.sh` |
| §11 recursive 30-idea improvement audit (top 30%) | ✅ SHIPPED (fire 2026-10-08) | formal per-dimension 30-idea→top-30% audit codified in `rules/improvement-audit.md` (atop `supreme-polish` + "what else") |
| §12 `Auto Research Prompt.md` | ✅ SHIPPED (fire 2026-10-08) | `bin/auto-research-prompt.sh` emits the per-project audit file (Submitted prompt + 3-bullet structure verified) |
| §13 gum/glow reporting | ✅ DONE | `terminal-styling` + `emdash_*` + gum 0.17.0 + glow 2.1.2 |
| §14 OpenSpec canonical | ✅ DONE | `openspec/` init'd + `context-compression`... no → OpenSpec doctrine in website-build-doctrine; slash cmds wired claude/codex/opencode |
| §15 UI-first dev | ✅ DONE | `website-build-doctrine` UI-first + WS-DEMO |
| §16 shared design system / shadcn reuse | ✅ DONE | `frontend-stack` + design-system + Kumo |
| §17 visual QA / Codex screenshot review | ✅ DONE | `e2e-visual-inspection` + `visual-qa` + Browser Run |
| §18 golden-path dev | ✅ DONE | `e2e-tdd-organization` + loop journeys |
| §19 persistent task orchestration / anti-thrash | ✅ DONE | BACKLOG + fire-lease + anti-thrash memories |
| §20 dynamic parallel-agent scheduling (specialist roster) | ✅ DONE | loop's 15 rotating + 2 standing roster + `monitor-orchestration` |
| §21 scope-expansion-without-losing-completion | ✅ DONE | loop two-workstream model |
| §22 SEO/content research (DataForSEO) | ✅ SHIPPED (fire 2026-10-08) | DataForSEO keyword-research workflow codified in `rules/seo-keyword-research.md` (behind `seo-auditor` + `competitor-research`) |
| §23 Cloudflare-first infra | ✅ DONE | `cloudflare-lock-in`; estate is CF-native |
| §24 integrate Sentry/PostHog/Langfuse/Promptfoo/Infisical | ✅ SHIPPED (fire 2026-10-08) | Sentry ✅ · PostHog ✅ · Langfuse (skill) · Promptfoo (`/run-evals`); **Infisical COMPLEMENTS get-secret** (Brian clarified 2026-10-08 — NOT a conflict): machine-scoped backend for boxes WITHOUT the chezmoi/CF rail (Proxmox `codexrye`, GH runners, DeskLink desktops) via `bin/get-secret-infisical.sh` + `rules/secrets-portable-resolution.md` |
| §25 complete-every-integration | ✅ DONE | integration-completeness doctrine |
| §26 continuous doc/code improvement | ✅ DONE | `code-simplifier`/`dead-code-remover` + `docs-compression` |
| §27 improve agent skills themselves | ✅ DONE | `agentskills-retrospective` + self-improvement doctrine |
| §28 validate prompt-expansion w/ Promptfoo benchmarks | ✅ SHIPPED (fire 2026-10-08) | 7-case Promptfoo suite at `evals/prompt-expansion/` (promptfooconfig + expansion-prompt + 7 `cases/*.yaml`) scoring intent/competitor-research/features/screens/golden-paths/OpenSpec/no-redundant-questions |
| §29 product-completeness metrics dashboard | ✅ SHIPPED (fire 2026-10-08) | machine-readable report via `bin/product-completeness.mjs` (23K, `--compact`/`--ci`) + `rules/product-completeness.md` (four-signal verdict, honest `0`/`unknown`) atop `quality-metrics` |

## Prioritized MISSING/PARTIAL slices → new workstream (loop drains one/fire; dedupe vs BACKLOG)

**SHIPPED in the 2026-10-08 agent-system-upgrade fan-out (7 slices, all verified; changes on disk in `~/.agentskills`, uncommitted per the known-lint-debt convention):**

1. ✅ **§12 Auto Research Prompt.md** — `bin/auto-research-prompt.sh` emits the per-project audit (Input ·
   Research Started · per-provider Full Response · Comparison · Original-vs-Expanded · Synthesized Prompt ·
   Execution Results · Final Synopsis). **evidence:** running the cmd writes the audit file; `Submitted prompt`
   + 3-bullet structure verified (first FAIL was a `ugrep` leading-dash artifact, cleared with `grep -F --`).
2. ✅ **§6 prompt-ingestion hook** — `hooks/capture-prompt.py` (deterministic, non-blocking) appends each raw
   prompt to `.agent/prompt-inbox.ndjson` + `rules/prompt-ingestion.md`. **evidence:** one prompt → one NDJSON
   line, zero latency; the inbox is the next `/run-the-loop`'s drain target (not a loop launcher).
3. ✅ **§28 Promptfoo prompt-expansion benchmark suite** — `evals/prompt-expansion/` (promptfooconfig +
   expansion-prompt + 7 `cases/*.yaml`) scoring intent/competitor-research/feature-inventory/screens/golden-
   paths/OpenSpec/no-redundant-questions. **evidence:** all 7 directive requests present as discrete cases.
4. ✅ **§22 DataForSEO keyword-research workflow** — `rules/seo-keyword-research.md` codifies the 17-step SEO
   process behind `seo-auditor` + `competitor-research`. **evidence:** rule present + frontmatter-complete.
5. ✅ **§11/§27 formal 30-candidate improvement audit** — `rules/improvement-audit.md` codifies the per-dimension
   30-idea→top-30% audit. **evidence:** rule present, acceptance met with no issues.
6. ✅ **§8 portfolio catalog** — `reference/portfolio.md` catalogs DeskLink (deskl.ink) + GitLink (gitl.ink) as
   distinct product identities + the directive capability lists. **evidence:** both products present + distinct;
   estate-doc-backed claims cited (directive-list claims attributed to the builder brief, flagged non-blocking).
7. ✅ **§29 completeness-metrics machine-readable report** — `bin/product-completeness.mjs` (23K, `--compact`/
   `--ci`) emits a JSON report (required-vs-implemented features/screens, golden paths, integrations, gaps) +
   `rules/product-completeness.md` (four-signal verdict, honest `0`/`unknown`). **evidence:** rule + tool on disk.

**§24 Infisical — RECONCILED + SHIPPED (Brian clarified 2026-10-08, after the fan-out launched):**

8. ✅ **§24 Infisical** — NOT a conflict. Infisical is the secret rail for machines WITHOUT the chezmoi
   `get-secret` / CF Secrets Store (Proxmox `codexrye`, GitHub runners, DeskLink-provisioned desktops) —
   complementary + machine-scoped, under the ONE universal `get-secret KEY` interface. SHIPPED:
   `bin/get-secret-infisical.sh` (env → Infisical; machine-identity `INFISICAL_TOKEN`/OIDC; env-scoped; value
   to stdout only, never logged) — install AS `get-secret` on those machines; doctrine
   `rules/secrets-portable-resolution.md`. Env fast-path + clean degradation verified; the Infisical branch is
   for the other machines (not exercisable from this Mac). No open decisions remain in this directive.

Cross-links: `[[MASTER-DIRECTIVE]]` · `[[NORTH-STAR]]` · BACKLOG (fold the shipped slices + the open §24 decision
into a `### WS-AGENTSYS` block next fire) · `agent-provider-policy` · `research-expansion-orchestration`.

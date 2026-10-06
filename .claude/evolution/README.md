# Evolution Kernel — megabyte.space

The protected machinery that decides whether a change to agents, skills, prompts,
context, or routing is an **improvement** — by evidence, not belief.

> **Supreme rule.** Never permanently learn because an agent believed something.
> Learn because evidence *repeatedly* demonstrates that behaving that way produces
> better outcomes.

## What this EXTENDS (never duplicates)

The estate is already a mature agent system. The kernel adds the one thing it
lacked — *evaluate-before-promote* — and wires into what exists:

- `run-the-loop/LEDGER.md` + `~/.claude/projects/**/memory/` = the **Experience**
  source (raw fires, failures, lessons). The kernel *reads* them; never copies them.
- `agentskills-retrospective` + `~/.agentskills/routing-matrix.md` = the capture/route
  path. The kernel adds the counterfactual gate they lack before a lesson becomes doctrine.
- The 28 skills + 28 agents = the **Champions**. The kernel adds lifecycle + rollback.
- `07-quality-and-verification/llm-evals.md` = the grader families. The kernel adds
  skill-level + counterfactual + holdout evaluation.
- `modifier-matrix.json` + `scripts/verify-*.mjs` = runtime/visual evidence feeds.

## The loop (supersedes prompt → reason → act → reflect → rewrite)

```
PERCEIVE → UNDERSTAND → MODEL → REMEMBER → DEFINE SUCCESS → HYPOTHESIS → PREDICT
→ ACT → OBSERVE REALITY → MEASURE → ATTRIBUTE CAUSE → COMPARE → REPLICATE
→ GENERALIZE → CHALLENGE → CANARY → LEARN
```

## Layout

- `kernel/` — **PROTECTED.** The policies that judge improvement. Changing these needs
  stronger review (policies.md § Protection) — an agent must not casually edit the
  mechanism that decides what counts as better.
- `experience/` — pointers to raw evidence (LEDGER, memory, traces). Append-only, no
  authority alone.
- `knowledge/` — generalized claims carrying the evidence schema (confidence / freshness
  / provenance / contradicting-evidence).
- `candidates/` — challenger variants under evaluation.
- `champions/registry.yaml` — the live skills + lifecycle state + rollback ref.
- `evals/cases/` — eval cases (many mined from failures). `evals/results/` — run outputs + decisions.
- `bin/skill-eval.mjs` — the champion/challenger + counterfactual harness.

## How a change gets promoted

1. Experience accrues (fires, failures, successes) → referenced in `experience/`.
2. A failure or recurring pattern becomes an eval case → `evals/cases/` (failure→eval).
3. A hypothesis becomes a challenger variant → `candidates/`.
4. `bin/skill-eval.mjs` runs **champion vs challenger vs minimal vs no-skill** on the
   suite + hidden holdouts.
5. `kernel/promotion-policy` decides: promote only an evidence-backed winner; prefer the
   *minimal* variant when it ties (skills concentrate, not bloat); keep genealogy + rollback.
6. Canary → champion. The decision + evidence bundle land in `evals/results/`.

**Most run-the-loop fires only PRODUCE evidence.** Dedicated evolution fires test
challengers. A fire does not mutate a champion skill without a winning counterfactual.

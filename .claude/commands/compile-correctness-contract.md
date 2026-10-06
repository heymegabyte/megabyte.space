---
description: Compile a user request into an explicit, VERIFIABLE per-task Correctness Contract BEFORE any implementation. Turns prose intent into a stored YAML contract — goal, requirements, invariants, forbidden outcomes, journeys, every state/behavior/requirement class, the tests + runtime + visual evidence each is proven by, plus explicit unknowns + assumptions + objectively-checkable success/stop conditions. The contract is stored next to the work under `.claude/evolution/contracts/<slug>.contract.yaml` and is the artifact the Evolution Kernel's proof-carrying execution references: the builder may NOT silently redefine success mid-flight; requirements evolve ONLY with recorded new evidence. Run it the moment a task is non-trivial — before writing code, before spawning builders.
argument-hint: "[task slug or one-line description of the work]"
---

# Compile Correctness Contract — megabyte.space

Turn `$ARGUMENTS` (a user request / backlog slice / bug) into an explicit, machine-checkable
**Correctness Contract** BEFORE implementation starts. This is the estate's answer to the gap that
global Hard Gates + prose BACKLOG acceptance leave: those say what "good" looks like in general;
a contract says what THIS task must satisfy and — for every clause — names the verifier, test, or
journey that OBJECTIVELY proves it. No contract, no build on anything non-trivial.

**Why it exists.** The Evolution Kernel's supreme rule is *never learn because an agent believed
something — learn because evidence demonstrates it* (`.claude/evolution/README.md` +
`kernel/policies.md § Evidence`). A contract is the task-scoped instance of that rule: it fixes the
definition of success in writing BEFORE the builder can rationalize whatever it shipped as "done".
It is the reference point for the kernel's **proof-carrying execution** — a slice is complete only
when every `success_condition` is backed by fresh evidence from the named proof, at the evidence
tier the kernel ranks (deterministic test/compiler → runtime observation → visual-model verdict →
LLM judge → agent assertion → unattributed claim).

## 0 — When to run (and when not)
- **Run it** for any non-trivial slice: a new surface/feature, an invariant to protect (auth, data,
  security), a bug fix with a regression class, a flip that inverts assertions, anything a future
  fire could silently regress.
- **Skip it** for a pure one-line doc/typo/format edit with no behavior change. Borderline → compile;
  the contract is cheap and becomes the regression net.
- The contract is authored **before** code or builder spawns — it is the plan of record, not a
  post-hoc writeup. A contract written after the fact is a rationalization, not a contract.

## 1 — Gather the real details (ground every clause; invent nothing)
- Read the authoritative sources for THIS task — the owning `CLAUDE.md` section, the `BACKLOG.md`
  frontier line, the relevant code, and **`ls scripts/`** to find the REAL verifier(s)/tests/journeys
  that already exist (or must exist). Reference them by EXACT filename.
- Every requirement/invariant/condition must trace to a source. If it does not — if you are tempted
  to add a clause the sources do not support — it is an **unknown** or an **assumption**, not a
  requirement. Put it there explicitly. Never pad the contract with plausible-sounding clauses.
- Prefer the lowest evidence tier that settles each clause: a deterministic test/verifier over a
  runtime check over a visual verdict over an LLM judge. Do not reach for a judge where an
  executable truth exists (`kernel/policies.md § Evidence`).

## 2 — The contract shape (YAML — use every applicable key)
Write `.claude/evolution/contracts/<slug>.contract.yaml`. `<slug>` is the task's kebab name (the
surface, invariant, or feature). Keys (omit a class only when it is genuinely N/A for this task;
prefer an explicit empty list with a one-line note over silent omission):

- `goal` — one sentence: the outcome this task commits to, in the user's terms.
- `requirements` — the explicit, enumerated things that must be true. Each a checkable statement.
- `invariants` — properties that must hold at ALL times / across ALL paths (never just the happy one).
- `forbidden_outcomes` — states that must NEVER occur (the inverse of invariants; failure is shipping one).
- `user_journeys` — the real paths a user takes (homepage-start, click-navigation), named.
- `ui_states` — every state each surface can be in (empty / loading / error / populated / anonymous / authed / …).
- `functional_behaviors` — what the feature DOES on each action (clicks, forms, nav, shortcuts, API calls).
- `data_behaviors` — persistence / durability / display-vs-store reconciliation / idempotency / bounds.
- `security_requirements` — auth gates, CSP/headers, secret hygiene, SSRF, input bounds, least privilege.
- `performance_requirements` — CWV budgets, Worker CPU, bundle budgets, latency — with numbers.
- `visual_requirements` — brand lock (black `#060610` + cyan `#00E5FF`), motion, no-slop, reduced-motion fallback.
- `accessibility_requirements` — axe 0 @ 6bp, WCAG 2.2 AA criteria, keyboard, focus, contrast.
- `compatibility_requirements` — viewports, browsers, backward-compat, topology constraints it must not break.
- `tests_required` — the unit/integration/E2E specs that must exist + pass (name the file; `(to author)` if new).
- `runtime_evidence_required` — the live-prod verifier(s)/journeys that must be GREEN (exact `scripts/verify-*.mjs`).
- `visual_evidence_required` — the screenshots + vision verdicts required (surface, breakpoints, min score).
- `unknowns` — everything NOT yet grounded in a source. Each must be resolved (→ new evidence) before "done".
- `assumptions` — things taken as true without proof this task; each names what would invalidate it.
- `success_conditions` — the objective bar. **Every entry names the verifier/test/journey that PROVES it**
  (`proof:`) — a success condition with no named proof is invalid and must be rewritten or demoted to `unknowns`.
- `stop_conditions` — when to HALT and escalate rather than push on (irreversible/destructive/ambiguous/blocked).

Also include lightweight provenance at the top: `task`, `authored` (ISO), `status`
(`draft → active → satisfied → superseded`), and `sources` (the files you grounded it in).

## 3 — The rules the contract enforces (state these; they bind the builder)
1. **No silent redefinition of success.** Once `status: active`, the builder may NOT quietly change
   what "done" means to match what it happened to ship. The contract is the fixed referee.
2. **Requirements evolve ONLY with recorded new evidence.** A clause may change — but only via an
   explicit edit that records WHY (new evidence, a corrected source, a discovered constraint) in a
   `changelog:` entry on the contract. Evidence, not preference, moves the bar (mirrors
   `kernel/policies.md` — the referee stays fixed while players evolve).
3. **Every `success_condition` is objectively checkable** by a named verifier/test/journey at a
   stated evidence tier. "Looks correct" / "done" is not evidence (`kernel/policies.md § Evidence`).
4. **`unknowns` + `assumptions` are explicit, never hidden.** A task may start with unknowns; it may
   not FINISH with unresolved ones silently — each resolves to a requirement (with evidence) or is
   recorded as a deliberate deferral.
5. **The judge is independent of the builder.** The agent that implements does not get to declare its
   own `success_conditions` met without the named proof running fresh and green (`policies.md § Evaluation`).
6. **Store it next to the work + reference it.** The contract lives at
   `.claude/evolution/contracts/<slug>.contract.yaml`; proof-carrying execution (and any
   adversarial-review phase) reads it to confirm the shipped slice satisfies every clause with fresh
   proof before the work is marked complete.

## 4 — Output
- Write the YAML file (primary deliverable, FIRST).
- Report: the file path · the `goal` · the 2-3 strongest `invariants` · for each `success_condition`
  which verifier/test/journey proves it · and anything you could NOT ground in the sources (left in
  `unknowns`). Keep it tight — the contract is the artifact; the report just points at it.

## Discipline
- Ground every clause in a real source; mark the rest as `unknowns`/`assumptions`. Padding a contract
  with unsupported requirements is the same failure as a prose acceptance list nobody can check.
- Prefer the lowest sufficient evidence tier per clause; name real `scripts/verify-*.mjs` / specs, not
  aspirational ones (mark new ones `(to author)`).
- One contract per coherent task/invariant. A flip that inverts assertions updates the contract +
  re-points its `runtime_evidence_required` the SAME fire (the estate's topology-flip discipline).

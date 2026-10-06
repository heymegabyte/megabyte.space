# Evidence Schema — the four layers

Keep these distinct. Blurring them is how belief masquerades as proof.

```
EXPERIENCE   raw evidence (traces, failures, successes, corrections, incidents)
KNOWLEDGE    generalized claims SUPPORTED BY repeated experience
SKILL        reusable procedures that have DEMONSTRATED value
POLICY       the rules that govern evaluation/promotion/rollback (kernel/, protected)
```

- Experience → Knowledge requires *repeated* corroborating evidence, not one belief.
- Knowledge → Skill requires a counterfactual win (promotion-policy §3).
- Nothing edits Policy as a side effect (policies.md § Protection).

## Knowledge claim (`knowledge/*.yaml`)

```yaml
claim: "vite/esbuild tree-shakes unused imports but the deploy's tsc fails TS6133"
scope: "any workshop-frontend / TS build in this estate"
evidence:                       # tiered; at least one ≥ runtime
  - { tier: deterministic, ref: "fire-154 + fire-179 red tsc output", note: "reproduced twice" }
source: experience              # experience | research | user-directive
confidence: 0.95                # 0-1, justified by tier + corroboration count
created: 2026-10-06
last_verified: 2026-10-06
freshness: valid                # valid | stale | expired (decays if unverified past its ttl)
ttl_days: 180
contradicting_evidence: []      # populated by contradiction-resolver
invalidated_by:                 # what would force re-verification
  - "vite/tsc major upgrade"
```

## Skill manifest EXTENSION (overlay on the EXISTING frontmatter — do not rewrite skills)

The 28 skills already carry `name/version/stage/triggers/paths/pack/model`. The kernel
layers these machine-readable fields (stored in `champions/registry.yaml`, not in the
SKILL.md, so skills stay portable):

```yaml
skill: <name>
lifecycle: champion             # experimental|candidate|canary|champion|watch|suspect|quarantined|deprecated|retired
confidence: 0.0-1.0
eval_suite: [case-ids...]       # evals/cases this skill is graded against (empty = unevaluated/legacy)
risk: low|medium|high
fallback: <skill-name|none>
supported_models: [...]
rollback_version: <git-sha|tag>
provenance: <origin + author>
last_evaluated: <date|never>
```

## Proof-carrying execution (`evals/results/<run>.proof.yaml`)

```yaml
skill: ; version: ; objective:
assumptions: ; inputs: ; actions:
artifacts: ; tests: ; runtime_evidence: ; visual_evidence:
unverified_claims: []           # anything asserted but not proven THIS run
side_effects: ; models: ; tools: ; cost: ; latency: ; confidence:
```

## Prediction ledger (`evals/results/predictions.ndjson`, append-only)

```jsonc
{ "when":"<date>", "predicted_by":"<agent/skill>", "prediction":"<expected effect>",
  "before":"<metric>", "expected":"<metric>", "actual":"<metric|pending>", "delta":"<signed>" }
```

Predict BEFORE acting; compare AFTER. A repeated miss is a calibration failure worth a case.

## Eval CASE (`evals/cases/*.json`) — the shared contract for the harness + failure→eval

```jsonc
{
  "id": "case://<area>/<slug>",
  "origin": "failure|success|synthetic",     // failure→eval sets "failure"
  "source_ref": "fire-179 | memory/vite-...",// provenance back to experience
  "tier": "development|regression|adversarial|hidden-holdout",
  "task": "<self-contained instruction given to the variant>",
  "context": "<optional repo/file context provided>",
  "grader": {
    "kind": "deterministic|rubric|pairwise",
    "spec": "<regex / assertion / rubric dimensions>",
    "pass_threshold": 0.7
  },
  "must_not": ["<forbidden outcome>"],        // auto-fail if present
  "tags": ["..."]
}
```

## Eval RESULT / decision (`evals/results/<run>.json`)

```jsonc
{
  "run": "<id>", "when": "<date>", "skill": "<name>",
  "variants": ["champion","challenger","minimal","no-skill"],
  "per_case": [{ "case": "case://...", "scores": { "champion": 0.9, "minimal": 0.9, "no-skill": 0.4 } }],
  "win_rates": { "champion": 0.0, "challenger": 0.0, "minimal": 0.0, "no-skill": 0.0 },
  "decision": "promote-challenger|keep-champion|adopt-minimal|retire-skill",
  "rationale": "<why, referencing scores + policy §3>",
  "judge": "<independent model>", "cost": "<$>", "holdout_used": true
}
```

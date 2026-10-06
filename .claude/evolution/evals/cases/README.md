# Eval cases — the failure → eval converter

Every real failure becomes a permanent eval case so the same mistake can never
silently return. Sources: a user correction, an escaped bug, a failed deploy, a
repeated retry, an incident. Procedure:

1. **Extract the decision point.** Find the exact moment an agent chose wrong
   (claimed done, skipped a gate, trusted unverified green). That moment — not the
   fix — is the case.
2. **Write a self-contained task.** Recreate that decision point so a general agent
   can answer it WITHOUT seeing the memory/failure file. Give only the context the
   agent would really have.
3. **Encode correct behavior as a rubric** (`grader.kind:"rubric"`, `spec` = the
   2-4 concrete things a correct answer must contain, `pass_threshold` 0.7).
4. **Encode the wrong behavior as `must_not`** — the specific failure outcome;
   its presence auto-fails the case.
5. **Tier it.** Default `tier:"regression"`. Use `tier:"adversarial"` for
   security/abuse cases. Set `origin:"failure"` and `source_ref` back to the
   memory file + any `fire-N` it cites. Match `kernel/evidence-schema.md` § Eval CASE.
6. **It joins the next run.** The case is added to the champion/challenger/minimal/
   no-skill run (promotion-policy §3); a recurring class may also seed an adversarial case.

**Holdout:** cases default to `tier:"regression"`. The operator promotes a SUBSET to
`tier:"hidden-holdout"` (holdout-policy §5). Hidden-holdout cases decide promotion and
MUST NOT be shown to a skill-mutating agent — showing them causes overfitting.

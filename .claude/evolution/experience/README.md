# Experience — raw evidence (pointers, not copies)

Experience is append-only raw evidence with no authority by itself. The kernel READS these
existing sources; it never duplicates them (Minimal-Complexity + no-drift).

## Sources

- **Fire log** — `../../run-the-loop/LEDGER.md` (fire-2 … fire-180+): roster, per-role slice,
  SHA, prod proof. The richest success/failure trajectory store the estate has.
- **Memory facts** — `~/.claude/projects/-Users-Apple-emdash-repositories-megabyte-space/memory/`
  (34 fact files + `MEMORY.md` index): durable lessons + recurring failures.
- **Verifier output** — `scripts/verify-*.mjs`, `green-sweep.mjs` (runtime evidence, printed).
- **Visual state** — `../../modifier-matrix.json` (per-surface vision scores) + Deep UI
  Explorer captures (gitignored run artifacts).
- **Observability** — Sentry (`megabyte-labs` org, server-side `@sentry/cloudflare`),
  PostHog, Workers Tracing.

## Promotion out of Experience

- Repeated corroborating evidence → a `knowledge/*.yaml` claim (not one belief).
- A failure class → an `evals/cases/*.json` case (failure→eval).
- A procedure that wins its counterfactual → a `champions/registry.yaml` lifecycle bump.

Raw experience is never converted directly into permanent instruction — that path runs
through Knowledge + a counterfactual (kernel/policies.md).

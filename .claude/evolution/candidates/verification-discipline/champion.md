# Verification discipline — CHAMPION (the estate's verify-before-done doctrine)

- Local typecheck + build passing is NEVER sufficient. No completion claim without FRESH
  command-output evidence this turn.
- Before claiming any change done:
  - Run the real gate, not a proxy: `tsc --noEmit` (the deploy's gate) in ADDITION to the
    bundler build — vite/esbuild tree-shakes unused imports but tsc fails TS6133.
  - Deploy, then PROD-verify: fetch each changed route on prod; assert the new
    content / headers / status are actually live.
  - Reconcile display vs store: for any data surface, cross-check the UI against the
    authoritative store (D1/DO). groundTruth > 0 && display == 0 = lying-empty.
- On any persistence / state migration (e.g. localStorage → server): re-point the OLD
  cleanup path AND hard-assert the new restore in the SAME change — a verifier that
  restored via the old store becomes a dead no-op that silently dirties prod state.
- Bound any client-supplied id / key persisted in a per-user store: cap length + count.
  Per-user scoping is NOT a substitute for input validation.
- Root-cause, never symptom-patch: reproduce → failing regression first → fix at source →
  verify → scan adjacent code for the same class.
- Never `--force` / `--no-verify` to bypass a gate. A red build never ships.

# Independent subscription source review

Provider: official Codex subscription through `cr --provider codex`; read-only,
completed exit 0. No candidate tests executed.

Reviewed candidate `2726e932a3fbfcfffa04ee093a881604009f2034` using read-only Git source inspection. No prior conclusions read, tests executed, or runtime behavior observed. References below are candidate-relative.

1. **High — workspace auditing is scaffolding, not implemented production coverage.** `packages/workshop-shared/src/api.ts:1727` defines only setting records. `packages/workshop-backend/src/admin-audit.ts:75–77` inserts none of the workspace columns required by its schema (`:59–60`), so a workspace record passed through this append path would fail. Workspace tests bypass production code with SQL: `__tests__/admin-audit.test.ts:55–60` and `packages/integration-tests/__tests__/workshop-admin-audit.test.ts:265–273`.
   **Missing acceptance:** exercise actual admin metadata/content access; verify correctly attributed rows and refusal before exposure when audit append fails.

2. **High — audit rows attest attempts, not applied changes.** `packages/workshop-backend/src/admin-settings.ts:508–519` appends first, then restores authoritative config after KV failure while retaining the row. `__tests__/admin-settings-audit.test.ts:253–259` explicitly expects this. The public contract documents attempts (`packages/workshop-shared/src/api.ts:1700–1722`) but provides no outcome field.
   **Missing acceptance:** distinguish committed, failed and indeterminate operations through correlated outcome records; inject mirror/storage failures and reconcile audit output against authoritative and mirrored state.

3. **High — existing admin capabilities have no application-level revocation check.** Authorization occurs at minting (`packages/workshop-backend/src/server.ts:707–714`). `src/admin-settings.ts:1234–1264` explicitly checks once; subsequent setters and audit reads forward without reauthorization.
   **Missing acceptance:** retain a capability, remove its administrator authorization, and demonstrate subsequent reads/writes fail within a defined revocation window. Connection termination across deployment remains unobserved.

4. **Retention floor is enforced in source, with operational limits.** Setter validation (`src/admin-settings.ts:583–590`) and audit pruning (`src/admin-audit.ts:170–179`) independently enforce the environment floor. Reads use committed config (`src/admin-settings.ts:1470–1473`), with rollback-race test intent at `__tests__/admin-settings-audit.test.ts:442–458`. However, configured floors above 3,650 days are silently capped (`src/admin-access.ts:34–39`), and physical deletion is traffic-driven, at most 1,000 rows per call.
   **Missing acceptance:** real audit-DO tests with a raised floor, concurrent failed retention reduction, and over 1,000 expired rows; explicitly accept the cap and idle-log deletion behavior.

**Migration:** `packages/workshop-backend/wrangler.jsonc:80–84` and canonical `cloudflare.config.ts:82` agree on v4 introducing `AdminAuditDurableObject`; `src/server.ts:74` exports it. This establishes source wiring only. Missing acceptance is an existing-v3 → v4 upgrade proving prior state survives and the first audited mutation succeeds.

Adoption should not claim workspace-access coverage, applied-change attestation, or prompt admin revocation on this evidence.

## Integration judgment

The reviewer’s High labels describe adoption/evidence risks, not demonstrated
violations of the candidate’s public contract. Workspace record production is not
part of its typed API; attempt retention is explicitly documented. Preserve these
limits rather than inventing guarantees. Immediate held-capability revocation and
existing-v3 upgrade acceptance remain unobserved. No upstream patch or adoption
was performed.

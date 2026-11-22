# Upstream administrator write boundary — fire-385

On 2026-11-22 UTC, fetched official `cloudflare/cloudflare-os` main `27888f048a4278cce3a71c462924a5435dab614d`; `bda4de88` is an ancestor. Git reports 19 commits and 235 changed paths in the complete incremental range. This inventory is not a full security review. The wrapper gitlink remains `240899ec34e822a0afa695e3c7b48a41c2db9c4c`.

Targeted source review of upstream commit `659c244c` and its resulting `docs/admin-access.md`, `admin-access.ts`, `admin-settings.ts`, and admin-write tests found:

- `ADMIN_WORKSPACE_WRITES` is a separate environment switch, default off unless a string normalizes to `on`, independent of the inspection cap. The current wrapper contains no explicit setting for it; generated candidate configuration and deployment-specific environment have not been verified.
- When enabled, a currently authorized admin can stop an agent or restart a workspace, including via API/agent, with no second approval. The implementation checks admin status and the switch again at the workspace boundary. Workspace members receive no attribution; an admin audit record precedes the operation.
- The record is an attempt, not proof of completion: a failure, deletion during append, or interruption may leave a record without the intended effect, or with partial effects. The candidate documents operator failure logging; log content and runtime behavior were not verified here.
- Candidate fixtures cover audit-before-effect, failed audit, deletion during append and selected stop behavior. These fixtures were inspected, not run. They do not establish live concurrency, crash recovery, held-session behavior or member notification.

Before evaluating adoption, decide whether administrative writes are authorized and explicitly assert the generated Worker setting. Verify switch-off and admin revocation across already minted capabilities and in-flight calls, audit failure, deletion/restart races, actual effects and operator/member visibility in isolated workerd and real-client acceptance. Reconcile audit attempts against authoritative state; do not infer successful writes from an audit row. This review does not authorize enabling the switch, a pin change or deployment.

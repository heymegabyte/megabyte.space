# Fire-376: current-checkout wrapper verification

## Independent assessment

The assigned base is `9bb08984e8b22a5441aaab3f7e79e866079f5672`.
Fetched `origin/main` contains that commit. Actions records run 43384231361 as
failed and 43337797577 as successful. The failed worktree is clean, at the
assigned base, with no unpublished implementation to recover. Its root install
log ends successfully, despite an earlier incomplete report checkpoint; this
establishes no fork install or full wrapper outcome. Original receipts are preserved.

ADR 0002 remains the mission: migration/stabilization, with production changes
pending approval. No pin, route, resource identity, auth policy or production
configuration is changed in this iteration.

## Current evidence

Declared-remote submodule initialization succeeded. Fork preflight confirms an
independent checkout at `240899ec34e822a0afa695e3c7b48a41c2db9c4c`.
Both frozen installs ran serially through the cached Node pnpm 11.17.0 entry:
root exit 0 (52.1s), fork exit 0 (28.3s). A run-local pnpm shim delegates to this
same entry; both direct and child-shell version checks returned 11.17.0.
No global toolchain configuration changed.

Lock SHA-256 before wrapper execution:

- Root: `ded21717b5e5923ea0a570edef48a1dd7e0b087afaa8081ab3535403ef4a991f`
- Fork: `8ad8ac0b4e667eebbc78c96ac3eabc6b82c133ebb73341de68ddc9d4696b9a4b`

Focused loop/fork/bookkeeping fixtures passed 53/53. Root script fixtures passed
260/260; these do not establish browser, provider, migration or full-wrapper acceptance.
The root fixtures were started while the separate fork install was finishing;
they are not credited as a serial post-bootstrap full-wrapper gate. The subsequent
full wrapper starts after both installs and reruns the configured checks.

The invocation cgroup resolves from /proc/self/cgroup; memory.max is 2 GiB and
memory.high is 1.5 GiB. Its parent fleet slice has max 10 GiB and high 8 GiB.
Scope membership includes other process trees, so counters are shared evidence,
not exclusive attribution. Node default heap limit observed: 887095296 bytes.
No host/cgroup settings or Node heap override changed. Full wrapper is bounded
at 300s; its own exit and post-exit generated-config inventory are captured in
wrapper-terminal.json in the incoming log directory.

DeepSeek read-only review was attempted through the approved direct launcher;
it timed out at 30s without a completed assessment. No review verdict is inferred.
Parent review owns these conclusions. No Browser Harness was used.

## Acceptance boundaries

Current wrapper exit is 1 after 261.3 seconds, before the 300s timeout.
The Workshop frontend Vite build reports `FATAL ERROR: Ineffective mark-compacts
near heap limit Allocation failed - JavaScript heap out of memory`.
The post-exit generated-config inventory is empty. Both lock checksums are
unchanged and the fork working tree is clean. This is a failed current wrapper
check, not an interrupted process or completed migration rehearsal. No Worker
dry-run completion is credited. No retry was made under the same budget.
A subsequent attempt needs measured invocation/ancestor headroom and a justified
process-local heap budget, or an operator-provided larger invocation budget;
the parent fleet limit cannot substitute for either. Do not change host limits
from a repository turn.
Candidate upstream rehearsal, complete-range security review, approved isolated
state, authenticated/native-client journeys and production migration remain open.
No visual surface was inspected; matrix scores remain unchanged.

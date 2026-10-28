# Fire-327 recovery assessment — 2026-10-28 UTC

Assigned base and fetched origin/main: 835464fee91acb884d23be13f9b030273ce3ecd6.
GitHub Actions and local summaries confirm the preceding two runs failed, with no
agent report or committed result. Actual retained files contain an offline rollout
metadata assessor and tests. The newer run adds strict UTC timestamp round trips
and malformed-input regressions to the earlier version. Recovered those exact
helper/test files and bounded documentation changes read-only from run 40595709802;
no other worktree changed. Base commit is published on fetched origin/main.

ADR 0002 retires apex absorption. This recovery is deployment-quality preparation,
not migration completion. assessRollout validates supplied exact-scope metadata only,
capped at metadata-only regardless of stronger publisher labels. It neither collects
remote evidence nor authenticates it, seals sources, persists journals, uploads code,
or changes receipts. Read-only independent reviewer found no blocker within this
contract; renamed the allocation-mismatch test to avoid claiming concurrency detection.
Collectors still own observation invalidation and re-reading after concurrent changes.

Declared pinned submodule e89c7af70aeb0b7bc79e26a55ed3015a7f5b5b11 initialized
successfully without a pointer change. Official remote HEAD observed fe3ce9fc3dbd93be7f41795b07384b404a90076e;
discovery only, not reviewed/adopted. Historical receipt fork 80b7209e differs;
this is receipt disagreement, not live-source proof. No deploy, authenticated UI,
visual, storage, provider or byte-attestation acceptance is credited.

Machine provider-policy path ~/.agentskills/rules/agent-provider-policy.md is absent;
repo-local policy and fleet runtime prohibit PAYG fallback. No inference API used.
Direct pnpm shim fails (Volta missing executable); Corepack fallback attempted without
host configuration changes. Check results are recorded separately in agent-report.json.

Fresh verification: recovered focused suite 29/29, full root script suite 189/189,
and scripts typecheck pass after frozen installs in both workspaces. Initial broad
checks ran too early and found missing dependencies; those results are superseded
by the post-install pass. Nested wrapper commands also require a temporary Corepack
pnpm shim because the host Volta shim is unavailable. No host configuration changed.

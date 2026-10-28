# Fire-327 recovery review — 2026-10-28

## Independent assessment

The assigned base is 835464fe. Fetched origin/main remains at that base. Retained
commit 91bec9ec is not its ancestor; it is unpublished work, not evidence of delivery.
GitHub Actions lists run 40617245413 as failed, and its local receipt records an
InterruptedError while the wrapper check remained running. Earlier failed trees
40595709802 and 40559567708 retain the same offline helper strand. They were inspected
read-only and left untouched. Recovered commit is b2becb98; both helper and test files
compare byte-for-byte with the committed retained implementation.

The metadata assessor verifies complete planned scope, invocation/account/manifest
identity, exact uploaded version read-back, 100% allocation and UTC observation time.
It caps accepted caller labels at metadata-only. It authenticates nothing and has no
filesystem/network side effects. It is not a durable rollout journal or source-byte
attestation. Historical receipts cannot be reconstructed honestly from current HEAD.

A dedicated read-only adversarial reviewer independently found no material defects
within this offline scope and ran the 29 focused tests successfully. Collector
concurrency invalidation, restart reconciliation and immutable artifacts remain open.

## Loop improvement

The fleet command now requires dependency installs to finish before consumer checks,
starts long gates early, and distinguishes terminal results from inherited running
reports. This addresses the observed failure strand without mutating host scheduling.

## Boundaries

No deployment, resource/DNS/auth change, upstream adoption, provider request, native
client, authenticated journey, data reconciliation or visual acceptance is credited.
The fork remains e89c7af7; receipt remains 80b7209e. Main publication belongs to the
outer runner. Canonical provider policy was found in the shared skills repository;
the legacy ~/.agentskills path is absent. No credentials were read or changed.

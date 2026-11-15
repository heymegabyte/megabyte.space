# Fire-380 — official upstream inventory and resource identity boundary

Observed 2026-11-15 UTC. Research only; no architecture/specification authorship,
pin adoption, candidate installation or production mutation.

## Recovery and source provenance

Live GitHub history identifies run 43684358849 as failed; its retained summary
reports no result changes and its actual worktree is clean. No agent report exists
there and there is no verified unpublished work to recover. Fetched origin/main
contains fda5bdef, including the preceding assessment commits; canonical local
main lagging behind origin does not negate that remote publication evidence.

The declared fork initialized at 240899ec34e822a0afa695e3c7b48a41c2db9c4c and
passed independent-workspace preflight. Official main was fetched directly from
https://github.com/cloudflare/cloudflare-os.git into the fork's object database;
its worktree HEAD and committed gitlink did not move. Last inventoried official
2726e932a3fbfcfffa04ee093a881604009f2034 is an ancestor of fetched official
ea926546cc340da28acf0a0c4b10361acedf2ca6. The complete incremental Git range has
46 commits and 677 changed paths (127221 insertions / 11667 deletions).
See upstream-inventory.txt. Those counts describe inventory, not reviewed coverage.
The latest-release API returned HTTP 404; this does not establish absence of tags
or releases. The exact fetched commit, rather than a release label, scopes this review.

## Targeted source observations

At ea926546, workshop-shared getResourceTypeId uses explicit ID with URL-pattern
fallback for older gatekeepers. findResourceType treats a supplied ID as authoritative;
a missing ID is not repaired by a matching legacy pattern. Grant conversion preserves
undefined (full existing grant semantics) versus [] (no grant); legacy pattern grants
translate only on an exact current match. requestedResourceUrlPatterns rejects mixed
ID/pattern selectors. Compatibility resourceTypeUrlPattern separately accepts exact
current patterns: do not generalize strict ID resolution to every compatibility API.

admin-config retains legacy disabledResources and adds disabledResourceTypeIds.
An unresolved legacy restriction disables all resources for that vendor; a narrowed
account catalog is insufficient to classify a restriction as unresolved, so callers
may need the vendor's advertised catalog. UserDurableObject's resource assertion
reads current admin policy and checks gatekeeper/ambient disablement, then resource
policy. These source checks do not prove revocation of already-held capabilities.
The candidate resource-type-identity fixture covers changed patterns, unknown IDs,
empty/full grants, selector ambiguity, vendor separation and legacy restriction
blocking. It was inspected, not run. Admin settings, connection/creation and observer
paths need coordinated runtime coverage before adoption.

The incremental range also changes Overseer storage version 6 to 7. The migration
uses a synchronous transaction to freeze workspace-wide use grants to permanent,
non-pending gadget IDs. Empty gadget sets revoke eligible share links; single/multiple
sets write gadgetId/gadgetIds; collaborator use edges expand to those gadget IDs.
This is source inspection, not proof of isolated upgrade, interruption recovery or
rollback compatibility. Do not run it against the legacy estate during discovery.

## Dependency and acceptance consequences

The inventory includes pnpm-lock.yaml and changed package manifests, a new PagerDuty
Worker config, and office-content. Workshop backend test:run adds a native Vitest leg,
pi packages move 1.5.0 to 1.5.2, and frontend adds office-content/pdfjs-dist. Prior
candidate frozen-install/build/test receipts cannot transfer to this source tree.
Next rehearsal needs both frozen installs, generated configuration/binding review,
resource-policy failure/compatibility cases, isolated v6-to-v7 grants and new-gadget
noninheritance, plus native/browser/provider acceptance separately. Full review of the
remaining 677-path range remains open; no security-audit claim is made.

## Fresh verification and limits

Fork preflight passed; focused fork/provenance/lease/bookkeeping fixtures passed
57/57. No candidate suite, frozen install, wrapper build, browser harness, authenticated
journey, live Worker inventory or deployment ran. Existing memory-limited wrapper
acceptance and migration approvals remain open. Visual scores remain unchanged.
OpenCode is absent from PATH, so no throughput delegation was launched. Repository
bin/skill-router.py is absent; this bounded research used the local loop contract
and operator skill. No host limits, scheduler, credentials or external messages changed.

Loop improvement: distinguish strict persisted-ID resolution from explicit legacy
compatibility adapters, and test unresolved-policy behavior with both account-scoped
and vendor-wide catalogs. A renamed URL grammar must not silently widen grants.

# Fire-310 independent verification review

ADR 0002 supersedes legacy absorption. Chosen decision-independent slice: queued real-Git copy-in and fork-copy acceptance for the end-of-fire guard. Declared fork initialized at unchanged 9904d808; official upstream main still advertises 54d4685d27fc7a1ba58b4ff1e1842ebf4701d0b7. No candidate selection or production change.

Both new fixtures assert actual destination-NUL-source-NUL C records before an independent following edit; healthy fork metadata excludes unrelated sync failures. Copy-in uses an unwatched source and watched destination; after restoring the following edit, the copy is its only watched record. Fork-copy checks exact C capture plus its source modification, which Git needs for copy detection. Its exit alone does not prove copy-only blocking. Temporary C-exclusion mutation fails both new fixtures at exact-copy assertions; production verifier restored unchanged.

Recovery: fetched origin/main and read Actions history, seven failed receipts and all retained tracked states. Six failed result commits are published ancestors. Historical 8770b90e bookkeeping is not an ancestor; git cherry marks its implementation commits patch-equivalent, and current backlog/ledger already reconcile its discovery. Every retained tracked tree is clean. No replay, deletion or retained-tree mutation.

Acceptance limits: tests cover verifier framing, not production/native candidate acceptance. Historical deploy receipt differs from current fork pin (80b7209e vs 9904d808); no live deployed SHA credited. Migration phases, concurrent native-session lifecycle, protected RPC expiry and actual native-client/Access journey remain open. No deployment, browser/storage journey or visual score change.

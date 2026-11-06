# Fire-360 independent checkpoint rejection review

Scope: offline collector fixture acceptance only. No production integration or architecture change.

## Observed source boundary

`collectRolloutEvidence` clones a partial snapshot before invoking checkpoint. If checkpoint rejects, `save` adds `checkpoint failed; durability unknown` to the in-memory errors and returns false. It does not attempt to persist that error again. This is appropriate fail-closed behavior: a failed storage operation must not be assumed safe to retry. A callback can have made its input visible before rejecting, so reopened bytes and the returned result can legitimately differ.

Existing checkpoint-failure fixtures assert read count and returned error; the JSON round-trip fixture asserts reopened partial state after reader failure and successful collection. Neither combines post-write rejection with reopen. A narrow real-file fixture can cover that combination without claiming fsync, atomic replacement, crash recovery or a chosen production checkpoint adapter.

Acceptance: on the final snapshot, write JSON then reject. Returned completion stays false; all four expected reads happened; reopened snapshot remains explicitly partial even with both full sweeps and no stored errors. A new invocation recollects both sweeps. Never infer completion from array lengths or an empty stored errors array.

## Orientation evidence

Fetched origin/main contains assigned d3627417 and prior recovered collector commit b9d32289. GitHub Actions history lists success 42090183537 and failure 41963669270. Retained failed worktree is dirty with the recovered collector and docs; it was inspected read-only, not transplanted again. Exact declared submodule initialized and preflight passed at 240899ec34e822a0afa695e3c7b48a41c2db9c4c. Baseline focused assessor/collector/journal/crash tests pass 80/80.

No root/fork dependency installs or full wrapper acceptance are credited. Runtime deployment, remote authenticated reads, crash-durable checkpoint adapter, uploader integration, migration, browser/native-client and visual acceptance remain open. No pin or receipt changes.

## Terminal verification

DeepSeek via the mandated shared launcher authored only the regression test and ran collector fixtures 29/29. Lead reran combined assessor/collector/journal/crash fixtures 81/81 and fork/lease fixtures 24/24; syntax and diff checks pass. Independent subscription Codex review through `cr --provider codex exec` returned PASS with no blocking findings and ran its targeted test command. Initial `cr -p` attempt was rejected because the selected account is Codex; corrected invocation completed successfully. No API fallback used.

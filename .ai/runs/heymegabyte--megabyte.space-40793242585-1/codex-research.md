# Fire-328 independent recovery assessment

Assigned source: outer `39373277`, committed fork `87619d5a`. Fetched
`origin/main` contains prior successful result `83290604` and failed result
`7536bcae`; their committed assessor work must not be cherry-picked again.
The pinned fork initialized from the declared HTTPS remote without changing its SHA.

Read-only retained-worktree inspection found:

- Run 40617245413 has a dirty backlog recovery note. Its completed assessor recovery
  is already represented in current fire-327 backlog entries; its journal acceptance
  remains covered by the open fire-326 contract. No duplicate recovery is warranted.
- Run 40655654286 retains a four-line heap-retry instruction that is absent from
  current main. Its `.ai-wrapper-check.log` actually records frontend JavaScript
  heap exhaustion and wrapper exit 1. Recover the guidance, adding a cgroup-budget
  check: host memory alone cannot establish fleet process headroom. No source,
  generated files, logs or dependencies from that worktree are copied.
- Run 40713865613 has no dirty files and no structured agent report. Its GitHub/local
  summary reports execution failure; source ancestry proves publication of its
  committed work, not passing verification.

The offline validator's contract remains deliberately metadata-only. An independent
adversarial review found no scoped defects and ran its 29 tests successfully.
Collector concurrency, immutable snapshots, durable journal, locked upload metadata
round trip and production/runtime acceptance remain open. No pin adoption, historical
receipt rewrite, production mutation or visual score is justified by these checks.

This fire's improvement is recovery of a diagnosed verification failure's handling
rule. The guidance does not prescribe a larger heap on an overloaded host and does
not claim that a retry or full wrapper build passed.

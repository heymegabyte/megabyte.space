# Fire-311 independent verification review

Current mission: ADR 0002 fresh official OS migration; legacy absorption is retired.
The active pin is `9904d80867b6825d81b6b1189e2fccfd07af2ff5`. Initialization
and exact-SHA provenance verification succeeded from the declared fork URL.
Official upstream HEAD remains `54d4685d27fc7a1ba58b4ff1e1842ebf4701d0b7`;
no candidate update or migration acceptance follows from that observation.

Recovery: origin/main matches incoming base 37369519. Six historical failed result
commits are ancestors; 8770b90e is not, but prior ledger records its replay as
4884a465/aa97e8fb/366fe8ac. Its retained tree is clean. No duplicate recovery.

Selected open unit: fire-310 real-Git copy fixture with literal tab/newline destination.
The existing guard uses NUL framing and preserves paths; the missing proof is a
copy record with unusual destination characters, rather than an M record alone.
Extend both parent watched-destination and fork-copy fixtures. Require actual Git
C framing, exact destination/source, a following modified tracked record and a
second run after restoring that record. A modified unwatched source is necessary
for Git copy detection, so parent isolated detection must contain exactly one copy;
fork detection must contain the copy plus its source modification.

Focused baseline: 11/11. Extended focused suite: 13/13. This is regression coverage,
not a newly observed runtime defect. No runtime, pin, deployment config, credentials,
receipt or visual score changes. No product deployment is required for test-only work.
BA E2E credentials are unavailable; Cloudflare global key and direct DeepSeek key
availability checks succeeded without retrieving or printing values.

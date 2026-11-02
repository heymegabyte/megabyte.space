# Fire-349 — recovery and terminal verification

Fetched origin/main remains bb2e1770. Retained result 96b8df30 is not its
ancestor; its eight documentation commits were recovered without old bookkeeping
or the retained worktree's dirty BACKLOG. Other worktrees were inspected read-only.
GitHub reports the preceding two runs failed, consistent with their private receipts.

The previous check-retry.log has a terminal frontend V8 heap-exhaustion failure,
not merely the `running` status left in its report. This does not establish a
source regression. Current Node heap limit is 846 MiB. The current invocation's
cgroup memory.max is 2147483648 bytes; its ancestor fleet limit is 10737418240.
Host free memory and the ancestor budget do not override the smaller child limit.
Do not assume a 2–4 GiB V8 heap is safe here. No host limits were modified.

Fresh declared submodule initialization and exact-SHA retrieval pass at unchanged
240899ec34e822a0afa695e3c7b48a41c2db9c4c. Both frozen installs must terminate
successfully before dependency consumers. An early scripts-suite attempt overlapped
installation and failed resolving jsonc-parser; it is invalid acceptance and will
be superseded only by a completed post-install run, not attributed to source.

No production mutation, deployment, browser/native-client, storage reconciliation,
visual score or migration acceptance is credited. Terminal outcomes are in the
run report; historical receipts are not new verification.

## Terminal outcomes

Both pinned frozen offline installs exceeded their 220-second bounds (exit 124)
after package-addition progress; neither .modules.yaml existed afterward. No
full wrapper or heap retry was attempted. Dependency-free focused tests passed
49/49, exit 0. The premature broad suite recorded 174 passes and one file-level
failure importing jsonc-parser; it is not a post-install acceptance run. No cause
for the installation delay is established. Independent review found no blockers
in the recovered guidance or the new memory/terminal-log clarification.

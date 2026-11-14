# Fire-379 — invocation memory budget assessment

## Observed scope and provenance

Origin/main and all four inspected retained worktrees are at bce7c457. Live GitHub
history marks runs 43635937453 and 43611678367 failed, with no result changes in
their receipts or actual worktrees. Prior recovery bce7c457 is on origin/main.
The assigned exact declared fork 240899ec34e822a0afa695e3c7b48a41c2db9c4c
initialized successfully and passes independent-workspace preflight. No pointer moved.
Official upstream HEAD advertises 6c8d301dcfef4e8fdff41a3db5fe3f8bb82f8e2d;
this is discovery only, not a release review, complete-range inventory or adoption.

## Memory evidence

Read /proc/self/cgroup and walked actual cgroup ancestors. The invocation scope
has memory.max=2147483648 and memory.high=1572864000 bytes. Its fleet parent has
memory.max=10737418240 and memory.high=8589934592. At the saved snapshot,
invocation memory.current=990334976, swap.current=1027686400; fleet current was
approximately 6.2 GB. Several runtime processes share the invocation scope.
The sanitized snapshot is retained as memory-snapshot.json in the run log directory.
It contains process names, IDs and RSS, never process arguments or environments.

Current Node v24.22.2 reports default heap_size_limit=887095296 bytes. A metadata-only
probe with --max-old-space-size=1280 reports heap_size_limit=1442840576 bytes.
This probe allocates no representative build workload and proves no acceptance.
The wrapper serially invokes build commands via spawnSync, but pnpm/vp and child
build processes coexist. NODE_OPTIONS would be inherited by those Node processes;
it is a per-process ceiling, not an aggregate cgroup reservation.

Do not add maximum heap to all memory.current as a necessary resident requirement:
this snapshot includes file=447627264 and slab_reclaimable=289157368 bytes, neither
of which establishes guaranteed immediate reclaimability. Conversely, subtracting
RSS from memory.max or counting host/parent free memory cannot prove safe headroom.
Swap presence is not extra resident capacity. The cumulative high/max/oom counters
predate this assessment; no event delta or exclusive attribution was measured.
The snapshot does not establish an active OOM or that this iteration caused pressure.

## Decision and next acceptance

No full-wrapper retry: a safe larger heap is not established by these point samples.
The historical frontend heap failure remains unresolved. No host/scheduler limits
or credentials changed. Next rehearsal must record baseline and temporal resident,
swap and pressure samples for the invocation and ancestors, plus child-process RSS,
while bounding one process-local heap experiment. Reserve terminal cleanup/reporting
time and stop on sustained throttling or budget exhaustion; do not retry blindly.
First complete both serial frozen installs and the child-shell pinned-pnpm check.
If the current scope cannot accommodate the measured process tree, request adequate
invocation capacity through the operator rather than editing scheduler configuration.

Fresh focused fixtures pass 53/53. These are not frozen-install, frontend, wrapper,
browser, native-client, provider, production-identity or migration acceptance.
Production mutation approval under MIGRATION sections 5–6 remains open.

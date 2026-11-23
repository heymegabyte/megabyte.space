# Fire 387 — Legacy wrapper verification

The assigned base and fetched `origin/main` both pointed to `d30b6715` at
orientation. Four retained worktrees (44971340100, 45004134889, 45045224967,
45076093638) were clean and pointed to that commit. Runs 45004134889 and
45045224967 ended with execution failures. Run 45076093638 ended with a
completion-evidence failure and its report records a frontend JavaScript heap
failure. No unpublished tracked changes were available to recover.

The declared fork initialized at `240899ec34e822a0afa695e3c7b48a41c2db9c4c`.
The wrapper preflight fetched the committed gitlink by SHA from the declared
remote. Serial frozen installs exited 0 for the root and fork with pnpm
11.17.0. The root install warned about two workerd bin links. The fork install
followed exact-HEAD workspace preflight.

The official remote advertised `454584cd1cf322a281c02fbf284b897ebef7a700`.
GitHub's comparison with the previous observed revision `27888f04` reported
two commits ahead, zero behind and 35 changed paths. The two changes concern
Google Drive folder shortcuts and routing Google AI Gateway models through the
Workers AI binding. This is release discovery. The selected candidate needs
its own inventory and rehearsal. The deployed-fork receipt differs from the
wrapper gitlink, so the receipt leaves live source identity unresolved.

The wrapper ran with a process-local 1280 MiB V8 old-space cap. In the same
invocation, the default V8 heap limit was 887095296 bytes and the adjusted
limit was 1442840576 bytes. The invocation cgroup had a 2 GiB hard limit and a
1500 MiB high threshold. An earlier tool call used a different cgroup with an
8 GiB hard limit. Use the executing shell's membership for limit and pressure
measurements. One-second scope memory and swap samples include all processes
and accounting in the scope, and provide sampled lower bounds on the peaks.

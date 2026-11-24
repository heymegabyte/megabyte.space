# Cloudflare OS migration source review

GitHub main was `d30b6715`. The recovered tracked tree matches unpublished
`34910e51` exactly. The retained scratch pnpm launcher was run-local tooling.
The pending Context sync backlog item was recovered independently of that launcher.

The declared fork initialized at the exact gitlink
`240899ec34e822a0afa695e3c7b48a41c2db9c4c`. Official upstream main advertised and
fetched `266dffed475c88ab47670df4ab17b54545f43b13`. Official upstream advertised
zero tag refs. Git ancestry and the local range inventory show four commits and
33 changed paths from `2ca27fb0`.

| Commit | Subject |
| --- | --- |
| `a9e613e2` | Fold a chat's content from its last epoch boundary |
| `88f6190d` | Let gadgets, executeCode and gatekeepers fetch under one policy |
| `c476f26f` | Connectors: offer ambient gatekeepers only while they can be added |
| `266dffed` | Stop a rate-limited capability's queued calls when it is disposed |

The last commit changes `rateLimitedCapability.ts` and its test. Its queue
drain schedules execution in a promise continuation. The disposal check inside
that continuation covers the interval between dequeue and the capability
invocation. Disposal clears the timer, empties and rejects the queue, and the
proxy rejects later calls. Completion of an already received call still drains
an empty queue. There is no cancellation signal passed to underlying calls.

`SandboxedGatekeeperApp` stores the disposer and invokes it from host disposal.
`SandboxedResourceConfigurator` consumes only the proxy and selects reject mode.
The two added fake-timer cases distinguish admitted, dequeued-but-unstarted,
queued, and future calls and check that completion cannot rearm a timer.
These are source observations. The tests were inspected. Candidate runtime
acceptance remains open, including an actual host teardown with backend effect
reconciliation and a separate configurator lifecycle check.

# Fire-343 independent recovery and bootstrap review

- Assigned base and freshly fetched origin/main: bb2e1770. Retained result
  10579d46 and its documentation parent fefa6adf are not ancestors of origin/main.
  The retained worktree has no status entries. Recovered documentation parent only
  as da78ae21; previous research remains explicitly historical.
- Public Actions API freshly returned current running run, failed 41256516584 and
  successful 41243430115/41227033300. These statuses do not prove publication.
- Fresh bounded gh history request exited 124. Exact declared submodule init exited
  124 after 45 seconds. Fork preflight then rejected missing own .git marker;
  expected committed pin 240899ec34e822a0afa695e3c7b48a41c2db9c4c.
- Non-secret process metadata during clone showed a waiting Git transport and gh
  helper descendant. This narrows the pending stage, not its root cause. The timed
  clone exited; a separate initial unbounded gh query was stopped only after its
  cwd established ownership by this run. Another project's gh was left untouched.
- 74 focused regression assertions pass freshly. Strict committed-source guard
  still exits 1 for uninitialized submodule; both frozen installs/full wrapper gates
  remain unrun. No source/runtime acceptance inferred from fixtures.
- Independent reviewer found no blocker in recovered documentation and proposed
  minimal process-tree evidence, now documented. No credential/config/pin change.
- Journal recovery remains deferred to its existing exact-source prerequisite.
  No deployment, migration acceptance, browser/native journey or visual pass.

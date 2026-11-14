# Fire-377 — independent retained-evidence recovery

Origin/main remains at 9bb08984 after bounded fetch. Live GitHub Actions lists
43511984489 and 43453185793 as failures; the latest previous run has no structured
agent report and no committed changes. The retained 43453185793 worktree is clean
at 67a72d77, which is not an ancestor of origin/main. Its documentation commits
were inspected before recovery; no implementation was duplicated.

Recovered d10e3cbd as ebf7cdfe and 67a72d77 as 9977d5fd. Actual retained logs
confirm serial install completion (52.1s root, 28.3s fork, pnpm 11.17.0), root
fixtures 260/260 and frontend heap exhaustion. wrapper-terminal.json records
exit 1, 261.3s and no remaining generated configs. Retained independent fork HEAD
is 240899ec34e822a0afa695e3c7b48a41c2db9c4c; root/fork lock hashes match the
recovered assessment. These are historical results, not current-checkout gates.

Fresh focused fork/lease/bookkeeping/clean-tree regression fixtures pass 53/53.
The assigned checkout has an uninitialized fork. No install, full wrapper retry,
browser, native-client, provider, authenticated journey or production acceptance
was attempted for this documentation recovery. No matrix score changed.

Loop improvement recovered: checkpoint each frozen install terminal outcome before
starting the next stage, so a later interruption cannot obscure completed evidence.
Next wrapper attempt still requires measured invocation/ancestor memory headroom
and a justified local heap budget. Production migration approval remains open.
Original receipts and other worktrees are preserved. Publication belongs to the
outer runner; no push, deployment, scheduler or credential change was performed.

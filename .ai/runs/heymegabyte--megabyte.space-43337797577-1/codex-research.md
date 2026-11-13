# Fire-374 — recover measurement interpretation guidance

Independent review of assigned base 7931a57a and retained failed run 43286382011.
Fresh GitHub history confirms that run failed and the preceding run succeeded.
Fetched origin/main remains 7931a57a; the assigned base is published.
The failed worktree has one tracked five-line documentation change and an untracked
research artifact. Both were inspected read-only; no source implementation was stranded.

Recovered the bounded cgroup measurement guidance into the loop command. It correctly
requires resolving the unified cgroup path and checking scope membership, distinguishes
descendant RSS from cgroup accounting, and labels periodic peaks as sampled lower
bounds. This prevents attribution claims that the retained evidence cannot establish.

The prior wrapper stage log ends with Router dry-run exit 0 at
2026-11-12T19:19:15.454Z. No wrapper-terminal/result receipt exists in that log directory;
wrapper-running.json remains a one-sample checkpoint. The agent report calls the wrapper
incomplete. These records establish a completed child stage, not outer process exit,
post-check cleanup, or a completed memory profile. No full-wrapper PASS is recovered.
Prior frozen installs and 260 tests remain historical reported evidence only.

The current checkout has an uninitialized fork. This documentation-only recovery does
not initialize/install it or claim current-checkout wrapper acceptance. No deployment,
submodule pointer, configuration, visual score, production receipt or migration status
changed. The Phase-2 mutation approval and candidate/live acceptance remain open.

Next: on an initialized exact-pin checkout, collect paired wrapper exit and cleanup
evidence plus the terminal sampler output before interpreting the measured run.

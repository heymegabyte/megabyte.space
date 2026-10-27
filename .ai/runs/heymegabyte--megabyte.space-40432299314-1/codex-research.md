# Backup recovery review — fire-324

Inspected GitHub Actions runs 40408427190 and 40370252189, their retained summaries,
actual commits and worktrees. Both base/result commits are ancestors of fetched
origin/main. Neither failed receipt reports completed checks. Run 40408427190 retains
an untracked backup-auth-d1.test.mjs, recovered into this assigned worktree without
modifying the retained source. Current declared fork e89c7af7 initialized successfully;
no gitlink movement or upstream adoption performed.

Recovered tests fail twice against the incoming script: missing R2 --remote and
same-size corruption reported successful. Source review additionally finds insecure
suffixed mktemp paths (unused original files and default-mode SQL files), latest
unpinned Wrangler, and ignored bucket-provisioning failures. The fix uses a private
scratch directory with cleanup, pinned pnpm@11.17.0 exec wrangler from repo root (on-demand npx bootstrap, because the Volta pnpm shim has no executable),
explicit remote object operations and cmp content equality. Bucket provisioning is
removed: an existing approved private bucket is required. Secret retrieval failure
now propagates before export and an empty credential is rejected.

Cloudflare command reference consulted 2026-10-27:
https://developers.cloudflare.com/r2/reference/wrangler-commands/

Independent adversarial subagent found no blocker in the initial fix (2 tests passed),
but requested failure-injection, undersized-export and exact command-count coverage.
Those cases now pass (6/6 total). Mock fixture credentials never contact Cloudflare.
This proves local control flow, not live storage, privacy, recoverability or a successful
historical offsite backup. Same-account R2 is described accurately as a remote copy.
No production mutation, scheduler change, credential change, browser/native-client,
visual acceptance, restore exercise or migration completion is claimed.

Next wave: approved live remote-object verification and an isolated restore drill;
record object identity/checksum and restore results without exposing authentication SQL.

# fire-273 independent research and review

The retained fire-262 commits, including e9b95de0, are ancestors of fetched origin/main; no replay is needed. The initial workspace is clean at 94ce767c. The pinned fork remains f48f55e9. The deploy-state ledger matches that fork; this is ledger evidence, not a fresh production probe.

Independent diagnosis before external review: line-delimited porcelain combines rename endpoints and Git-quotes unusual filenames. A rename into a watched directory is missed; exact-path watchers can also miss renames out. NUL-delimited porcelain v1 supplies destination then source as separate records. Check both paths and preserve originalPath in diagnostic JSON. Use the same framing for fork dirt.

Real Git fixtures reproduce four failures before the fix, then pass after it. They cover rename-in/out, Unicode/tab/newline filenames, fork renames, a tracked record after rename, and allowed untracked artifacts. Fork metadata is healthy in the new fixtures, so unrelated fork failures cannot mask the dirty gate.

Read-only independent review through cr --provider codex (official subscription, observed gpt-6.1-sol) accepted the parser/filter implementation. Reviewer noted missing following-record coverage and confounded exit assertions; both addressed before the final 96-test run. Copy framing was checked by the reviewer in memory, but a real Git copy fixture remains next-wave work.

No Claude synthesis or product visual/golden-path proof claimed. Deployment, Better Auth and DeepSeek credentials are unavailable. No paid fallback or credential changes performed.

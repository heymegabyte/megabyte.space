# Independent research — fire-262 fleet

The previous GitHub run 37719075563 failed in its summary-finalizer step, after its execution step succeeded. Its receipt credits result 93f4b5e4; git branch --contains proves origin/main contains that commit. Only canonical checkout and current isolated worktree remain. No unpublished recovery work identified; no replay needed.

Reproduced two end-of-fire guard gaps with failing regressions: tracked .claude/commands/run-the-loop.md changes were not watched; a broken fork .git marker yielded CI success because HEAD/status inspection failures were swallowed. Independent read-only reviewer identified the broken-marker issue before implementation and accepted the final diff. Fix adds the command path and explicit blocking Git inspection issues, without touching product auth or the pinned fork.

Initialized pinned fork b3fc9a03. Root frozen install succeeds through npx pnpm@11.17.0 (Volta pnpm launcher has no executable installed). Initial pnpm check passes resolvability, route reachability, accent coverage, script types and script tests, then fails on missing fork frontend build dependencies. The starter includes only two fork workspace packages: install the fork separately as well. Added this concrete bootstrap requirement to loop orientation.

cr reports official codex-primary enabled, with stale usage observations. DeepSeek, Cloudflare deploy and BA E2E credentials are absent in environment and broker. No secret values printed, no API fallback, no Browser Harness, no scheduler changes. No deployment or visual score claimed.

Fresh verification after repair: Node script suite 81/81 PASS; targeted lifecycle suite 28/28 PASS; scripts typecheck PASS; pinned fork test gate 968/968 PASS; homepage build PASS. Homepage standalone typecheck FAILS in untouched Login.tsx, NotFound.tsx, StatusView.tsx and webgl.ts; no homepage source changed here. Added an explicit acceptance item for this debt. No surface visited, so modifier matrix unchanged.

After separate fork install, `npx --yes pnpm@11.17.0 check` completed exit 0: static gates, build/tests and all Worker dry-runs passed. This is a dry-run, not deployment evidence.

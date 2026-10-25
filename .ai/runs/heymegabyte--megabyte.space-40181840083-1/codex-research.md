# Fire-317 — official upstream inventory and adoption boundaries

Mode: research. Base wrapper d4fb1a8a; declared fork 8ccbb45d remains checked out.
Official source fetched directly from https://github.com/cloudflare/cloudflare-os.git main.
Candidate bd10b0ece6842b8f486b3467eab6cc3b9c920920 is a descendant of the last reviewed
54d4685d27fc7a1ba58b4ff1e1842ebf4701d0b7. The complete local Git inventory contains
75 commits / 778 paths (129394 insertions, 15848 deletions). Adjacent evidence JSON,
commit list and path list are uncapped. **Inventory completeness is not review completeness.**
This pass reviews selected deployment/authority seams, not all changed implementation.

## Findings and required proof

1. Candidate pnpm-workspace.yaml moves Vitest 4 to 5, replaces
   @cloudflare/vitest-pool-workers with @cloudflare/vitest-plugin, adds browser-mode
   dependencies and allows a Vitest 5 peer exception for vitest-evals. The wrapper's
   package.json still declares the older pool. Rehearse BOTH frozen workspaces and
   candidate tests/configurator/frontend builds; current-pin gate tests do not prove this.
2. Candidate packages/workshop-backend/{cloudflare.config.ts,wrangler.jsonc} adds
   CF_VERSION_METADATA. scripts/release/manifest-lib.ts now carries version_metadata
   and gatekeeper ai declarations into released bindings. Verify the wrapper-generated
   configs retain these declarations and test reconnect after a backend version change.
3. Candidate packages/gatekeeper-google/wrangler.jsonc adds an AI binding; GitHub's
   Wrangler config adds migration v1 / GitHubHookDriver. Candidate Web Search introduces
   its own WebSearchGatekeeper v1 migration and AI binding. Preserve migration history
   per identity; never apply candidate migrations to legacy identities as a rehearsal.
4. Release manifest PREINSTALL/SINGLETON now includes gatekeeper-websearch. Current
   wrapper EXTRA_GATEKEEPERS does not list it. This is a deployment-path difference,
   not proof a manifest preinstall happens when using this custom wrapper. Decide the
   intended capability explicitly; verify actual bindings, ambient discovery, query
   observation, Gateway/billing ownership and export/retention before enabling it.
5. 835de9e8 changes denial to withdraw pending actions despite uncertain prior provider
   effects. Gatekeeper kit rejection may clear orphaned claims and logs cleanup errors.
   A successful deny must not be presented as provider rollback. Rehearse interrupted
   approval -> deny -> provider reconciliation, and deny while approval is still running.

## Recovery and limits

Both retained worktrees 40145905691 and 40163666425 have empty short status. Their
result commits baa0faf5 and bae955e2 are ancestors of fetched origin/main. No replay
or cleanup was appropriate. Exact declared-source verification passes for 8ccbb45d.
The deployment receipt still names 80b7209e (2026-10-09); this is stale-receipt drift,
not evidence of the actual current live version. Do not repair the receipt by assumption.

No candidate install/build/runtime test, authenticated journey, visual inspection,
production inventory, deployment, pin change or migration acceptance is credited.
Earlier native-session/concurrency and Slack revocation acceptance remains open.

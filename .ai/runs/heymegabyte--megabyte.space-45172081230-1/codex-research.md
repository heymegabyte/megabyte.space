# Fire-388 — official upstream 27888f04 → 454584cd inventory and targeted review

Source-only slice. Nothing in this record is candidate runtime, production, browser or
visual acceptance, and nothing here approves a submodule pin move or a migration phase.

## Orientation and recovery

- Assigned base and fetched `origin/main` both `d30b6715`. Four retained worktrees were
  inspected read-only: `45076093638`, `45045224967` and `45102702098` are at `d30b6715`;
  `45102702098` carried the only unpublished tracked change (a one-hunk clarification in
  `.claude/commands/run-the-loop.md`) plus an untracked research record under its own run
  directory. Both are recovered in this fire, verbatim, at their original paths and credited
  to run `45102702098`; they are not represented as this fire's own terminal evidence.
- The declared fork initialized at the unchanged committed gitlink
  `240899ec34e822a0afa695e3c7b48a41c2db9c4c` and passed `node scripts/check-fork-workspace.mjs`
  (`ok: true`, expected == actual HEAD). `node scripts/check-fire-committed.mjs` reported a
  clean watched tree with no fork drift before any change.

## Upstream release identity (bounded network reads)

- `git ls-remote https://github.com/cloudflare/cloudflare-os.git refs/heads/main refs/tags/`
  returned exactly one ref: `refs/heads/main = 454584cd1cf322a281c02fbf284b897ebef7a700`.
  No `refs/tags/*` lines were returned, so no release tag was advertised by this query.
  A missing tag advertisement supports "no tag visible to this query"; it does not prove the
  repository has never tagged a release.
- A scratch shallow fetch (depth 60, outside the repository, `/tmp`) into an empty local
  repository placed `454584c` two commits ahead of `27888f04`, matching the prior run's
  GitHub compare result (2 ahead / 0 behind / 35 changed paths).

## Complete incremental inventory (27888f04..454584c)

`git diff --name-status` returned exactly 35 paths (below the API's 300-path cap, so this
range is complete for the two-commit span; it is still an inventory, not an audit):

- Commit `0b7872d` — Google Drive: a connected folder reads the files and folders its
  shortcuts point to (#1262). Touches `packages/gatekeeper-google/` drive-api,
  drive-folder-scope, drive-session, Drive types and configurator UI, plus the drive-api,
  drive-session, workerd drive-changes and native-sessions suites and the package README.
- Commit `454584c` — Route Google AI Gateway models over the Workers AI binding (#1250).
  Touches `packages/workshop-backend/src/{ai-gateway,ai-models,env.d.ts}`,
  `packages/workshop-shared/src/api.ts`, the AI-models/GatewayProviders frontend features,
  workshop-evals egress/target, preview staging config and dev-server scripts, docs
  (`ai-gateway-billing`, `public-server`), `packages/workshop-backend/package.json`,
  `pnpm-lock.yaml` and `pnpm-workspace.yaml`.

## Review notes — access-boundary observations (source reading only)

### Drive folder shortcuts (#1262)

`FolderLocation` gains `shortcuts?: Record<folderId, shortcutId>`. `readFolderLocation`
refetches every saved edge plus each named shortcut in one batch and refuses when the root
itself is claimed to be reached via a shortcut (`shortcutIds[0] !== undefined →
outsideScope`). Each non-root edge is validated either as a direct child of the previous
folder or as a live shortcut whose `shortcutTargetId` equals the next folder and which is
itself a direct child of the previous folder (`isShortcutChild`). Only reads follow
shortcuts; the saved write path carries `folderIds` alone, so a folder reached through a
shortcut cannot prove a write location. A deleted or retargeted shortcut therefore fails the
refetch and the whole location is refused.

Residual questions to settle before any adoption claim: collaborator checks are attributed to
the target with the connecting user's own Google account (commit message); the change widens
what a folder connection can read for shared team folders, so isolated tests need a shortcut
to a file outside the folder and a shortcut whose target the user cannot open; the loop guard
ends at the first repeat (`MAX_PATH_NODES`); and revocation timing across an already-issued
capability is not covered by sequential replay.

### Google models over the Workers AI binding (#1250)

`HTTPS_ONLY_PROVIDERS`, `AiGatewayConfig.bindingFor()` and
`AdminGatewayProvider.needsApiToken` are removed; every gateway provider rides
`workers-binding.ai` whenever the binding transport is active, with only the deployment-wide
`CF_AI_GATEWAY_USE_BINDING=false` HTTPS opt-out. The security-relevant half is header
handling: AI Gateway does not strip auth headers on internal binding requests and treats a
surviving `x-goog-api-key` as caller-supplied BYOK overriding stored keys, so gateway-routed
Google handles set `"x-goog-api-key": null` and `makeHandle()` strips the header
`@google/genai` appends before dispatch. Candidate fixtures assert the header is null on both
the binding and HTTPS transports.

Adoption checks that remain: the dependency bump of `@earendil-works/pi-ai` and
`@earendil-works/pi-agent-core` to 1.6.0 (lockfile + workspace manifest), the removal of the
per-provider token requirement from staging config and operator docs, workerd-level binding
transport behavior, and the case where a deployment had relied on the removed
`needsApiToken` warning to notice a missing token. Fixture existence is not fixture execution;
none of the candidate suites ran in this fire.

## Limits

No candidate install, build, suite run, workerd test, real-provider call, browser journey or
visual inspection. Fork stays `240899ec`; no production identity, deployment receipt,
credential, scheduler or host setting changed. The deployed-fork receipt predating this
iteration still differs from the wrapper gitlink, and live Worker source identity remains
unverified.

# cloudflare-os upstream inventory notes

## Scope and verification

- Range: `bd10b0ece6842b8f486b3467eab6cc3b9c920920..2726e932a3fbfcfffa04ee093a881604009f2034`
  in the `cloudflare-os` submodule. Both endpoints were fetched directly from
  `https://github.com/cloudflare/cloudflare-os.git`; its configured origin remains
  the distinct legacy fork `https://github.com/heymegabyte/cloudflare-os.git`.
- Local objects for both endpoints are present; the repository is not shallow.
- `git merge-base --is-ancestor` confirms the base is an ancestor of the target
  (merge base = `bd10b0ece6842b8f486b3467eab6cc3b9c920920`).
- Full, uncapped range: **88 commits**, **995 changed paths**
  (561 modified, 414 added, 16 deleted, 4 renamed), **170,920 insertions**,
  **17,101 deletions**. Recorded committer-local dates span 2026-10-26 through 2026-11-05;
  target time in UTC is 2026-11-06T02:05:18Z.
- This is an inventory and subject-level triage, **not a full compatibility audit**.
  No checkout, dependency install, build, test, deployment, or config/gitlink change was made.
- Machine-readable evidence: `upstream-evidence.json`; full commit list:
  `upstream-commits.txt`; full path list: `upstream-paths.txt`.

## Submodule state observation

The worktree's pinned `cloudflare-os` HEAD is
`240899ec34e822a0afa695e3c7b48a41c2db9c4c`
(`pre-fresh-os-relaunch-20261009-19-g240899ec`). It is **not** the target, and neither
commit is an ancestor of the other. The merge base of the pinned HEAD and the target is
`6478a1448a11524e2f7c2575ad66fab0bc47c433`; the target has 387 commits not in the pinned
line, and the pinned line has 226 commits not in the target. Any adoption of the target
therefore crosses a divergent lineage, not a fast-forward. See `submodule_context` in
`upstream-evidence.json`.

## Compatibility risk candidates

These are candidates derived from changed paths and commit subjects. Each needs
path-level review, build/test verification, and (where applicable) deployment-config
verification before adoption.

### 1. New Microsoft 365 gatekeeper and deployable Worker

- Commit: `18ff6e72` ("Added Microsoft 365 Gatekeeper: SharePoint, Outlook, Calendar (#902)").
- Paths: `packages/gatekeeper-microsoft/**` (200 changed paths), including
  `packages/gatekeeper-microsoft/package.json`,
  `packages/gatekeeper-microsoft/cloudflare.config.ts`,
  `packages/gatekeeper-microsoft/deploy-inputs.json`,
  `packages/gatekeeper-microsoft/wrangler.jsonc`,
  `packages/gatekeeper-microsoft/storage-schema.md`.
- Why it may matter: adds a new workspace package, Worker deploy config, AI binding, and
  Durable Object migration `v0` (`UserAccount`, `SharePointGatekeeper`,
  `OutlookGatekeeper`, `OutlookHookDriver`, `CalendarGatekeeper`).
- Verify: workspace discovery, generated Worker config, deploy inputs, DO class registration,
  and any downstream allowlists.

### 2. Subresource-based observer verification migration

- Commits include `a3a0de9a`, `e51bda9c`, `38ffcd60`, `f8ca77bf`, `c4d32b24`, `01a497d8`,
  `ab4daeb3`, `ef8738aa`, `95fea915`, `1d941a44`, `f18be277`, `9b7c2d59`, `2726e932`.
- Supporting commits: `35361988` (gatekeeper-kit observation helpers), `0701f2f8`
  (canonical subresource IDs), `b533f8aa` (subresource ID limit raised to 2048),
  `07122d39` and `c6660685` (observer admission behavior).
- Paths: `packages/gatekeeper-kit/**`, plus gatekeeper integration sources and
  `packages/gatekeeper-{github,gitlab,microsoft,x}/storage-schema.md`.
- Why it may matter: broad behavioral/security-model change across gatekeepers, including
  observer identity, admission, and stored schema documentation.
- Verify: `gatekeeper-kit` API compatibility, observer identity semantics, subresource
  limits, and each migrated gatekeeper's storage schema.

### 3. Admin audit Durable Object and new migration tag

- Commits: `c2825ba6` ("Audit every admin settings change (#1025)"), `d319e196`
  ("Audit the restricted web fetch approvals setting (#1032)").
- Paths: `packages/workshop-backend/wrangler.jsonc`,
  `packages/workshop-backend/src/storage-schema/admin-settings-storage.ts`.
- Why it may matter: adds Durable Object migration tag `v4` with
  `AdminAuditDurableObject`; deployment ordering and existing DO storage must accept it.
- Verify: migration ordering, DO class binding, and audit-write behavior.

### 4. Git storage/cache refactor and storage migration changes

- Commit: `cc50e032` ("Implement git large-file chunking and other enhancements (#817)").
- Related fix: `943cd1e0` ("Refuse NUL in gadget text so accepting can't break a gadget (#1010)").
- Paths: deletion of `packages/workshop-backend/src/git-store.ts`; rename of
  `packages/workshop-backend/__tests__/git-store.test.ts` to
  `packages/workshop-backend/__tests__/git-cache-history.test.ts`;
  changes to `packages/workshop-backend/src/storage-schema/overseer-migrations.ts`,
  `overseer-git-migration.ts`, `overseer-storage.ts`, and
  `packages/workshop-backend/cloudflare.config.ts`.
- Why it may matter: persistence/migration code imports move from `git-store` to a
  `git-cache` abstraction; large-file chunking changes storage behavior.
- Verify: all imports of the removed module, migration tests, and Durable Object storage
  compatibility.

### 5. Dependency and toolchain jumps

- Commits of note: `9092a4a0` (`diff` 8.0.4 -> 9.0.0), `31a269ba`
  (`postal-mime` 2.7.6 -> 4.0.11), `0a17464a` (motion 13.5.1 -> 14.3.0),
  `9e082bcd` (React/UI group), `abc8931b` (CodeMirror group), `fbd0d33f`
  (`@modelcontextprotocol/client`, `zod`, `dompurify`), `14747e52`, `30390205`,
  `b096e242`, `b0ef1d1b`, `9fcc4c60`.
- Paths: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and the 24 changed
  workspace `package.json` files listed in `upstream-evidence.json`.
- Catalog deltas visible in `pnpm-workspace.yaml` include `wrangler` `^4.147.0` ->
  `^4.154.0`, `@cloudflare/workers-types` `^5.20261001.1` -> `^5.20261027.1`,
  `miniflare` `5.20261001.0-alpha` -> `5.20261023.1-beta`, `zod` `^4.6.5` -> `^4.6.7`,
  `playwright` `^1.64.0` -> `^1.64.1`, and `vite-plus` `^1.2.0` -> `^1.4.0`.
- Why it may matter: lockfile resolution, peer rules, Wrangler/Miniflare compatibility, and
  major-version behavior changes.
- Verify: clean install, typecheck, build, and Worker test suites.

### 6. New API CLI/schema workspace packages

- Commits: `ed3d6546` ("Generate the Workshop API's schema and drive instances with
  pnpm cf-os api (#860)"), `38d78e7d` ("Workshop API for cf-os api: ... (#948)").
- Paths: `packages/api-cli/**`, `packages/api-schema/**`, plus root `package.json`
  (`api-schema:generate`, `@gadgets/api-cli` and `vitest` devDependencies).
- Why it may matter: new workspace packages and generated schema fixtures/scripts alter
  workspace topology and CI expectations.
- Verify: workspace package discovery, generated fixture freshness, and new scripts.

### 7. Gatekeeper auto-approval policy

- Commits: `58f20092` ("Require an auto-approval verdict on every gatekeeper action
  (#941)"), `fc2105c3` ("Apply the auto-approval opt-out policy to gatekeeper actions
  (#997)"), `76765e5e` (auto-approve GitLab force pushes and Calendar invitations).
- Paths: `packages/gatekeeper-kit/**` and gatekeeper sources, notably
  `packages/gatekeeper-microsoft/**`.
- Why it may matter: changes action-admission semantics and security policy.
- Verify: expected approval/denial behavior for every gatekeeper action.

### 8. Restricted web-fetch approval policy

- Commits: `c1280748` ("Let restricted workspaces fetch from hosts an admin trusts (#929)"),
  `abdf3ebc` ("Let users approve web fetches in restricted workspaces (#974)").
- Paths: `packages/workshop-backend/src/storage-schema/admin-settings-storage.ts` and related
  backend/frontend policy code.
- Why it may matter: network-policy behavior changes for restricted workspaces.
- Verify: policy defaults, admin controls, and approval flow.

### 9. AI model defaults, Auto Router, and model ordering

- Commits: `79f87d19` (Auto model / AI Gateway Auto Router), `44ad8d5e` (admin and Auto
  Router settings fixes), `15786118` (Claude Haiku 5.5 and Models tab settings),
  `f40e88dd` (default Workers AI to DeepSeek V4.1 Flash and allow model/provider ordering).
- Paths: `pnpm-workspace.yaml`, `packages/workshop-backend/src/storage-schema/admin-settings-storage.ts`,
  and related model-registry/UI sources.
- Why it may matter: changes default inference routing and persisted admin settings.
- Verify: model registry defaults, provider ordering, and Workers AI binding expectations.

### 10. Removed/consolidated configurator surfaces

- Commits: `7a1f449e` (Confluence resource grouping), `6d3e744b` and `d18bcb6f`
  (Google Docs/Sheets/Slides picker), `fd624bcd` (Drive picker icons).
- Deleted paths include
  `packages/gatekeeper-confluence/src/configurator/confluence-*-configurator-*.{d.ts,tsx}`,
  `packages/gatekeeper-confluence/src/confluence-configurators.ts`, and
  `packages/gatekeeper-google/src/configurator/google-{doc,sheets,slides}-configurator-*.{d.ts,tsx}`.
- Why it may matter: downstream imports or generated configurator registries may still
  reference the deleted modules.
- Verify: configurator generation, type references, and any external consumers.

### 11. CI and release-workflow changes

- Commits touching `.github/**`: `76765e5e` (CLA skip for maintainers),
  `15786118`, `fe3ce9fc` (preview AI routing), `fa9e17ae` (split root `AGENTS.md`).
- Paths: `.github/dependabot.yml`, `.github/workflows/{bonk-pr,bonk,ci,cla,github-contract,preview,workshop-evals-pr,workshop-evals}.yml`.
- Why it may matter: required checks, CLA behavior, preview deployment, and evaluation jobs
  can differ from the pinned line.
- Verify: branch protection/required checks and release automation expectations.

## Other notable changes (not further assessed)

- `e927f12f` raises the MCP response body cap from 1 MiB to 2 MiB.
- `8343be2f` allows WASM compilation in gadget iframes.
- `3e36b5d3` limits notification device calls to 20 per user per minute.
- `a8fab70f` makes conversation list rows keyboard-operable.
- `cc50e032` also includes git large-file chunking and related storage changes.

## Limits of this inventory

No runtime behavior, security posture, data migration correctness, generated-config
equivalence, or full dependency-resolution compatibility was validated. The 995-path diff
was inventoried by status and filtered by path class; individual hunks were not audited.
Treat the candidates above as review targets rather than confirmed breakages.

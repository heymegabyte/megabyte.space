# megabyte.space — Architecture

> Source reconciliation: fire-290, pinned fork `91a6d443`; deployment.jsonc, scripts/deploy.ts,
> router/src/index.ts and workshop-backend/src/{access,server}.ts. This is a source map,
> not a claim of fresh production verification. Detail owner: root `CLAUDE.md`.
> Neighbors: [`README.md`](./README.md) · [`BACKLOG.md`](./BACKLOG.md).

**Product:** Megabyte OS is the frontier playground at `https://megabyte.space`, absorbing
proven projectsites.dev capabilities into the Cloudflare OS shell. Better Auth gates the
human experience. Cloudflare Access is retained for automation, not human SSO.

## Surfaces and request path

- **Apex:** `megabyte-os` owns `megabyte.space` in `deployment.jsonc`. Its frontend is the
  owned fork's `cloudflare-os/packages/workshop-frontend`; `packages/home` / `megabyte-home`
  is retired and unrouted, retained as a landing-component source.
- **Anonymous HTML navigation:** the router serves an inlined, full-screen login with
  Google/GitHub SSO, magic link and email/password, before SPA boot. `isAnonHtmlNav` checks
  GET, HTML Accept, path exclusions and session-cookie presence. `BA_GATE=0` disables this
  inline gate. Cookie presence selects HTML only; it does not authorize backend data.
- **Authenticated navigation:** the router serves SPA assets. The WebGL landing is an
  authenticated first-run view; the OS shell and absorbed surfaces follow.
- **Auth rail:** `/api/auth/*` is forwarded to the `AUTH` service binding (`megabyte-auth`)
  when `BETTER_AUTH=1`, before the broader `/api` Workshop route. Better Auth uses the
  `megabyte-auth` D1 database. `/signin` stays on the same apex origin.
- **Backend:** `/api` and `/blueprint-screenshot` go to `megabyte-os-backend`. Backend
  Better Auth validation fetches `/api/auth/get-session`, requires verified email and
  enforces `BA_ALLOWED_EMAILS` (configured admins plus the E2E account). Access JWT support
  remains a separate compatibility path: a verified Access JWT email takes precedence and
  bypasses the Better Auth email allowlist. `/api` requires exact-Origin requests while
  accepting anonymous PublicApi RPC connections; authenticated operations enforce identity.
  Blueprint screenshots are served before that RPC identity check. The backend session
  fetch defaults to hardcoded `https://megabyte.space/api/auth/get-session`, not the AUTH
  binding or generated PUBLIC_BASE_URL, so domain/edge-policy changes affect validation.
  Workshop storage uses `users.idFromName(email)`;
  matching identity email, rather than login method, selects the user's Durable Object.
- **Other services:** router gatekeeper paths reach context, scheduler and custom
  gatekeepers; `megabyte-os-errors` receives error reports. The root deploy manages six
  OS Workers; the separate `megabyte-auth` Worker is the bound auth service.
- **Legacy domain:** `os.megabyte.space` is detached from the router. It is not the current
  human entry point. `www` redirects to the apex through the zone ruleset.

```text
megabyte.space → megabyte-os router
  /api/auth/* → AUTH → megabyte-auth → D1
  /api → Workshop → exact-Origin RPC → PublicApi / authenticated operations → user DO
  /blueprint-screenshot → Workshop screenshot handler
  /gatekeeper/* → bound gatekeeper
  anonymous HTML GET → inline login
  session-cookie HTML GET → SPA assets → OS surfaces
```

## Ownership and durable state

- `cloudflare-os` is the owned `heymegabyte/cloudflare-os` fork on `megabyte-os`, with a
  reviewed gitlink. Deliberate fork enhancements and upstream rebases follow the current
  `CLAUDE.md` ownership direction; never blind pointer moves or unpublished fork commits.
- Starter-owned configuration and integrations live in `deployment.jsonc`, `scripts/`,
  `packages/auth`, custom gatekeepers and this canonical home. Generated
  `wrangler.prod.jsonc` files are gitignored; edit the source configuration.
- Absorbed capabilities use D1, DO, R2, Queues and other Cloudflare primitives as needed,
  with durable state and honest sample/live distinctions. New capabilities follow the
  loop's default-OFF flag contract.
- `context.sharingDomain` deliberately still reads `https://os.megabyte.space` in config.
  It scopes persisted Context data; it is not a routed hostname. Changing that scope
  requires a focused compatibility review, not a documentation cleanup.

## Deployment and verification

- `pnpm check` validates config, builds and dry-runs OS Workers. Initialize the pinned
  submodule and install frozen dependencies in both workspaces before these gates.
- Root `pnpm deploy` builds/deploys the six OS Workers and records deployment. Its script
  also commits/pushes the receipt; fleet runs must preserve the outer-runner publication
  contract rather than invoke that publishing tail without adaptation.
- Custom domains are declarative: changing router.route.customDomain detaches the old
  route during deployment. Never change DNS/auth policy merely to reconcile this map.
- `node scripts/check-deploy-state.mjs` compares the gitlink with `.last-deploy.json`;
  a match is recorded-deployment evidence, not a live probe.
- `node scripts/verify-prod.mjs` requires `BA_E2E_EMAIL` and `BA_E2E_PASSWORD`; missing
  credentials exit 2. Use its current assertions and tally, not the historical 6/6 gate
  or an `os.` service-token fetch as a substitute. Production browser journeys must
  authenticate via Better Auth and reconcile UI mutations against durable storage.
- Google SSO's externally registered redirect URI remains tracked in BACKLOG. Correct
  generated callback URLs alone do not prove a real OAuth login or gadget persistence.
- Rollback is per-Worker version plus the reviewed fork pin and deployment receipt.

## Runtime boundaries and routing invariants

- Router assets use `run_worker_first: ["/*", "!/assets/*"]`: HTML navigations reach the
  gate, while hashed assets can bypass it. Browser Accept headers matter when probing.
- Generated OS Worker configs disable workers.dev and preview URLs; only the router
  receives the custom domain. The separately managed auth Worker has its own configuration.
- Zone redirects precede Workers; preserve the existing www and legacy redirect rules.
- Product AI uses the configured `megabyte-space` gateway. Dynamic intent routing is
  documented in `infra/cloudflare/ai-gateway/README.md`; configured catalog providers and
  dynamic route providers are separate concerns. Local development CLI/DeepSeek compute
  never uses Cloudflare AI Gateway.
- Account: `84fa0d1b16ff8086dd958c468ce7fd59`. Auth D1:
  `718b44ef-a33a-4aba-8300-8b70a21dbfd1`. Obtain credentials through the approved broker;
  never copy OAuth credentials or store secrets in architecture/run receipts.

# megabyte.space — Architecture

> Canonical system picture for the loop. Concise map, not a code dump. Detail owner: root
> `CLAUDE.md`. Neighbors: [`./README.md`](./README.md) · [`./BACKLOG.md`](./BACKLOG.md).

**Product:** the Megabyte OS estate — a PUBLIC cinematic front door at the apex + Cloudflare OS
behind Access at `os.megabyte.space`. The estate is the **frontier playground**: it continually
absorbs projectsites.dev capability (Notion-like tables/grids/charts · Airtable-level automation
on SQLite/D1/DO · Coinbase-Pro-density dashboards · integrations) into the OS UI, wrapped in
WebGL + advanced web APIs (WebGPU, Web Audio, WebRTC, View Transitions). **projectsites.dev =
stability; megabyte.space = frontier.**

## Surfaces

- **Homepage** — `packages/home` (React 19 + Vite + Tailwind v4 + Three.js WebGL hero), Worker
  `megabyte-home` → `https://megabyte.space` (+ `www` 301). PUBLIC. `/login` 302s into the OS —
  auth walls never sit on `/`.
- **Cloudflare OS** — [cloudflare/cloudflare-os](https://github.com/cloudflare/cloudflare-os)
  PINNED submodule via the cloudflare-os-starter wrapper → `https://os.megabyte.space`,
  Cloudflare Access-gated. Six Workers: `megabyte-os` (router; owns the os custom domain) +
  `megabyte-os-backend` (Workshop) + `-context` + `-scheduler` + `-custom` (gatekeepers) +
  `-errors`.

## Hot path (visitor request)

```
CF DNS (apex)
  → zone redirect ruleset (www→apex 301 · legacy rules · runs BEFORE Access + Workers)
  → megabyte-home Worker
       ├─ static assets (SPA)   ← assets.run_worker_first: ["/login","/login/","/health"]
       │                           (the asset layer swallows browser navigations otherwise)
       └─ /login → 302 https://os.megabyte.space
            → Cloudflare Access (org manhattan · OTP IdP · WARP zero-touch · 168h sessions)
            → megabyte-os router → backend (Workshop) / context / scheduler / custom / errors
            → AI Gateway `megabyte-os` (Workers AI, keyless) on every model call
```

## Ownership boundary (THE load-bearing decision)

- **Upstream `cloudflare-os` submodule = PINNED, read-only in practice.** Pointer moves only
  via the Upstream Sync lane (every-2-fires), to a REVIEWED ref, with `pnpm check` + deploy +
  6/6 in the same fire.
- **Starter-owned layers (where ALL enhancements land):** `deployment.jsonc` (single config
  source) · router worker `megabyte-os` · `packages/home` · custom gatekeepers
  (`megabyte-os-custom`) · `/admin` branding · `scripts/` · this loop home.
- Needs upstream internals → carefully-rebased overlay patch or an upstream PR. NEVER blind
  in-tree submodule edits; NEVER commit a pointer move outside the lane. The adversarial
  reviewer checks the pointer + in-tree submodule diffs every fire (#1 drift class).
- **Absorbed features provision CF-native as needed** — D1 · Durable Objects · Queues ·
  Workflows · R2 · Vectorize · Browser Rendering — durable, scale-to-zero, provisioned via API
  (never dashboard-hand-created), flag-gated default-OFF.

## Deploy topology

- `pnpm check` — validate `deployment.jsonc` + dry-run every OS Worker (the pre-deploy gate).
- `pnpm deploy` (root) — build + deploy the six OS Workers. `pnpm --dir packages/home deploy` —
  build + deploy the homepage (independent).
- `wrangler.prod.jsonc` files are GENERATED + gitignored — edit `deployment.jsonc` only.
- Custom domains are DECLARATIVE — changing `customDomain` in `deployment.jsonc` detaches the
  old hostname on the next `pnpm deploy` (that's how the apex was freed for `megabyte-home`).
  Verify hostnames after any routing change.
- Auth: the scoped `CLOUDFLARE_API_TOKEN` LACKS Workers scopes (code 10000) →
  `unset CLOUDFLARE_API_TOKEN; export CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY)
  CLOUDFLARE_EMAIL=blzalewski@gmail.com CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59`.
- Post-deploy: `node scripts/verify-prod.mjs` (**6/6**) + Playwright real-browser on the apex +
  service-token fetch of the OS. Local green is never "done". Prod deploys are
  standing-authorized.

## Resource ownership + IDs

- **Account** — `84fa0d1b16ff8086dd958c468ce7fd59`
- **Access app "Megabyte OS"** — org `manhattan.cloudflareaccess.com` · app
  `5a2a663c-e849-49ff-9a7c-95b3a741c6f7` · AUD `b455c445…e8fa` · OTP-only IdP (dead Authentik
  hidden) · `auto_redirect_to_identity` on · sessions 168h · `allow_authenticate_via_warp` on ·
  admins `hey@megabyte.space` + `blzalewski@gmail.com`.
- **E2E service token** — `megabyte-os-e2e` · client id
  `e276fb6a924b2419a3f216c9eb131291.access` (secret via `get-secret`; rotate via the Access API
  if lost). Pass as `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` to `verify-prod.mjs` +
  Playwright `extraHTTPHeaders`.
- **AI Gateway** — `megabyte-os` (Workers AI, keyless). Add providers in `deployment.jsonc` +
  gateway-stored keys.

## Invariants + gotchas

- **`run_worker_first` is load-bearing:** browser navigations (`Accept: text/html`) hit the
  asset layer before the worker — `/login`, `/login/`, `/health` MUST stay listed;
  `verify-prod.mjs` sends browser headers on that assertion as the standing regression test.
- **Fresh-hostname negative-DNS cache:** local resolvers cache ENOTFOUND while the edge is live
  → `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`, or cross-check
  `dig @1.1.1.1` + `curl --resolve`.
- **Zone redirect rules run BEFORE Access + Workers** — a redirect can bypass/mask a gate;
  verify gates after any ruleset change; keep the pre-existing rules (`/source.sh`,
  `public.megabyte.space/github-awesome.json`) + the `www → apex` 301.
- **Rollback:** `wrangler rollback <version-id>` per worker; homepage deploys independently of
  the OS; the submodule pin is the OS-wide rollback point (recorded in `LEDGER.md`).
- Estate path (the priority journey): apex WebGL homepage → `/login` 302 → Access gate → OS
  shell → absorbed surfaces. Guard it every fire.

# megabyte.space — Megabyte OS estate

Two surfaces in one repo:

- **`https://megabyte.space`** — PUBLIC cinematic homepage (`packages/home`: React 19 + Vite + Tailwind v4 + Three.js WebGL hero, worker `megabyte-home`). `/login` 302s into the OS. Auth walls never sit on `/` (per `public-front-door` rule).
- **`https://os.megabyte.space`** — [cloudflare/cloudflare-os](https://github.com/cloudflare/cloudflare-os) (pinned submodule) via the [cloudflare-os-starter](https://github.com/cloudflare/cloudflare-os-starter) wrapper, Cloudflare Access-gated. Six Workers: `megabyte-os` (router, owns the os custom domain) + `megabyte-os-backend` (Workshop) + `-context` + `-scheduler` + `-custom` + `-errors`.

## Commands

- `pnpm check` — validate `deployment.jsonc` + dry-run every OS Worker
- `pnpm deploy` — build + deploy the six OS Workers (root)
- `pnpm --dir packages/home deploy` — build + deploy the public homepage
- `node scripts/verify-prod.mjs` — 5 prod assertions (public apex, /login funnel, Access gate, service-token shell, www)

## Auth

- Wrangler: the scoped `CLOUDFLARE_API_TOKEN` from `get-secret` LACKS Workers scopes (code 10000). Use the global-key fallback: `unset CLOUDFLARE_API_TOKEN; export CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) CLOUDFLARE_EMAIL=blzalewski@gmail.com CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59`.
- Sign-in to the OS: Cloudflare Access app "Megabyte OS" (org `manhattan.cloudflareaccess.com`, app `5a2a663c-e849-49ff-9a7c-95b3a741c6f7`, AUD `b455c445…e8fa`). OTP-only IdP (dead Authentik hidden), `auto_redirect_to_identity` on, sessions 168h, `allow_authenticate_via_warp` on (zero-touch once Brian's WARP client enrolls in the `manhattan` org). Admins: hey@megabyte.space + blzalewski@gmail.com.
- E2E service token `megabyte-os-e2e` (client id `e276fb6a924b2419a3f216c9eb131291.access`) — pass `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` to `verify-prod.mjs`; rotate via the Access API if lost.

## Gotchas

- **SPA asset fallback swallows browser navigations before the worker runs.** `megabyte-home`'s `/login` 302 worked under curl (`Accept: */*` → worker) but browsers (`Accept: text/html`) got index.html from the asset layer. Fix: `assets.run_worker_first: ["/login", "/login/", "/health"]`. `verify-prod.mjs` sends browser headers on that assertion as the regression test.
- Fresh-hostname negative-DNS cache: after querying a not-yet-bound hostname, local resolvers cache ENOTFOUND while the edge is live. `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`, or cross-check `dig @1.1.1.1` + `curl --resolve`.
- Wrangler manages the router's custom domains DECLARATIVELY — changing `customDomain` in `deployment.jsonc` detaches the old hostname on the next `pnpm deploy` (that's how the apex was freed for `megabyte-home`).
- `wrangler.prod.jsonc` files are GENERATED and gitignored — edit `deployment.jsonc` only.
- Zone redirect ruleset keeps pre-existing rules (`/source.sh`, `public.megabyte.space/github-awesome.json`) + our `www → apex` 301. Redirects run before Access + Workers.
- AI models flow through AI Gateway `megabyte-os` (Workers AI, keyless). Add providers in `deployment.jsonc` + gateway-stored keys.

## Upgrades

Bump the `cloudflare-os` submodule to a reviewed upstream release → `pnpm check` → `pnpm deploy`. Homepage deploys independently.

## Mission (2026-09-29 →)

- megabyte.space is the ADVANCED PLAYGROUND: rapid AI-driven UI evolution on the Cloudflare OS shell; projectsites.dev stays the stability anchor. Continually absorb its capabilities (93 inventoried) into perfectly-placed, minimal Cloudflare OS UI.
- Steering: `.claude/run-the-loop/ULTIMATE-REQUIREMENTS.md` (distilled 364KB doc) + `PROJECTSITES-ABSORPTION.md` + `BACKLOG.md`. Loop: `/run-the-loop` (ported, project command wins). Upstream `cloudflare-os` submodule stays PINNED — enhance starter-owned layers only.
- Beautify-10x: every surface created → 10 "more gorgeous" passes + more on revisit; state in `.claude/modifier-matrix.json` (per gorgeous-by-default § Beautify-10x).

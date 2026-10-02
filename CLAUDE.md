# megabyte.space — Megabyte OS estate

Two surfaces in one repo. **DIRECTION (Brian, 2026-10-01; REFINED 2026-10-02): Cloudflare OS moves to the APEX `megabyte.space`, and the WebGL homepage becomes a COMPONENT INSIDE the OS frontend** — a FORK we own becomes the base UI, and the homepage is the first-view component shown after auth, dismissible ("Enter the OS") + persisted once. This supersedes the earlier wrapper-worker overlay idea (the homepage lives in `cloudflare-os/packages/workshop-frontend`, not a worker in front) and DELIBERATELY OVERRIDES `public-front-door` for this estate. Migration = `BACKLOG.md` WS-11 (Steps 1-6) + rollback runbook `docs/ws-11-rollback.md`; until it lands, the surfaces below are the LIVE (transitional) topology.

- **`https://megabyte.space`** — TODAY: PUBLIC cinematic homepage (`packages/home`: React 19 + Vite + Tailwind v4 + Three.js WebGL hero, worker `megabyte-home`); `/login` 302s into the OS. TARGET (WS-11): the OS at the apex; the WebGL homepage is a **`LandingHomepage` component in the forked OS frontend** (`workshop-frontend`), gated in `routes/__root.tsx` `AuthenticatedShell` before the onboarding check via a `megabyteOS_entered` localStorage flag — shown first, "Enter the OS" (or Esc/Skip) dismisses, once. ✅ BUILT + LIVE on os.megabyte.space (fire-26: render + dismiss + persist verified in a real browser via `scripts/verify-os-landing.mjs`). REMAINING = the Brian-gated domain move (os→apex router `customDomain`) + adding `megabyte.space` to the Access app. `packages/home` stays the component SOURCE until the flip, then retired.
- **`https://os.megabyte.space`** — our FORK [heymegabyte/cloudflare-os](https://github.com/heymegabyte/cloudflare-os) @ branch `megabyte-os` (the owned base UI; `upstream` = cloudflare/cloudflare-os) via the [cloudflare-os-starter](https://github.com/cloudflare/cloudflare-os-starter) wrapper, Cloudflare Access-gated. The `LandingHomepage` WebGL splash is LIVE here (first-view, dismissible). Six Workers: `megabyte-os` (router, owns the os custom domain — WS-11 re-points it to the apex) + `megabyte-os-backend` (Workshop) + `-context` + `-scheduler` + `-custom` + `-errors`. Post-WS-11: retained as a legacy alias / 301 → apex.

## Commands

- `pnpm check` — validate `deployment.jsonc` + dry-run every OS Worker
- `pnpm deploy` — build + deploy the six OS Workers (root)
- `pnpm --dir packages/home deploy` — build + deploy the public homepage
- `node scripts/verify-prod.mjs` — 8 prod assertions (apex public homepage, /login funnel, Access gate, service-token shell, og image, www, security headers incl. exact CSP, analytics live endpoint). The deploy gate is ALL-GREEN (script prints N/N).

## Auth

- **DIRECTION (Brian 2026-10-01): Better Auth = app identity (Google SSO + GitHub SSO + email magic link from day one); Access stays as a thin EDGE gate** (service tokens + WARP intact; stock Access page never human-facing) — staged per `BACKLOG.md` WS-8. Until cutover, everything below remains the LIVE gate.
- Wrangler: the scoped `CLOUDFLARE_API_TOKEN` from `get-secret` LACKS Workers scopes (code 10000). Use the global-key fallback: `unset CLOUDFLARE_API_TOKEN; export CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) CLOUDFLARE_EMAIL=blzalewski@gmail.com CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59`.
- Sign-in to the OS: Cloudflare Access app "Megabyte OS" (org `manhattan.cloudflareaccess.com`, app `5a2a663c-e849-49ff-9a7c-95b3a741c6f7`, AUD `b455c445…e8fa`). OTP-only IdP (dead Authentik hidden), `auto_redirect_to_identity` on, sessions 168h, `allow_authenticate_via_warp` on (zero-touch once Brian's WARP client enrolls in the `manhattan` org). Admins: hey@megabyte.space + blzalewski@gmail.com.
- E2E service token `megabyte-os-e2e` (client id `e276fb6a924b2419a3f216c9eb131291.access`) — pass `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` to `verify-prod.mjs`; rotate via the Access API if lost.

## Gotchas

- **The asset layer serves matching paths WITHOUT invoking the worker** — twice-bitten class. First `/login`'s 302 (browsers got index.html while curl flattered the worker), then the apex itself: `/` was asset-served so the worker's security headers NEVER reached real visitors (looked like "Permissions-Policy stripped"). Fix: `assets.run_worker_first: ["/*", "!/assets/*"]` — the worker always runs except for hashed assets. `verify-prod.mjs` guards both (browser-header /login assertion + exact-CSP header assertion).
- Fresh-hostname negative-DNS cache: after querying a not-yet-bound hostname, local resolvers cache ENOTFOUND while the edge is live. `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`, or cross-check `dig @1.1.1.1` + `curl --resolve`.
- Wrangler manages the router's custom domains DECLARATIVELY — changing `customDomain` in `deployment.jsonc` detaches the old hostname on the next `pnpm deploy` (that's how the apex was freed for `megabyte-home`).
- `wrangler.prod.jsonc` files are GENERATED and gitignored — edit `deployment.jsonc` only.
- Zone redirect ruleset keeps pre-existing rules (`/source.sh`, `public.megabyte.space/github-awesome.json`) + our `www → apex` 301. Redirects run before Access + Workers.
- AI models flow through AI Gateway `megabyte-os` (Workers AI, keyless). Add providers in `deployment.jsonc` + gateway-stored keys.

## Upgrades

The `cloudflare-os` submodule is now OUR FORK (`heymegabyte/cloudflare-os` @ `megabyte-os`; `upstream` remote = cloudflare/cloudflare-os). To take an upstream release: `git -C cloudflare-os fetch upstream`, rebase/merge `megabyte-os` onto the reviewed ref (keep our `workshop-frontend` landing edits), `git push origin megabyte-os`, bump the gitlink in this repo → `pnpm check` → `pnpm deploy`. Homepage (`packages/home`) deploys independently until WS-11 retires it.

## Mission (2026-09-29 →)

- megabyte.space is the ADVANCED PLAYGROUND: rapid AI-driven UI evolution on the Cloudflare OS shell; projectsites.dev stays the stability anchor. Continually absorb its capabilities (93 inventoried) into perfectly-placed, minimal Cloudflare OS UI.
- Steering: `.claude/run-the-loop/ULTIMATE-REQUIREMENTS.md` (distilled 364KB doc) + `PROJECTSITES-ABSORPTION.md` + `BACKLOG.md`. Loop: `/run-the-loop` (ported, project command wins). The OS frontend is now OUR FORK (`heymegabyte/cloudflare-os` @ `megabyte-os`) = the owned base UI (WS-11, Brian-directed — supersedes "submodule stays pinned" for the frontend; rebase upstream deliberately). Enhance the fork's `workshop-frontend` + starter-owned layers.
- Beautify-10x: every surface created → 10 "more gorgeous" passes + more on revisit; state in `.claude/modifier-matrix.json` (per gorgeous-by-default § Beautify-10x).

# WS-11 — OS-to-apex migration: flip + rollback runbook

**Goal (Brian 2026-10-01):** serve Cloudflare OS at the apex `megabyte.space`; the WebGL homepage
becomes a first-run dismissible intro layer (shown once, "Enter" dismisses, suppressed on return).
This is a **one-way-door** (domain + Access host) — never run it without this runbook open. The
reversal steps below are rehearsed BEFORE the flip.

## Pre-flip baseline (recorded fire-8, `pnpm check` green)

- Router `megabyte-os` `customDomain` = **`os.megabyte.space`**; `publicBaseUrl: null` → derives to
  `https://os.megabyte.space` (confirmed in the dry-run: `env.PUBLIC_BASE_URL`).
- Access AUD = `b455c445ec6c8b874f840bfa16d27a1a293eac851e416f50c2e582495151e8fa`, issuer
  `https://manhattan.cloudflareaccess.com`, admins `hey@megabyte.space` + `blzalewski@gmail.com`.
- Apex `megabyte.space` owned by worker **`megabyte-home`** (custom domain, `packages/home/wrangler.jsonc`).
- `context.sharingDomain: null` → Context boundary currently = `https://os.megabyte.space`.
- Overlay code shipped DARK (fire-7, `VITE_FIRST_RUN_OVERLAY` default-OFF). Submodule pin `6478a144`.
- **Record for rollback before touching anything:** `wrangler deployments list --name megabyte-os`
  and `--name megabyte-home` (capture the current version IDs); screenshot the Access app config.

## Decision — Context boundary (do this check FIRST at flip time)

Changing `customDomain` moves `publicBaseUrl` → `https://megabyte.space`, and a `null`
`sharingDomain` derives from it, so the Context boundary MOVES and existing collections hide.

1. Check if any Context data exists (fire-5 saw "No workspaces yet" → likely empty): inspect via the
   OS backend / `/admin`, or the context KV namespace. 
2. **Empty →** leave `sharingDomain: null` (it derives cleanly to `https://megabyte.space`; the
   boundary then matches the real hostname — preferred end-state).
3. **Non-empty →** pin `context.sharingDomain: "https://os.megabyte.space"` in the SAME deploy as the
   `customDomain` change, so the boundary (and the data) stay put.

## Architecture decision — overlay must be a WRAPPER worker (the router is upstream)

The `megabyte-os` router serves the OS frontend from the pinned submodule — the overlay CANNOT be
patched into it. At the apex, a **wrapper worker owns `megabyte.space`** and:

- first-run navigation (no `megabyteOS_entered` cookie) → serve the WebGL overlay (reuse the
  `packages/home` build / fold `megabyte-home` into it) with the "Enter" button that sets the cookie;
- otherwise → `fetch()` through to the OS router over a **service binding** (so Access still runs at
  the edge on the apex, before the wrapper).

Implication: the router stops owning a public `customDomain` for the apex (use a service binding or an
internal route); the wrapper owns `megabyte.space`. This is Slice-4 design work — resolve it there.

## Flip procedure (ordered; the Access step is 🔑 Brian-gated)

1. **Build/deploy the overlay wrapper worker** bound to the OS router; verify on a `workers.dev` URL
   (first-run overlay → Enter → OS; return → OS). (Slice 1 behavior is done; this is the packaging.)
2. **Free the apex:** remove `megabyte-home`'s custom domain (edit `packages/home/wrangler.jsonc` —
   drop the `megabyte.space` route, or delete the custom domain via API) so `megabyte.space` is
   unclaimed. Keep `megabyte-home` deployed on `workers.dev` as the overlay source if reused.
3. **🔑 Access host (Brian-gated):** add `megabyte.space` to the self-hosted Access app covering the
   apex (same app re-pointed/extended; preserve the AUD if possible — if it changes, update
   `deployment.jsonc` `access.audience`). This is the one genuinely gated step.
4. **Point the apex at the OS:** in `deployment.jsonc`, set the apex owner (wrapper worker or the
   router) `customDomain` → `megabyte.space`; apply the `sharingDomain` decision above.
5. `pnpm check` → fix any config drift → `pnpm deploy` (6 OS workers + wrapper).
6. **Keep `os.megabyte.space`:** add a zone redirect rule `os.megabyte.space/* → https://megabyte.space/$1`
   (301) so old links resolve.
7. **Purge** the zone cache (fire-4 lesson: deploys pair with a purge or headers serve stale).
8. **Rewrite `scripts/verify-prod.mjs`** for the new topology: apex = Access-gated OS + first-run
   overlay (anonymous → Access → overlay once → OS); `os.` → 301 apex; service-token still reaches
   the shell. Run it all-green + a real-browser pass.

## Rollback (rehearse these BEFORE step 3)

- **Config revert:** `deployment.jsonc` router `customDomain` → `os.megabyte.space`; `sharingDomain`
  → `null`; `pnpm deploy`. Wrangler re-attaches `os.megabyte.space`, detaches the apex.
- **Re-attach the homepage:** restore `megabyte.space` in `packages/home/wrangler.jsonc`;
  `pnpm --dir packages/home deploy` → apex is the public WebGL homepage again.
- **Access:** remove `megabyte.space` from the Access app (restore the prior os-only scope).
- **Worker-version revert (fast path):** `wrangler rollback --name megabyte-os <pre-flip-version-id>`
  (and `megabyte-home`) when bindings are unchanged.
- **Verify:** `node scripts/verify-prod.mjs` (restore the pre-flip assertions) all-green +
  `node scripts/verify-browser.mjs https://megabyte.space/` (public homepage, 0 OUR console errors).
- Flush local DNS if a fresh-hostname negative cache bites (`sudo dscacheutil -flushcache`).

## Invariants (unchanged by the flip)

- `cloudflare-os` submodule stays pinned (`6478a144`) — overlay is wrapper-owned, never a submodule patch.
- `run_worker_first` + the full security-header set stay on every apex response.
- Better Auth (WS-8) is the eventual human identity; Access stays the edge gate through this migration.

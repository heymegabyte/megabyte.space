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

---

## ⚠️ CORRECTED flip procedure (2026-10-03 direction — NO Access on the apex, BA_GATE is the gate)

The procedure ABOVE is SUPERSEDED. It assumed (a) a WRAPPER worker owns the apex + serves the overlay,
and (b) Cloudflare Access stays the edge gate (add megabyte.space to the Access app). BOTH are now wrong
per Brian's 2026-10-02/03 direction + `CLAUDE.md`: the homepage is a **`LandingHomepage` COMPONENT inside
the OS frontend** (fire-26, no wrapper worker), and **Access is REMOVED from the human path** — the apex
is gated by our **Better Auth `BA_GATE`** (anonymous HTML nav → our `/signin`; GitHub/Google SSO), NOT Access.

**Prerequisites — ALL DONE (so the flip is now a clean re-point):**
- auth-rail-forward: the `megabyte-os` router forwards `/api/auth/*` → the `AUTH` (megabyte-auth) binding, `BETTER_AUTH=1` (fire-61; verified `os./api/auth/ok` 200).
- `/signin` served by the OS router + `__root.tsx` standalone + `BA_GATE` exempts `/signin`/`/signup` (fire-62).
- homepage = `LandingHomepage` first-view component in the OS frontend (fire-26).

**Corrected flip sequence (one focused fire; reversible at each step; rollback staged FIRST):**
1. **Context boundary:** confirm Context is empty (playground; fire-5 saw "No workspaces yet"). Empty → leave
   `context.sharingDomain: null` (derives cleanly to `https://megabyte.space`). If NON-empty → pin
   `sharingDomain: "https://os.megabyte.space"` in the SAME deploy.
2. **Record rollback:** `wrangler deployments list --name megabyte-os` + `--name megabyte-home` (version IDs).
3. **Free the apex:** drop the `megabyte.space` customDomain route in `packages/home/wrangler.jsonc` (keep
   `workers_dev: true` → megabyte-home stays live on workers.dev as the rollback origin) → `pnpm --dir packages/home deploy`.
4. **Re-point the OS router:** `deployment.jsonc` `workers.router.route.customDomain` `os.megabyte.space` →
   `megabyte.space` (apply the sharingDomain decision) → `pnpm check` → `pnpm deploy`. Wrangler detaches os.,
   attaches the apex. (NO Access step — the apex has no Access app; `BA_GATE` is the gate.)
5. **Verification shifts to a Better Auth SESSION** (the Access service token no longer works at the apex —
   there's no Access app there). Rewrite `verify-prod.mjs`/`verify-os.mjs` for the no-Access topology:
   anonymous apex HTML nav → `/signin` (our BA, NOT cloudflareaccess.com); allowlisted BA sign-in → `.megabyte.space`
   cookie → apex → OS shell; `/api/auth/ok` 200; the WebGL `LandingHomepage` first-view renders post-auth.
   Use `scripts/verify-ba-flip.mjs` as the base (already BA-session-based).
6. **Keep os.:** add a zone redirect `os.megabyte.space/* → https://megabyte.space/$1` (301). The os. Access
   app can be deleted/relaxed once os. is a pure redirect (no longer serves the OS).
7. **Purge** the zone cache. Real-browser pass (a human browser passes the CF bot-challenge that blocks curl/headless).
8. ⚠️ **bot-fight-mode:** ensure the apex doesn't serve the aggressive `cf-mitigated: challenge` on `/signin`
   that os. does (fire-62 finding) — tune bot-fight-mode / add a managed-challenge exception so anonymous is friction-free.

**Rollback (unchanged in spirit):** `deployment.jsonc` router customDomain → `os.megabyte.space` + `sharingDomain`
→ null + `pnpm deploy`; restore `megabyte.space` in `packages/home/wrangler.jsonc` + `pnpm --dir packages/home deploy`;
remove the os.→apex redirect; `wrangler rollback` both workers to the recorded pre-flip version IDs; flush local DNS.

**Note:** the clean ANONYMOUS-PREVIEW end-state (megabyte.space loads the OS shell WITHOUT an immediate /signin)
additionally needs P2 (BA-4a backend anonymous PublicApi + BA-4b frontend anonymous-aware + `BA_GATE` → pass-through).
This flip with `BA_GATE=1` delivers "megabyte.space loads the OS → /signin → SSO → OS" (Brian's "then shuttled to
SSO"); the anonymous preview is the subsequent P2 step ("then fix it for a basic preview").

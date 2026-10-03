# ADR 0001 — Auth-on-action with Better Auth (anonymous OS UI, SSO only on submit)

- **Status:** Accepted — Brian-directed 2026-10-02. **FLIP AUTHORIZED — Brian 2026-10-03** ("will the
  loop do the flip?" + the standing full-permission directive). BA-5 is NO LONGER Brian-gated: the loop
  executes the flip (BA-3 → BA-4 → BA-5) autonomously + carefully, reversible, never pausing to ask.
- **Type:** one-way door (relaxing the Access gate re-exposes the OS; sequence it carefully).
- **Progress:** BA-3 ✅ DONE (fire-50, fork ab536d4b) — the OS backend accepts a Better Auth session
  (dual-accept), deployed, Access path verified unbroken (verify-os 3/3). NEXT: BA-4 (anonymous UI +
  auth-on-action in `workshop-frontend`) → then the relax/flip + verify + rollback-ready.
- **Supersedes:** the "Access stays as the edge gate / stock Access page never human-facing" framing in
  `CLAUDE.md § Auth` and WS-8's original "Access remains a thin outer edge gate." Access is now removed
  from the HUMAN path entirely (service-token/WARP automation paths may remain until WS-8.4 replaces them).

## Context

- Today: `megabyte.space` = public WebGL homepage; **"Log in" 302s to `os.megabyte.space`**, which renders
  the **Cloudflare Access login page** (OTP/WARP). The OS (fork `workshop-frontend`) only renders AFTER
  Access authenticates; its identity comes from a **capnweb RPC** (`AuthenticatedApi` stub, `AuthContext.tsx`)
  that today trusts the Access JWT / service token.
- Brian's directive (verbatim): *"Make it so you can log in without using Access and then only when you try
  to submit a prompt, then it will try to make you sign in, and it should use Better Auth, baked into
  megabyte.space, without any other domains being involved. … take you directly to the UI and only prompt
  for SSO … if you submit on a form."*

## Decision

1. **Better Auth is THE human identity layer**, D1-backed (`megabyte-auth`, id `718b44ef-a33a-4aba-8300-8b70a21dbfd1`),
   mounted at **`https://megabyte.space/api/auth/*`** — **ON THE APEX DOMAIN ONLY**. No `os.` Access page, no
   `cloudflareaccess.com` in the human flow. Callbacks are `https://megabyte.space/api/auth/callback/*`.
2. **The OS UI loads ANONYMOUSLY.** Clicking "Log in" / "Enter the OS" takes the visitor straight to the OS
   interface — no auth wall first.
3. **Auth-on-action.** Sign-in (magic-link first; Google + GitHub SSO once creds exist) is prompted ONLY when
   the user performs a protected action — **submitting a prompt** (the first authenticated RPC call), or any
   form that writes. Browsing the UI is free.
4. **Day-1 method = email magic-link via SES** (the estate's email rail) — needs NO OAuth creds. SSO
   (Google/GitHub) is added when their OAuth apps are provisioned (callbacks above).

## The safe ordered sequence (minimizes the one-way door)

Relaxing Access BEFORE the backend is protected would expose the OS RPC to anonymous users — so the order is
fixed:

1. **BA-1 — Better Auth v0 dark:** `megabyte-auth` D1 + Better Auth server at `/api/auth/*` + session cookie +
   magic-link (SES). Flag-gated (`better_auth`, default-OFF), ZERO Access change. Verify endpoints respond.
2. **BA-2 — our black/cyan login surface** on `megabyte.space` (Kumo + theme; magic-link field + provider
   buttons), flag-gated dark beside the current `/login` 302. Vision ≥9, axe clean, reduced-motion safe.
3. **BA-3 — backend dual-accept:** the OS backend RPC validates a **Better Auth session OR** the Access JWT
   (migration window). Service-token E2E + a real BA-session E2E both green.
4. **BA-4 — anonymous UI + auth-on-action in the fork:** `workshop-frontend` renders unauthenticated; the
   first protected RPC (prompt submit) triggers the BA sign-in modal/redirect, then resumes the action.
5. **BA-5 — ONE-WAY DOOR (Brian-gated execution point):** relax Access so the OS UI loads anonymously (keep
   service-token/WARP for automation). Only after BA-3 proves the backend is BA-protected. Rollback = re-assert
   the Access policy + flip `better_auth` off.
6. **BA-6 — cut over:** apex "Log in"/"Enter" → the OS UI directly (no 302 to an Access page); remove the
   human Access front-door; SSO providers live; `verify-prod` rewritten for the new topology.

## Risks + rollback

- **Exposing the OS backend** if Access is relaxed before BA-3 — MITIGATED by the fixed sequence (BA-5 only
  after BA-3 green).
- **Reversibility:** BA-1→BA-4 are all dark/flag-gated + fully reversible. BA-5 (Access relax) is the
  one-way-ish step; rollback = re-assert the Access application policy (documented in `docs/ws-11-rollback.md`)
  + `better_auth` flag off. A dual-accept window (BA-3) means no hard cutover.
- **Confidence: 0.8** — the sequence is sound; the main unknown is the fork's capnweb RPC ↔ Better Auth
  session wiring (BA-3/BA-4), which is why those land before any Access change.

## Prerequisites provisioned (fire-44)

- D1 `megabyte-auth` (`718b44ef-a33a-4aba-8300-8b70a21dbfd1`, ENAM). `BETTER_AUTH_SECRET` → `get-secret`.
- Still needed: Google + GitHub OAuth apps (callbacks `https://megabyte.space/api/auth/callback/{google,github}`)
  — magic-link works without them, so NOT a blocker for BA-1/BA-2.

## Discovery (fire-48): BA-3 → BA-4 → BA-5 are ONE coordinated flip, not three independent slices

While scoping BA-3 (the OS backend `workshop-backend/src/access.ts` verifies the `cf-access-jwt-assertion`
header + JWKS; `server.ts:844` then uses `payload.email`), a hard dependency surfaced:

- **Nothing reaches the OS backend without first passing the Cloudflare Access EDGE gate.** So EVERY
  request that reaches the backend today already carries an Access JWT — the Better-Auth-session path
  (BA-3) is **unreachable / un-E2E-testable while Access gates the edge**. The same is true for BA-4:
  the OS frontend can't render anonymously while Access blocks `os.megabyte.space`.
- Therefore **BA-3 (backend dual-accept) + BA-4 (anonymous UI + auth-on-action) only ACTIVATE once
  Access is relaxed / the OS moves to the anonymous apex (BA-5).** They are a single coordinated change,
  gated on the flip — not three slices that land one-per-fire.
- **Cross-subdomain cookies are therefore throwaway:** the clean end-state is the OS AT `megabyte.space`
  (same-origin with the auth rail), so the BA session cookie is same-origin — no `.megabyte.space`
  cookie-domain hack needed. Don't build it.
- **The flip IS the Brian-gated one-way-door (BA-5).** It: detaches `megabyte-home` from the apex →
  points the `megabyte-os` router at `megabyte.space` → serves the OS anonymously (Access NOT applied to
  the apex) → relies on BA-3 (backend accepts the BA session) + BA-4 (UI prompts sign-in on submit) being
  deployed. It changes the LIVE apex fundamentally; reversible by re-pointing the workers, but disruptive
  (cert/DNS, OS `publicBaseUrl` derives from the domain — pin `context.sharingDomain` first per WS-11).

**Revised remaining plan:** BA-1 ✅ · BA-2 ✅ · BA-1b ✅ are the done, shippable, dark pieces on
`megabyte.space`. BA-3 + BA-4 + BA-5 are a **single coordinated flip fire** (best fresh-budget, with
rollback staged + ideally Brian's go on the live-apex change). Until then the auth rail + login are
complete + verified at `/signin`; the only thing missing is flipping the OS onto them.

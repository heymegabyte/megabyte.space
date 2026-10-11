# Fire-309 independent upstream source review

Reviewed exact official Git range `33a5b70cc45e210b9aada8b5a1d61013528f4e5f` (resolve full SHA in upstream-evidence.json) → `54d4685d27fc7a1ba58b4ff1e1842ebf4701d0b7`, fetched directly from cloudflare/cloudflare-os. One commit: install-local native app session handoff (#712), 27 paths, 1,574 additions / 45 deletions. Full uncapped path inventory is adjacent. Declared fork bootstrap succeeded at unchanged `9904d808`; no source URL or pin substitution. This independent pass precedes reading Claude's conclusions.

## Source contracts

- No dependency manifest, lockfile, workspace declaration or explicit Wrangler migration changes in this range. Vite adds `/api/device-session/callback` proxy; backend server routes that path before RPC. Candidate router delivery still needs eval proof. Existing adapter/catalog closure debt remains.
- Browser requires an explicit confirmation and current-API `whoami` identity before staging. Bounded state plus canonical P-256 key feed ECDH/HKDF-SHA256/AES-GCM with state as AAD. Backend returns a routing DO id and random ticket, keeping credential envelope server-side until callback. Ticket hashes are stored rather than tickets.
- Callback checks same-origin top-level POST metadata, duplicate fields, bounded handles and (Access configuration enabled) a freshly verified Access identity owning the target DO; fixed HTTPS native-app callback, no-store/no-referrer. Headers alone are not authentication outside Access mode; possession of a random ticket is the redemption authority.
- User storage gains pending transfers and optional session expiry/pending fields. Workshop device credentials are inactive until consumption, expire in 30 days; legacy sessions lacking expiry remain unchanged. Two-minute transfer expiry and alarm cleanup are independent. Access handoff retains original JWT and its policy expiry; no refresh is added.
- Native bridge v1 calls loginReady only for a confirmed current connection, adds Back to installs, and reuses notification bridge with legacy notification fallback. AuthContext retries whoami with bounded delays and retains last identity during reconnect; only isCurrentUserConfirmed denotes current connection authority.

## Acceptance risks, not observed production defects

1. **Concurrency proof is missing.** `consumeDeviceSessionHandoff` reads pending state then awaits the ticket hash before deletion; stage similarly reads existing state then awaits crypto before storing/reissuing. Upstream lifecycle tests exercise sequential operations only. Require deterministic concurrent consume/consume, stage/stage and stage/consume schedules in a real Worker/DO test; exactly one redemption and no orphan usable sessions must hold. Do not assume DO input gates cover arbitrary crypto awaits or claim an exploit without runtime reproduction.
2. **Expiry on an already-authenticated RPC capability needs proof.** New session expiry is checked in `UserDurableObject.authenticate` and swept from storage. Show whether a previously issued AuthenticatedApi can continue protected calls after expiry/deletion; alarm deletion alone is not evidence of per-call revocation. Also verify staging Access expiry and callback-expiry ordering, including original JWT exp before transfer TTL.
3. **Native boundary remains external.** Claimed-app-link association, state verification, private key handling, transfer-deadline validation, JWT/Workshop credential validation, secure storage, Access binding-cookie persistence and absent-app fallback need the actual native client and device/browser journey. Repository tests cannot prove those properties.
4. Verify auth-page/signup/OAuth navigation preserves only validated attempt parameters; reconnect identity change does not authorize the prior account; rejected identity never stages. Prove callback delivery through candidate router/Access policy and direct backend wrong-owner rejection in eval.
5. Optional notification registration must remain one-use across RPC reconnect and failures; upstream tests add reconnect cases, but mounted/native lifecycle needs end-to-end verification.

## Verification and decision

Source review only; upstream fixtures inspected, not executed. No candidate checkout/install/build, authenticated/native journey, production deploy or visual score credited. `check-deploy-state --json` reports fork/receipt drift (`9904d808` versus `80b7209e`, receipt dated 2026-10-09T21:05:20.999Z); this is ledger comparison, not proof of the actual deployed SHA. Receipt was not restamped. Candidate selection and migration acceptance stay open. Current-pin source gate regression run: 20/20 tests passed, which proves the wrapper's source verifier only.

## Recovery

Seven failed local receipts inspected. Six retained result commits are ancestors of origin/main. `8770b90e` is not, but its implementation was integrated as published `4884a465` (identical stable patch-id `e2e7f3e2b6b28354bd6b62b94e262be93adda5b3`) and subsequent fixtures/bookkeeping supersede its discovery; retained tree is clean. Do not cherry-pick duplicate work or mutate retained trees. Prior latest successes `3fe436a9` and `3b1ad78e` are published ancestors, confirmed against fetched origin/main.

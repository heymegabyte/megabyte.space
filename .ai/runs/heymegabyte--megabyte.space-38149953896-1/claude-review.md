# Claude independent review — upstream #712 "install-local native app session handoff"

- Range: `33a5b70c..54d4685d` (official `cloudflare/cloudflare-os`), 27 files, +1574/−45.
- Scope: read-only source, security and lifecycle review of `upstream-range.patch`, plus candidate
  `server.ts`, `user.ts` and `access.ts` read with `git show 54d4685d:…`. I did not read
  `codex-research.md` before writing this. No git, checkout, credential or production changes.
- **No tests were run.** Every item below is a **source hypothesis** unless it says
  "source-confirmed" (meaning the code path is unambiguous when read). Nothing here is a tested bug.
- Auth modes in scope are upstream Cloudflare Access, password, and gatekeeper (OAuth) sign-in.
  This review makes no Better Auth assumptions. How the fork's router and Better Auth gate
  interact with this route is a separate integration question (see §5).

## Verdict

**Not acceptable as-is. Hold it until the lifecycle gaps in §1 are either accepted explicitly or
covered by tests.** The core transfer protocol is careful:
- ECDH P-256 + HKDF + AES-GCM, with the opaque state as AAD.
- A 256-bit single-use ticket that is stored only as a hash.
- An explicit consent screen.
- A top-level POST-navigation CSRF check.
- An Access owner binding on the callback.
- A staged session that stays inactive until the callback is consumed.
- Atomic synchronous puts in the DO.

The weak points are what happens **after** a credential is issued: expiry, revocation and
already-open RPC sessions. Concurrency is also completely untested.

## 1. Revocation and expiry of already-authenticated RPC sessions (highest priority)

**1a. Device-session expiry is checked only when `authenticate()` is called, not over the life of
an open RPC session. (Source-confirmed, high confidence; not runtime-tested.)**
- `PublicApiImpl.authenticate(token)` calls `UserDurableObject.authenticate()` once and then
  returns an `AuthenticatedApiImpl`.
- No `AuthenticatedApiImpl` method re-checks the session, and nothing calls `abortSession` when a
  session expires or is swept.
- So a native app that opens a WebSocket on day 29.99 keeps full API access past the 30-day
  `DEVICE_SESSION_LIFETIME_MS` for as long as the socket stays up.
- The alarm sweep (`alarm()` → `sessions.delete`) removes the record but does not end live sessions.
- The doc says the server "expires [the device session] after 30 days". That holds only for new
  authentications.
- The lifecycle test only checks `authenticate()` after expiry. It never covers an open session.
- *Acceptance needed:* bound the session lifetime, either by re-checking on each call or by a
  timer that calls `abortSession` at `expiresAt`. Add a test where a session authenticated before
  expiry is used after expiry.

**1b. Access JWT expiry is enforced only in `beginDeviceSessionHandoff`. (Source-confirmed.)**
- `authenticateFromCfAccess` now records `expiresAt = exp*1000` on `AuthenticatedApiImpl`, but
  only the new method checks it.
- Every other method on a WebSocket opened with a since-expired Access JWT keeps working. That
  behaviour predates this patch, but the patch now formalises an `expiresAt` it does not enforce
  anywhere else.
- For the native app this matters more: its embedded webview's socket may be long-lived, and the
  transferred JWT is meant to be the credential's lifetime bound ("The native app cannot refresh
  or extend it").
- *Acceptance needed:* decide whether Access-backed RPC sessions should be aborted at JWT `exp`,
  and test it.

**1c. A near-expired Access JWT can be transferred. (Source hypothesis.)**
- The transferred JWT is the `cf-access-jwt-assertion` captured at WebSocket **upgrade** time,
  not a fresh one.
- `beginDeviceSessionHandoff` rejects it only if it has *already* expired. A JWT with seconds left
  passes, so the app gets a credential that is dead on arrival or soon after.
- Meanwhile the browser may already hold a refreshed `CF_Authorization` that the old socket
  never sees.
- *Suggest:* require a minimum remaining lifetime, or re-read the JWT from the callback request
  (the callback already verifies a fresh Access JWT in Access mode).
- Note: `exp` missing → `expiresAt = 0` → the method always throws. That fails closed, which is
  acceptable.

**1d. There is no way to revoke an issued Workshop device session. (Source-confirmed.)**
- Within this range there is no server-side logout, no session listing and no revoke RPC.
- `changePassword` replaces `passwordHashHash` but **does not delete `sessions`**. That was
  already true, but this patch adds a new 30-day bearer credential living in native secure
  storage.
- If a device is lost, or a password is reset after compromise, the device session stays valid
  until day 30. Combined with 1a, it can last longer than that.
- *Acceptance needed:* define a revocation story. At minimum, password change and an explicit
  "sign out devices" action should invalidate device sessions **and** abort live RPC sessions.

**1e. A consumed-but-never-delivered session leaves an orphaned active 30-day session.
(Source-confirmed path; impact is low.)**
- `consumeDeviceSessionHandoff` activates the session **before** the 303 reaches the app.
- If the claimed link is not handled — desktop browser, app not installed, or a cancelled system
  auth session — the session is active for 30 days with no owner and no way to revoke it (1d).
- The credential stays protected by the app's per-attempt private key, so this is mainly hygiene,
  plus the revocation gap.

## 2. Concurrent operations (all untested; none of the tests is concurrent)

**2a. `stageDeviceSessionHandoff` race between two calls with the same state. (Hypothesis.)**
- The code does `pendingDeviceHandoffs.get(stateHash)`, then awaits `newSecretToken()` and
  `sealDeviceSessionHandoff()`, then writes with `put`.
- Correctness depends on those crypto awaits not letting another RPC into the DO. I believe
  workerd's WebCrypto resolves synchronously and no storage I/O happens before the puts, so input
  gates should serialise it. That is an assumption, not something I proved.
- If they did interleave, two first-time stages could both see `existing === undefined`. The
  results would be:
  - Two pending sessions.
  - The first `sessions` record orphaned until its 30-day `expiresAt` sweep. It cannot be used,
    because its `pendingUntil` has passed, but it lingers.
  - The public-key mismatch guard bypassed (last writer wins).
  - The first caller's ticket silently invalidated.
- *Acceptance needed:* add a concurrent-stage test (`Promise.all` of two stages with the same
  state). Also make the sweep drop sessions whose `pendingUntil` has passed, so an orphan cannot
  survive for 30 days.

**2b. `consumeDeviceSessionHandoff` double-redeem. (Hypothesis, low impact.)**
- The order is: `get(pending)` → `await presentedHash` → compare → `delete`.
- If the await yields to another event, two concurrent POSTs carrying the same ticket could both
  get the envelope.
- The envelope is only decryptable by the app key, so the impact is low. Still, "server-enforced
  single use" is claimed but only tested sequentially.
- *Suggest:* delete-before-await, or a concurrent-consume test.

**2c. Frontend double-click can invalidate its own first ticket. (Hypothesis, low.)**
- `continueInApp` is guarded by the `working` React state, which is captured in a closure.
- Two clicks before a re-render each call `beginDeviceSessionHandoff`. The reissue invalidates
  ticket 1, and two form submits race. The user may land on a 410.
- *Suggest:* guard with a ref.

**2d. `#armHandoffSweep` cost.**
- It now walks **all** `sessions`, including legacy ones with no expiry that are never deleted,
  on every stage, consume and alarm. That is O(n) per call.
- Concurrent arms compute `next` from synchronous snapshots, and the last writer includes every
  write, so I see no lost-alarm bug. It is only a cost and growth concern.
- `beginDeviceSessionHandoff` has no rate limit, but abandoned stages are swept after 2 minutes,
  so a user can only bloat their own DO.

## 3. Transfer and phishing surface (design, not bug)

- `cfos_native_state` and `cfos_native_key` come from the URL, so an attacker can craft a link
  carrying **their own** public key. The defences are the consent screen and the claimed
  `https://os.cloudflare.app/oauthredirect` app link.
- Where the claimed link is **not** handled (desktop browsers, a platform without the app), the
  victim's browser goes to the `os.cloudflare.app` web origin with `state`+`ciphertext` in the
  query string.
- An attacker holding the private key then only needs that URL. Possible leak paths are the host's
  logs or analytics, a third-party referrer from that page, or browser history sync.
- So confidentiality partly depends on what `os.cloudflare.app/oauthredirect` serves to browsers,
  and that is outside this patch.
- *Acceptance needed:* confirm the web fallback for that path:
  - It does not render, forward or log query parameters.
  - It sets `Referrer-Policy: no-referrer`.
  - Ideally, the callback only redirects when the request looks like it comes from a
    system-auth-session context. That last point is optional.
- The callback URL is hard-coded to a Cloudflare-owned domain. For a forked installation, staged
  credentials (encrypted) are sent through Cloudflare's app domain. This is a product decision
  to confirm, not a defect.

## 4. Smaller correctness notes

- **Gatekeeper token format (worth a test):** `token = profile.id + ":" + secret`.
  - Password accounts: `profile.id` is the normalised username, the same name used for
    `idFromName`. OK.
  - Gatekeeper accounts: `profile.id` is the email, and the DO is keyed by `idFromName(email)`.
    OK by reading.
  - No test covers gatekeeper mode end to end (stage → decrypt → `PublicApi.authenticate`).
- **Mixed mode:** in Access mode, `PublicApi.authenticate(token)` is not blocked. A session
  reached that way has no `accessSession`, so staging mints a 30-day *workshop* token on an Access
  deployment. The edge still requires Access, so this is low risk, but the credential kind is
  then inconsistent with the documented behaviour.
- **`AuthContext`:**
  - After a reconnect, `currentUser` keeps the previous connection's user until the new `whoami`
    succeeds.
  - Consumers other than `NativeAppBridge` read `currentUser` without checking
    `isCurrentUserConfirmed`.
  - After 3 failed retries the stale user is kept indefinitely.
  - Low risk, but it is a stale-identity display path.
- **Sweep coupling:** in `alarm()`, if `#dropPendingConnect` throws, the device-handoff and
  session sweeps in the same alarm are skipped until the runtime retries the alarm.
- **Tests that exist (not run):** sequential stage, reissue and consume; expiry via direct
  `authenticate`; forged-header rejection; owner mismatch (unit); envelope crypto.
- **Tests that are missing:**
  - Concurrency (2a, 2b).
  - An open RPC session after expiry (1a).
  - Access `exp` enforcement (1b, 1c).
  - Password change or revoke (1d).
  - The alarm-driven sweep. The "drops unconsumed" test goes through `consume`, not `alarm()`.
  - Gatekeeper mode.
  - An Access-mode route test with a *valid* JWT and a matching owner.

## 5. Fork integration (out of scope here; flagged only)

These were not assessed. Do not infer them from upstream tests.
- Whether the megabyte.space router forwards `POST /api/device-session/callback` to the backend
  with `Origin` and `Sec-Fetch-*` intact.
- Whether the router's anonymous-HTML gate intercepts that navigation.
- Whether the backend runs with `CF_ACCESS_AUD`.

## Candidate acceptance gaps (summary)

| # | Gap | Status |
|---|-----|--------|
| 1a | Open RPC sessions outlive the 30-day device-session expiry and the sweep | Source-confirmed, untested |
| 1b | Access JWT `exp` enforced only in `beginDeviceSessionHandoff` | Source-confirmed, untested |
| 1c | A near-expired, upgrade-time Access JWT can be transferred | Hypothesis |
| 1d | No revocation; password change doesn't kill device sessions | Source-confirmed |
| 1e | Consumed-but-undelivered session stays active 30 days | Source-confirmed, low impact |
| 2a | Concurrent same-state stage could orphan a session or bypass the key guard | Hypothesis (depends on DO input-gate/crypto semantics) |
| 2b | Concurrent consume could double-deliver | Hypothesis, low impact |
| 2c | UI double-click self-invalidates the ticket | Hypothesis, low |
| 3 | Confidentiality depends on the `os.cloudflare.app` web-fallback behaviour | Design dependency, external |
| 4 | No gatekeeper-mode, alarm-sweep or valid-Access route tests | Test-coverage gap |

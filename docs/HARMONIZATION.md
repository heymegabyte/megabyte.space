# Megabyte OS — Surface Harmonization

One product, three surfaces (front door · landing splash · OS shell). This spec makes them read, move, and
behave as one. Grounded in the live code; file:line cited. **Status: PROPOSAL — apply is gated** on (a) the
fresh-OS relaunch decision (ADR-0002) and (b) the one light/dark call below. Durable: survives the relaunch
(a fresh apex OS adopts the same brand kit; the custom app at demo.megabyte.space adopts it immediately).

## The journey today (and the regime each step uses)

1. Anonymous HTML nav → **router login gate** — `cloudflare-os/packages/router/src/index.ts:33-114` (inlined, no-React, instant paint). Regime: **dark `#060610`**, **system fonts**, **hardcoded hex**, no wordmark, footer "Secured by Better Auth".
2. Sign in → `succeed()` does `location.href = "/"` — a **full page reload** (router gate JS).
3. SPA cold boot → `boot-mark` spinner splash — `workshop-frontend/index.html:84`.
4. Authed first-run → **WebGL `LandingHomepage`** "Enter the OS" — `routes/__root.tsx:206-221`. Regime: **dark cinematic**.
5. → Onboarding wizard → **AppShell**. Regime: **near-white** `--color-kumo-base:#fcfcfb` (`styles.css:28`), dark mode exists behind `[data-mode="dark"]` (`styles.css:4,149`) but is not the default.

## The seams

- **Typography break.** Gate = `-apple-system,BlinkMacSystemFont…`. OS = `--font-sans` / `--font-mono`. Three regimes: system (door) · `FT Kunst Grotesk`+`Apercu Mono` (`styles.css:8-10`, Kumo upstream) · `Sora`+`Space Grotesk` (`styles.css:918`). Brand doctrine = Sora / Space Grotesk / JetBrains Mono.
- **Dark→light whiplash.** Black door + black WebGL splash open into a near-white shell. The entrance promises a different product than the room.
- **Token duplication.** Door hardcodes `#060610` / `#00E5FF`; OS owns the OKLCH `--color-kumo-*` set. No shared source → drift.
- **Stacked hard cuts.** Full reload (step 2) + three sequential splashes (boot-mark → WebGL → onboarding). Each flashes. No View Transitions anywhere in the chain.
- **Broken control.** "Continue with Google" dead-ends at `redirect_uri_mismatch` (see memory `google-sso-redirect-uri-mismatch-prod`). A disharmony the user hits first (it's the top button).
- **Component redundancy.** `BlueprintLandingPage.tsx` + `LandingHomepage.tsx` both exist — pick one landing truth.

## Target: one product — levers ranked by harmony impact

1. **One home base theme (THE decision — see below).** Resolve dark↔light so the door and the room are the same world.
2. **One type system.** Pick the brand regime (Sora/Space-Grotesk display + JetBrains Mono) OR consciously adopt Kumo's FT Kunst/Apercu — then use it at the door AND in the OS. Kill the system-font door. Serve via CF Fonts (same-origin, per memory `apex-uses-cloudflare-fonts`).
3. **One token source.** The door consumes the OS's `--color-kumo-*` / accent tokens (or a tiny shared `:root` extract), never raw hex. Change the brand once, everywhere moves.
4. **One continuous motion.** Replace the post-login full reload + stacked splashes with a single cross-fade/scale into the OS (View Transitions API; `@starting-style` where VT is unsupported). De-stack: boot-mark covers SPA boot; WebGL splash is the ONE welcome; fold onboarding into the shell, not a third wall.
5. **Every control works.** Register the Google redirect URI (external) or pull the button so the door never dead-ends. GitHub-primary until Google is green.
6. **One mark, one wordmark, one voice.** The gate carries the Megabyte OS mark + "Sign in to continue to **Megabyte OS**" (not just "Secured by Better Auth" — the current copy reads as a generic/Access wall).

## THE decision — light or dark home base?

- Your SUPREME doctrine (#7) is **black + cyan everywhere** → dark-first OS, matching the door + splash. **Recommended.**
- But you said you like the current UI, which defaults to **near-white enterprise**. If that's the keeper, we instead warm the door toward the shell (lighten the entrance / shared mid-tone) so the transition isn't a cliff.
- Pick one home base; everything else aligns to it. This is the single biggest harmony lever and it's a taste call, so it's yours.

## Fresh-OS relaunch reconciliation (ADR-0002)

- "I like the UI" tensions the relaunch: the plan demotes **this** (liked) custom OS to demo.megabyte.space and relaunches the apex as a fresh minimal official Cloudflare OS. Worth an explicit re-confirm before Phase 2.
- This spec is relaunch-agnostic: the brand kit (tokens + type + mark + motion) applies to the custom app at demo immediately, and a fresh apex OS adopts the same kit so apex + demo feel like one estate.

## Apply steps (per surface — staged, not yet deployed)

- **Door** (`router/src/index.ts`): swap `font-family` → brand stack via CF Fonts; replace hex with the shared token `:root`; add mark + wordmark + "continue to Megabyte OS"; make **GitHub** the primary button, Google secondary (or hidden until its URI is registered). **Keep the e2e contract**: `data-testid="login-gate"`, `input[type=password]`, `data-testid="auth-submit"`, the `auth-success` marker (every browser verifier logs in through these — see CLAUDE.md §Auth).
- **Splash** (`__root.tsx` + `LandingHomepage.tsx`): make it the single welcome; align its palette to the chosen home base; enter the OS via a View Transition instead of a state swap.
- **OS shell** (`styles.css`): if dark-first wins, set `data-mode="dark"` as the default and audit contrast (memory `kumo-accent-text-not-aa-in-light` — run verify-a11y BOTH themes).
- **Flow** (`router` + `main.tsx`): after sign-in, hand off into the SPA without a jarring white reload (prewarm / VT).
- **Dedupe**: retire whichever of `BlueprintLandingPage` / `LandingHomepage` isn't the keeper (triage upstream-vs-fork-added per memory `fork-orphan-triage-upstream-vs-fork-added`).

## Must stay green when applied

- Login e2e contract (testids above) intact → every `verify-*.mjs` / `green-sweep.mjs` login still works.
- `verify-a11y` clean in BOTH themes; `verify-prod` Google probe still tracked.
- 0 console errors on every anonymous path (`verify-anon-console`); the OS shell never leaks pre-login.

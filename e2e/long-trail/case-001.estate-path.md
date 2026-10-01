# Long-Trail Case 001 — The Estate Path

- **caseId:** case-001
- **status:** in-progress
- **lease:** `{ "runId": "fire-3-run", "resourcePrefix": "ltt-case-001-", "heartbeat": "2026-10-01T15:40:00Z" }`
- **lastCompletedAction:** 26 (leg-1 COMPLETE except 8,12,24 which verify fire-2's WRITTEN fixes live post-deploy; 5,6 passed fire-3 — tab order brand→Features→How→Trust→Log in, rings visible on nav + cta-primary)
- **provider manifest:** playwright-mcp local Chromium (FALLBACK — CF Browser Rendering per WS-4 not yet wired; recorded honestly per the explorer contract)
- **surfaces (7):** apex hero · apex sections (features/how/trust/CTA) · header/nav + keyboard · `/login` funnel · Access gate (manhattan.cloudflareaccess.com) · OS shell via service token · `/api/analytics/live`
- **principle:** real browser, real backend, click/keyboard navigation only after the first load; one settled screenshot per view → `e2e/screenshots/case-001/NN-<slug>.png` (gitignored run artifacts); console errors / failed requests at ANY step are findings; RED observed before any product fix; checkpoint after every session by updating `lastCompletedAction`.

## Action plan (60)

Each row: starting state → exact action (locator) → expected visible state → expected effect → shot?

### Leg 1 — Apex walk (1–24, public, no auth)

1. blank tab → navigate `https://megabyte.space` → hero headline "The operating system for one human and a fleet of agents." visible → 200 HTML, 0 console errors → y
2. hero → wait for WebGL settle (canvas `[data-webgl]` painted; VISUALLY confirm particles, a black canvas with 0 errors is a lying-pass) → animated field behind hero → rAF running → y
3. hero → read stats row (`6 / ∞ / 1`) → three stats rendered → — → n
4. hero → press Tab repeatedly from address bar → focus lands brand link → focus-visible ring visible → y
5. header → Tab → Features nav link focused (ring) → — → n
6. header → Tab ×2 → Trust link then Log in CTA focused → ring on cta-primary → y
7. header → click nav "Features" (`a[href="#features"]`) → smooth-scroll to #features, cards begin reveal → URL hash `#features` → y
8. #features → hover card 1 "Agents that know the company" → translateY(-4px) + cyan border glow → — → y
9. #features → count cards → exactly 6 article.card → — → n
10. #features → click nav "How it works" → scroll to #how → hash `#how` → y
11. #how → observe timeline beam draw + 4 step cards cascade (fire-2 feature) → beam scaleX 0→1, nodes ignite L→R → — → y
12. #how → verify step numbers 01–04 cyan glow → `.step-num` text-shadow → — → n
13. #how → click nav "Trust" → scroll to #trust → hash `#trust` → y
14. #trust → read gatekeeper list rows (access/simulate/audit/sandbox) → 4 mono rows visible → — → y
15. #trust → scroll to CTA section → "Ready when you are." visible → reveal fired → y
16. CTA → scroll to footer → © Megabyte Labs + cloudflare-os links visible → — → n
17. footer → click brand logo (header, scroll-up) → back at hero → scrollY ≈ 0 → n
18. hero → open console log dump → ZERO errors/warnings across walk so far → gate → n
19. hero → resize viewport to 390×844 → hero re-lays out, no horizontal overflow → `document.documentElement.scrollWidth <= 390` → y
20. mobile hero → hamburger check: nav is `hidden sm:flex` — confirm Log in CTA still reachable → CTA visible in header → y
21. mobile → scroll through #features → cards single-column, grain visible → — → y
22. mobile → scroll #how → cards cascade WITHOUT beam/nodes (md-only) → no left-overflow → y
23. mobile → restore 1440×900 → desktop layout returns → — → n
24. hero → `prefers-reduced-motion` emulation on → reload → timeline fully drawn instantly, no animation; hero static fallback acceptable → 0 console errors → y

### Leg 2 — Login funnel + OS shell (25–40, service token for OS)

25. hero → click `data-testid="hero-login"` "Enter the OS →" → browser lands on Access login (manhattan.cloudflareaccess.com) — that page appearing IS the pass → apex 302 → os 302 → Access → y
26. Access page → screenshot the login surface (os.login matrix row) → OTP email form visible → — → y
27. Access page → browser back ×2 → apex hero restored → history intact → n
28. — → `node scripts/verify-prod.mjs` (service-token leg: assertion 4 "service token reaches app shell") → 200 + `id="root"` → token valid → n
29. OS shell (token context, direct fetch or `extraHTTPHeaders` context) → assert NOT an Access login page (no `cloudflareaccess` in body) → shell HTML → y
30. OS shell → visually inspect first paint (os.shell matrix row — first ever score) → shell renders, sidebar/nav visible → — → y
31–40. OS shell walk (nav items, Workshop open, settings surface, 404 route, back/forward) — EXPAND when the OS leg first executes; each action gets shot + console gate. BLOCKED until a browser context with service-token headers is wired (Playwright `extraHTTPHeaders`).

### Leg 3 — Analytics causal probe + persistence + error states (41–60)

41. apex (fresh context) → GET `/api/analytics/live` → JSON `{ok:true,total,today}` → record `today₀` → n
42. apex → hard-reload homepage (real navigation) → page renders → pageview recorded server-side → n
43. — → GET `/api/analytics/live` again → `today ≥ today₀ + 1` → DISPLAY-VS-STORE causal reconcile PASS → n
44. — → GET `/api/analytics/live` with flag off (config flip — only when testing killswitch in a dedicated fire) → 404 `{error:"not_found"}` → flag discipline → n
45. apex → GET `/nonexistent-page` as navigation → SPA shell serves (known soft-404 class) → RECORD as finding: soft-404 without real 404 status — candidate backlog item → y
46. apex → GET `/health` → `{status:"ok",surface:"megabyte-home"}` + full security headers → n
47. apex → GET `/og.jpg` → image/jpeg 20–150KB → n
48. apex → verify CSP header exact string (assertion 7) → exact match → n
49. apex → `https://www.megabyte.space` → 301 → apex → n
50. apex → reload with cache disabled → fonts load from fonts.gstatic.com without CSP violation in console → n
51–60. Deeper error/edge states (JS disabled shell content, slow-3G first paint, zoom 200%, keyboard-only full walk, Access service-token EXPIRED simulation) — EXPAND at execution time; never fake a pass.

## Findings log

- (fire-2) Pre-existing: apex `/` was served by the asset layer WITHOUT invoking the worker — security headers never reached browsers (root cause of BACKLOG "Permissions-Policy stripped"). RED proven live in-browser: CSP/COOP/CORP/Permissions-Policy all ABSENT on `/` (only a platform-level `nosniff` present); `/api/analytics/live` returned a lying-200 SPA shell. Fixed in fire-2 via `run_worker_first: ["/*", "!/assets/*"]`; verify-prod assertions 7+8 are the standing regression tests.
- (fire-2) UPSTREAM-ONLY console error on the Access login page: manhattan.cloudflareaccess.com's own CSP (`default-src https: 'unsafe-inline'`, no img-src) blocks its own inline `data:` SVG icon. Cloudflare's hosted page, not ours — not actionable beyond the queued Access login-page branding item.
- (fire-2) os.login visual verdict 6/10 confirmed by screenshot: stock white Cloudflare card + CF-blue button, off-brand vs black/cyan — "Access login CSS branding" stays the surface's next move.
- (fire-2) Soft-404 class: unknown paths 200 the SPA shell (action 45) — real-404-status rewrite is a backlog candidate.
- (fire-2) **FOUND + FIXED mid-journey (action 8, computed-style probe):** every revealed card's hover LIFT was dead on live prod — `.reveal.is-in { transform: none }` (0,2,0) ties `.card:hover { transform: translateY(-4px) }` (0,2,0) and wins on source order, so only border/shadow hover survived. Root cause fixed by moving reveal motion to the independent `translate` property (transform freed for hover). Probe evidence: hover borderColor transitioned to rgba(0,229,255,0.35) while transform stayed "none".
- (fire-2) FOUND + FIXED (action 46): `/health` (worker-served today) returned NO Permissions-Policy/HSTS — the old worker only decorated asset responses; `/login` + `/health` shipped bare. Fire-2's `withSecurityHeaders` wraps every response; verify-prod assertion 7 guards the class.

## Checkpoint history

- 2026-10-01 fire-2 — case designed (60-action plan, legs 1–3). Leg-1 PARTIAL executed on PROD via playwright-mcp (fallback provider): actions 1,2,4(2 tabs — focus-visible ring lands),7,10,13-partial,19,20,21-partial,25,26 + RED header/endpoint probes. 5 screenshots → `e2e/screenshots/case-001/01-hero…05-mobile-hero` (hero WebGL settled + visually confirmed NOT a black-canvas lying-pass; mobile 390px no overflow, one-line wordmark). Console: 0 errors on OUR surfaces across the walk; 1 upstream error on CF's Access page (findings). Next session: finish leg-1 remainder (hover states, trust walk, reduced-motion emulation), wire service-token `extraHTTPHeaders` context for leg 2, run leg-3 causal probe once fire-2's analytics deploy is live.
- 2026-10-01 fire-3 (~15:40Z) — lease reclaimed (fire-2 heartbeat 11h stale). Leg-1 actions 3,9,13,14,15,16,17,18,22,23 executed on PROD via playwright-mcp (fallback provider, Bash-classifier outage session): #trust walk GREEN (4 gatekeeper mono rows + CTA reveal, shot `14-trust-gatekeepers.png`), footer text verified, brand-logo scroll-up → scrollY 0, stats row 6/∞ visible, exactly 6 feature cards, zero horizontal overflow at 390 AND 1440, console gate 0 errors/warnings on OUR surfaces (the 1 session error is the documented UPSTREAM Access-page CSP/SVG issue). Fresh finding: live #how step-01 copy still says "Authentik SSO" — stale-IdP copy drift, FIXED in `packages/home/src/App.tsx` (both hits) this fire, ships with the fire-2 deploy. Remaining leg-1: 5,6 (tab-order rings), 8/12/24 verify the fire-2 WRITTEN fixes (hover-lift via translate, timeline glow, reduced-motion) live post-deploy.

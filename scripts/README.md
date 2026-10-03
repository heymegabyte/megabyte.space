# scripts/ — catalog

Most `verify-*` scripts are **deliberate standalone tools** run by the loop / ad-hoc, NOT wired into
`package.json`. "Not in package.json" ≠ dead — do NOT remove them in a dead-code sweep (orphan-sweep
finding, fire-44: 0 src orphans; every verifier below is intentional).

## Standing ship gates (run after every deploy)

- **`verify-prod.mjs`** — 9 HTTP assertions (apex homepage, /login funnel, Access gate, service-token shell, og, www, security headers incl. exact CSP, analytics live, soft-404). `pnpm check`/deploy gate.
- **`verify-apex.mjs`** — the SINGLE apex gate: runs `verify-prod` + `verify-apex-journey` + `verify-reduced-motion`. Run after `pnpm --dir packages/home deploy`.
  - **`verify-apex-journey.mjs`** — 28-step real-browser golden path over the public apex.
  - **`verify-reduced-motion.mjs`** — asserts motion-gated surfaces stay visible under `prefers-reduced-motion`.
- **`verify-os.mjs`** — the SINGLE OS gate: `verify-prod` + `verify-os-theme` + `verify-os-landing`. Run after `pnpm deploy` (needs `CF_ACCESS_CLIENT_ID`/`SECRET`).
  - **`verify-os-theme.mjs`** — OS shell is dark black/cyan (service token).
  - **`verify-os-landing.mjs`** — OS landing splash render→dismiss→persist (service token).

## Deliberate verifiers (run intentionally, NOT every deploy)

- **`verify-vitals.mjs`** — field-CWV pipeline proof (guard + probe isolation). Writes ONLY probe samples (non-polluting).
- **`verify-apex-cwv.mjs`** / **`verify-cwv.mjs`** — throttled lab CWV (LCP/CLS) for the apex. (Overlap — `verify-apex-cwv` is the newer CDP-throttled one; `verify-cwv` predates it. Consolidate when next touched.)
- **`verify-seo.mjs`** — SEO-strict on the raw served shell (crawler view).
- **`verify-links.mjs`** — all-hyperlinks-valid on the rendered apex + /status.
- **`verify-status.mjs`** — /status cards render + reconcile (superset lives in `verify-apex-journey`).
- **`verify-browser.mjs`** — real-browser CSP-doesn't-break-page check (largely folded into `verify-apex`).

## Generators (run by the build chain)

- **`gen-build-info.mjs`** (→ `build-info.json`, the /status last-deploy line) · **`gen-sitemap.mjs`** · **`gen-og-card.mjs`** · **`gen-apple-icon.mjs`** · **`check-stale-copy.mjs`** (build-fails on banned terms). Wired in `packages/home` `build`.

## Loop + deploy infra

- **`loop-fire-lock.mjs`** — the fire lease (claim/heartbeat/release). · **`lowest-beauty-surface.mjs`** — Beautify-10x target picker. · **`capture-section.mjs`** — screenshot a CSS selector for vision review.
- **`deploy.ts`** (+ `deployment-config.ts`, `check-submodule-resolvable.mjs`) — `pnpm deploy`/`pnpm check` for the 6 OS workers.

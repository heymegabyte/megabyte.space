# ProjectSites.dev Feature Absorption Inventory

**Last updated:** 2026-09-29  
**Purpose:** Standing backlog of user-facing capabilities from projectsites.dev (stability, wealth of features) ready for selective absorption into megabyte.space (frontier, Cloudflare OS UI).

---

## Data & Tables (14 capabilities)

- **Per-site D1 database viewer** — admin/sections/site-data-browser.component.ts — site detail page / data tab — P1  
  Lazy-provisioned customer D1, SQL query builder, schema browser. Isolation via resolveSiteDataDb. Feature flag: `per_site_data`.

- **Table/grid inspection with sort & pagination** — admin/sections/analytics.component.ts, forms.component.ts — analytics dashboards, form submissions grid — P1  
  Sortable columns (site-sort-url.util), date filters, live row counts, submission details modal.

- **Visitor events schema browser** — admin/sections/site-schema-browser.component.ts — site detail → schema tab — P2  
  JSON-LD validator, table columns, cardinality explorer, filter by event type.

- **Site JSON-LD inspector** — front-end validation pre-publish (build_validators.ts) — site generation editor — P1  
  Enforces 4+ blocks/page (Organization, WebPage, BreadcrumbList, WebSite minimum).

- **Form submissions list & detail** — routes/forms.ts + admin/sections/forms.component.ts — admin forms panel — P1  
  Time-series ingestion, spam filtering, export CSV, webhook replay, field-level analytics.

- **Analytics events table (click tracking, scrolls, errors)** — routes/analytics.ts, admin/sections/analytics.component.ts — analytics dashboard — P1  
  EventDispatcher Durable Object, 30s/60s polling from visitor_events D1, event type breakdown.

- **Lead capture scanner** — routes/admin_leads.ts, admin/sections/leads.component.ts — admin leads panel — P2  
  Form field detection, email/phone extraction, lead scoring, spam filter, source tracking.

- **Custom data endpoints (API routes per site)** — libs/features/visitor_events_core — site functions — P2  
  Routes defined in site's functions/ folder (Workers for Platforms). Replaces deprecated UI-authored AI endpoints.

- **Conversions funnel** — admin/sections/activation-funnel.component.ts + funnel.component — analytics funnels — P2  
  Multi-step tracking, drop-off rates, session reconstruction, time-to-convert metrics.

- **Site audit report (accessibility, performance, SEO)** — routes/api.ts `/api/sites/:siteId/audit`, admin/sections/audit.component.ts — site detail audit tab — P1  
  Axe-core violations, Lighthouse CWV, meta tag compliance, JSON-LD count, image optimization flags.

- **Analytics coverage matrix** — docs/analytics-coverage-matrix.md — observability docs — P2  
  Events mapped to post-hooks, schema version tracking, event routing rules.

- **Form field validation & spam detection** — routes/forms.ts — form submissions processor — P1  
  Turnstile captcha integration, rate limiting per source, pattern-based spam rules, whitelist/blacklist IPs.

- **Outbound link tracking** — admin/sections/outbound-links-card.component.ts — analytics dashboard — P2  
  Click event aggregation, destination domain grouping, conversion attribution.

- **Session reconstruction** — routes/analytics.ts — analytics pipeline — P2  
  Time-windowed visitor_events clustering, session-to-conversion mapping, user journey replay.

---

## Dashboards & Analytics (18 capabilities)

- **Admin analytics dashboard (unified)** — admin/sections/analytics.component.ts — /admin/analytics — P1  
  Visitors, pageviews, bounce rate, avg session duration, top pages, referrers, tech stack breakdown, custom date picker.

- **Live analytics card (30s refresh)** — admin/sections/analytics-live.component.ts — analytics dashboard widget — P1  
  Real-time visitor count, active sessions, scroll depth snapshot, form submissions rate.

- **Activation funnel (5-step default)** — admin/sections/activation-funnel.component.ts — /admin/analytics/funnel — P2  
  Signup → email verify → first deploy → published → custom event. Configurable steps per site.

- **Technology breakdown (UA parser)** — admin/sections/tech-breakdown.component.ts — analytics dashboard — P1  
  Browser, OS, device, screen size histograms. Events tracked via visitor_events schema.

- **Campaign breakdown card** — admin/sections/campaign-breakdown.component.ts — social/email analytics — P2  
  UTM param clustering (source/medium/campaign), conversion rate per campaign, budget ROI tracker.

- **Channel attribution (multi-touch)** — admin/sections/channel-breakdown.component.ts — analytics dashboard — P2  
  First/last/linear touch attribution, channel source grouping, revenue attribution.

- **Web Vitals card (CWV)** — admin/sections/web-vitals-card.component.ts — analytics dashboard — P1  
  LCP, FID, CLS from visitor_events beacon, hourly/daily aggregation, threshold alerts.

- **Cloudflare RUM card** — admin/sections/cloudflare-rum-card.component.ts — analytics dashboard — P1  
  Native CF Analytics Engine sampling, HTTP cache ratio, bot traffic filter.

- **Scroll depth card** — admin/sections/scroll-depth-card.component.ts — analytics dashboard — P1  
  25/50/75/100% scroll event counts, page-level breakdown, heat-map ready.

- **Form funnel card (multi-page)** — admin/sections/form-funnel-card.component.ts — forms analytics — P2  
  Drop-off per field, avg time-to-fill, field-level submission rate.

- **Entry/exit pages card** — admin/sections/entry-pages-card.component.ts, exit-pages-card.component.ts — analytics dashboard — P1  
  Landing page bounce rate, session-start distribution, exit intent tracking.

- **Engagement card (scroll, click, attention)** — admin/sections/engagement-card.component.ts — analytics dashboard — P2  
  Composite engagement score, click density heatmap, dwell time per section.

- **Network quality card (latency, DNS, TCP)** — admin/sections/network-quality-card.component.ts — analytics dashboard — P2  
  Latency percentiles (p50/p95/p99), DNS lookup time, TCP connection time from PerformanceObserver.

- **Navigation timing card** — admin/sections/nav-timing-card.component.ts — analytics dashboard — P1  
  DOM interactive, page load, TTFB breakdown, render time vs resources.

- **Session duration card** — admin/sections/session-duration-card.component.ts — analytics dashboard — P1  
  Session length distribution, hourly/daily patterns, returning vs new visitor.

- **Visitor type card (returning vs new)** — admin/sections/visitor-type-card.component.ts — analytics dashboard — P1  
  Return visitor % (localStorage-based), conversion rate per type, cohort retention.

- **Referrer domains card** — admin/sections/referrer-domains.component.ts — analytics dashboard — P1  
  Top referring domains, organic vs paid split, click-through from domain.

- **Hourly/weekday breakdown** — admin/sections/hourly-breakdown.component.ts, weekday-breakdown.component.ts — analytics dashboard — P2  
  Traffic patterns by hour-of-day and day-of-week, seasonal trends, peak usage windows.

---

## Automation & Workflows (10 capabilities)

- **Site generation workflow (25-30 prompts, 6 phases)** — apps/project-sites/src/workflows/site-generation.ts, CLAUDE.md § Website Generation Philosophy — site create flow — P1  
  Research → assets → HTML → SEO → content → validation. Parallel subagents (VQA, SEO auditor, a11y, perf profiler). Gates on completeness-checker.

- **Template system (pre-built prompts)** — apps/project-sites/src/prompts/*.prompt.md — site generation → template selection — P1  
  20+ domain-specific templates (agency, ecommerce, nonprofit), hot-patch via KV, reduces build time 40%.

- **Container orchestrator (single-prompt + fanout)** — container/ directories + Dockerfile — site gen background worker — P1  
  Spawns parallel agents in container, gates on manifest validation, retries up to 3x with exponential backoff.

- **Webhook dispatcher (form submissions, analytics)** — routes/api.ts POST /api/sites/:siteId/webhooks/trigger — form → webhook pipeline — P1  
  Signed payload, retry queue, delivery status tracking, 30s timeout per POST, exponential backoff.

- **Social media auto-scheduler (Postiz)** — admin/sections/social.component.ts, social_publishers/postiz.ts — /admin/social — P2  
  REST bridge to Postiz (social.projectsites.dev), post queue, scheduling to 6+ platforms, analytics sync.

- **Email delivery via SES + SendGrid fallback** — services/email.ts, getEmailProvider, sendEmail — transactional + bulk — P1  
  ADR-0019: SES primary, SendGrid backup (Resend removed 2026-09-09). Bounce handling, delivery tracking.

- **Outbox pattern (reliable delivery)** — routes/admin_outbox.ts, D1 outbox table — async email/webhook queue — P2  
  Persistent queue, delivery status polling, bounce/complaint feedback loop, delivery confirmations.

- **Feature flag roll-out engine** — libs/features/<slug>/manifest.ts, feature_flags module — feature gating across API/UI — P1  
  Typed flags, 7-field manifest per feature, drift detection gate (validate:features), dark launch support.

- **Search indexing + full-text queries** — routes/search.ts, site schema browser search — /admin/search, site-schema-browser — P2  
  D1 FTS5, multi-field search (title, description, tags), facet filtering, relevance ranking.

- **Scheduled tasks (Workflows-based cron)** — src/workflows/ directory — background jobs — P1  
  Site republish checks, daily digest emails, cleanup jobs. Replaces Queues (optional fallback).

---

## Integrations (13 capabilities)

- **Stripe billing + checkout** — routes/billing*.ts, admin/sections/billing.component.ts — /admin/billing — P1  
  Subscriptions, add-ons (domains, extra sites), webhook sync, card management, tax calculation.

- **Google OAuth (+ email magic links)** — routes/auth*.ts, mcp_oauth.ts — sign-in flow — P1  
  /api/mcp/:provider/connect fallback to paste-key flow (when PROVIDER_OAUTH_CLIENT_ID missing). Supports Google, GitHub, etc.

- **MCP server integrations (Resend, GitHub, etc.)** — routes/mcp_oauth.ts, /api/mcp/:provider/*, per-site MCP keys — site functions — P1  
  Customer brings their own API keys, stored per-site. Replaces deprecated AI-endpoints feature.

- **Domain purchase via WHOIS lookup** — routes/domain_purchase.ts, admin/sections/domain-manager.component.ts — /admin/domains/purchase — P2  
  WHOIS availability check, bulk checker (csvimport), auto-renewal config, ICANN compliance.

- **DNS management (custom domains)** — routes/api.ts /api/sites/:siteId/domains, admin/sections/domains.component.ts — /admin/domains — P1  
  CNAME validation, SSL provisioning, DNS propagation check, CAA record setup, Cloudflare native.

- **PostHog server-side events** — services/observability/events.ts, CLAUDE.md — backend telemetry — P1  
  Product funnels, user cohorts, feature usage tracking. Hot-path exclusion for perf (KV).

- **Sentry error tracking** — services/observability/errors.ts — error logging — P1  
  HTTP API, correlated requestId/traceId, source map uploads, error grouping.

- **Amazon SES + Listmonk newsletters** — services/email.ts, social_publishers — email/newsletter — P1  
  Bulk list management, segment-based campaigns, bounce/complaint hooks, SMTP fallback.

- **Chatwoot live chat widget** — routes/chatwoot_agent_bot.ts — embedded chat on customer sites — P2  
  Agent-bot integration, conversation routing, knowledge base queries.

- **Browserbase for automation** — services/browser_gateway.ts, docs/architecture/cloudflare-first.md — browser automation fallback — P2  
  CF Browser Run primary, Browserbase managed session/replay when CF falls back. **Skyvern internal-only** (behind CF Access).

- **Twilio voice** — routes/voice*.ts, services/twilio.ts — voice calls to leads/users — P2  
  IVR-like flows, callback queue, transcription via AI.

- **Neon Postgres (escape hatch)** — D1 primary, Neon via Hyperdrive — large-scale analytics — P2  
  Used sparingly when D1 write limits hit. Hyperdrive caching.

- **Upstash Redis (cache escape hatch)** — services/cache.ts — session cache, hot data — P3  
  KV first, Redis only when ordering/TTL essential. Feature-flagged fallback.

---

## AI-Native (8 capabilities)

- **Prompt system (20-30 specialized prompts)** — src/prompts/*.prompt.md, CLAUDE.md § Prompt System Philosophy — site generation pipeline — P1  
  Modular, domain-specific prompts. Hot-patch via KV. Enforces Flesch Reading Ease ≥50 on copy.

- **Claude Code orchestrator + subagents** — container/docker orchestration, site-generation.ts — site-gen container — P1  
  Main orchestrator fans out 7 parallel subagents (VQA, SEO auditor, a11y auditor, perf profiler, content writer, domain builder, validator). Gates on completeness-checker.

- **AI Gateway mandatory routing** — routes/ai_admin.ts, CLAUDE.md § Infrastructure doctrine — all model calls — P1  
  Every Claude/Llama call via AI Gateway. Analytics Engine default for metrics (not PostHog hot-path).

- **Cloudflare Workers AI (Llama 3.3/3.1)** — AI Gateway dispatch — site generation, content writing — P1  
  On-device inference (FP8 quantized), no external calls. Fallback: Claude API via AI Gateway.

- **Content generation (20+ iterative prompts)** — prompts/content-writer.prompt.md — site generation phase 3–4 — P1  
  Copy quality gate: Flesch ≥50. SEO keyword insertion. Banned word filter (leverage, cutting-edge, etc.).

- **AI site-copy editor & branded voice** — admin/sections/ai-logs.component.ts (view all AI generations) — site detail → AI logs — P1  
  View all AI prompts + responses for transparency. Edit & regenerate button per section.

- **SEO agent (meta, schema, keywords)** — prompts/seo-auditor.prompt.md — site generation phase 3 — P1  
  Auto-generated meta tags (50-60 chars title, 120-156 description), JSON-LD blocks, keyword clustering.

- **Visual QA agent (accessibility, performance, brand)** — prompts/visual-qa-auditor.prompt.md — site generation phase 2 — P1  
  Axe-core violations, Lighthouse CWV, brand guideline compliance, screenshot comparison.

---

## Media & Content (10 capabilities)

- **Logo generation + luminance-driven theme** — prompts/logo-generator.prompt.md, CLAUDE.md — site generation phase 2 — P1  
  AI-generated logo (PNG + SVG), light/dark theme chosen by luminance. Brand color extraction.

- **Hero/section image generation** — routes/media.ts, prompts/image-generator.prompt.md — site generation phase 2 — P1  
  Multimodal image synthesis, WebP encoding, lazy loading, responsive sizes, alt-text generation.

- **Multimedia API aggregation** — CLAUDE.md § Multimedia API Usage (MANDATORY) — site generation phase 2 — P1  
  Unsplash/Pexels/Pixabay images, video embeds (YouTube/Vimeo), audio (Spotify/SoundCloud) auto-discovery.

- **Favicon/icon generation** — build_validators.ts, site generation — favicon.ico, favicon-16×16, favicon-32×32, apple-touch-icon — P1  
  Required: apple-touch-icon 180×180 at root. Favicon validation (all sizes exist).

- **R2-backed static CDN** — routes/assets.ts, site publishing — site content delivery — P1  
  Files at `sites/{slug}/{version}/{file}`. Marketing pages at `marketing/index.html`. 60s KV TTL.

- **Image format validation & re-encoding** — build_validators.ts image.png_too_large rule — site validation — P1  
  No PNG >200KB except favicons (convert to WebP/JPEG). OG image ≤100KB, 1200×630.

- **Video player setup (Mux or native)** — media routes, embed support — site generation — P2  
  Auto-embedded via multimedia API, poster image, fallback link.

- **Content asset curation (sources, APIs)** — docs/PROMPTS.md § Asset Curation Philosophy — site gen — P1  
  Curated sources: Unsplash premium, licensed stock photos. No generic placeholders.

- **Lightbox/gallery component (Zoomable.js)** — build_validators.ts lightbox rule — site generation — P1  
  Enforces `data-zoomable` AND `data-gallery` strings in JS bundle. Gallery transitions, modal overlay.

- **Sitemap generation** — build_validators.ts sitemap.missing_lastmod — site publishing — P1  
  Auto-generated from page structure. Every `<url>` has `<lastmod>`. robots.txt, humans.txt auto-included.

---

## Admin Cockpit & UX Patterns (12 capabilities)

- **One dialog primitive (DialogShellComponent)** — admin/sections shared component — all admin modals — P1  
  Centralized, consistent styling. Feature icons float free (stroke=currentColor, no boxes).

- **Design tokens in _polish.scss** — frontend/src/styles/_polish.scss — theme variables — P1  
  `--ps-bg:#060610`, `--ps-ink:#f4f4ff`, `--ps-accent:#00e5ff`, `--ps-z-overlay-takeover:100000`, `--ps-radius-xl:22px`.

- **Empty state first-action launchpads** — admin/sections/empty-state.component.ts — all empty pages — P1  
  Onboarding checklist, clear primary CTA, inline guidance (never manuals). Embarrassingly easy to use.

- **Command palette** — admin/sections/command-palette.component.ts — Cmd+K — P1  
  40+ actions (search, create, navigate, settings). Keyboard-first. Fuzzy search.

- **Visibility-aware polling (AdminStateService)** — admin/admin-state.service.ts — dashboard/real-time — P1  
  30s/60s refresh paused when document.hidden, resumed + immediate refresh on foreground.

- **Onboarding checklist** — admin/sections/onboarding-checklist.component.ts — dashboard widget — P1  
  5-step flow: create site → custom domain → integrate email → publish → share. Progressive disclosure.

- **Section navigation routing** — admin/admin-section-labels.ts — /admin/:section — P1  
  188 admin sections (analytics, billing, apps, forms, social, etc.). Multi-letter chord g for quick nav.

- **Table sort via URL param** — admin/table-sort-url.util.ts — all data tables — P1  
  Persistent sort state (reload-safe), multi-column sort, export-friendly.

- **Admin-wide app iframe (BoltEmbedService)** — admin/admin.component.ts, BoltEmbedService — editor across all routes — P1  
  Persistent WebContainer iframe (boot ~30-60s once/session). Lives in AdminComponent, NOT route component.

- **Quota chip (usage display)** — admin/sections/quota-chip.component.ts — nav header — P1  
  Real-time quota usage (sites created, events tracked, storage used), upgrade prompt.

- **Notification toasts** — Spartan UI toast service — success/error/warning/info — P1  
  Toast at bottom-right, dismissible, auto-close 4s.

- **Feature flags UI** — admin/sections/feature-flags.component.ts — /admin/feature-flags — P1  
  Flag dashboard (view all, toggle, view rollout %), dark launch testing, rollback.

---

## Infra Patterns (8 capabilities)

- **Cloudflare-first doctrine** — docs/architecture/cloudflare-first.md, CLAUDE.md § Infrastructure — standing policy — P1  
  Workers + D1 + KV + R2 + Workflows + AI + Analytics Engine default. Neon/Upstash/Fly only as escape hatches.

- **D1 as SSOT (SQLite, parameterized)** — src/services/db.ts, CLAUDE.md — app state — P1  
  **NO Supabase client**. `dbQueryOne`, `dbQueryAll` wrappers. 16 tables: sites, users, domains, forms, etc. Per-site D1 via resolveSiteDataDb.

- **KV cache layer (60s TTL host resolution)** — src/services/cache.ts — host manifest, prompt hot-patch — P1  
  Custom hostname → site slug mapping cached. Prompt version hot-patch (no re-deploy).

- **R2 asset versioning** — routes/assets.ts, site publishing — site → `{slug}/{version}/` — P1  
  Immutable versioned assets. Cleanup old versions after 30 days.

- **Durable Objects for stateful ops** — EVENT_DISPATCHER DO, site-building coordination — analytics ingestion, site-gen locking — P1  
  EventDispatcher owns visitor_events flush-to-D1. Site build lock per-slug (prevents duplicate builds).

- **Cloudflare Workflows (site-generation.ts)** — src/workflows/site-generation.ts — async orchestration — P1  
  Replaces Queues (optional fallback). Workflow instance per build, resumable, visibility in Cloudflare dash.

- **Error handling (RFC7807 envelopes)** — src/types/errors.ts — all API responses — P1  
  `{ code, correlationId, errors: [], message }`. Correlated logs (requestId + traceId + tenantId).

- **RBAC middleware** — packages/shared RBAC module, context.user.org_id checks — every route guard — P1  
  org_id isolation, role-based access (admin/owner/member), site-level permissions.

---

## Top 10 First Absorptions (Ordered by Impact & Feasibility)

1. **Analytics dashboard (live + Web Vitals)** — admin/sections/analytics.component.ts, analytics.ts routes  
   _Impact: Immediate observability of Cloudflare OS usage. Feasibility: Reuse PostHog events + CF Analytics Engine._

2. **Form submissions table + lead scanner** — routes/forms.ts, admin/sections/forms.component.ts, leads.component.ts  
   _Impact: User conversion funnel visibility. Feasibility: Embed form processing directly in OS; lead scoring LATER._

3. **Webhook dispatcher + delivery status** — routes/admin_outbox.ts, webhook triggering logic  
   _Impact: Extensibility pattern for 3P integrations. Feasibility: Generic Hono middleware, D1 queue table._

4. **Feature flag UI + dark launch** — admin/sections/feature-flags.component.ts, feature_flags module  
   _Impact: Safe roll-out of new OS features. Feasibility: Reuse projectsites manifest.ts pattern._

5. **Site audit report (accessibility, SEO, perf)** — routes/api.ts audit endpoint, audit.component.ts  
   _Impact: Site health cockpit for OS playground sites. Feasibility: Axe-core + Lighthouse API, PDF export LATER._

6. **Stripe billing integration** — routes/billing*.ts, admin/sections/billing.component.ts  
   _Impact: Monetization foundation. Feasibility: Webhook sync, customer portal link, usage-based pricing model._

7. **Custom domain + DNS management** — routes/api.ts domain endpoints, domains.component.ts  
   _Impact: User-owned domains on OS. Feasibility: CF native hostname API, validation via DNS checks._

8. **One dialog primitive + design tokens** — admin/DialogShellComponent, _polish.scss  
   _Impact: Consistent, gorgeous UI. Feasibility: Copy Spartan UI + design tokens directly._

9. **Logo generation + light/dark theme** — prompts/logo-generator.prompt.md, theme service  
   _Impact: Auto-branded OS experiences. Feasibility: Claude API via AI Gateway, luminance → CSS vars._

10. **Embarrassingly easy onboarding checklist** — admin/onboarding-checklist.component.ts, empty-state.component.ts  
    _Impact: First-time success (Brian's SUPREME mandate). Feasibility: 5-step inline flow, no modal dialogs._

---

## Absorption Principles

- **Stable ↔ Frontier:** projectsites.dev = battle-tested, 188+ features; megabyte.space = experimental, Cloudflare OS playground.
- **Minimal placement:** Don't copy entire surfaces. Absorb narrow, high-impact capabilities into existing Cloudflare OS patterns (e.g., analytics card in dashboard, domain form in settings).
- **Cloudflare-native first:** Prefer CF primitives (D1/KV/Analytics Engine/Workflows) over parity with projectsites.dev's escape hatches (Neon/Upstash/Sentry).
- **Feature-flag gated:** Every absorption behind a typed flag (manifest.ts). Dark launch before wide rollout.
- **Reuse over rebuild:** Prompts, middleware, UX components are portable. Feature modules scale to Cloudflare OS.


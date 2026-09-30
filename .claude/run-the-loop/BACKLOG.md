# BACKLOG — the live queue (frontier)

> The frontier the loop advances: one Next unit per workstream + executable Acceptance.
> Advanced lines get ticked with the closing SHA + prod proof; completed workstreams move to
> § Done. Discovery roles APPEND deduplicated next-wave items every fire (zero-append =
> under-scan). Requirement inputs: `./ULTIMATE-REQUIREMENTS.md` (agent C) +
> `./PROJECTSITES-ABSORPTION.md` (agent B) — consult BOTH before picking absorption slices;
> reference, never recreate.

## Format

- One `### WS-<n> — <name>` block per workstream: **Mission** · **Cadence** · frontier items.
- Frontier item: `- [ ] <slice> — accept: <executable criteria (command + expected output /
  prod URL + assertion)>`. Ticked: `- [x] <slice> (fire-<n>, <sha>, <proof>)`.
- New workstreams append below; discovery drops raw finds into § Next-wave inbox; convergence
  dedupes them into workstreams.

## Workstreams

### WS-1 — Estate path (the priority journey)
- Mission: apex WebGL homepage → `/login` 302 → Access gate → OS shell → absorbed surfaces —
  green + gorgeous + embarrassingly easy, end-to-end, every fire.
- Cadence: every-loop
- [ ] Baseline the estate path — accept: fresh `node scripts/verify-prod.mjs` 6/6 output +
  Playwright apex journey (0 console errors, settled WebGL hero, browser-header `/login` 302)
  + service-token OS shell fetch (200, not an Access page), screenshots + `LEDGER.md` entry.

### WS-2 — ProjectSites absorption
- Mission: absorb projectsites.dev capability (Notion-like tables/grids/charts ·
  Airtable-level automation on SQLite/D1/DO · Coinbase-Pro-density dashboards · integrations)
  into the OS UI — minimal, visually-inspected, perfectly-placed, flag-gated, starter-owned
  layers only.
- Cadence: every-loop
- [ ] Pick the FIRST absorption slice from `./PROJECTSITES-ABSORPTION.md` (highest value ×
  lowest overlay risk) — accept: slice live behind a default-OFF flag on
  `os.megabyte.space`, screenshot + vision verdict ≥8/10, display-vs-store reconciled,
  `LEDGER.md` entry with SHA + prod proof.

### WS-3 — Beautify-10x
- Mission: every created/visited surface iteratively more gorgeous; per-surface pass-count +
  vision score tracked in `.claude/modifier-matrix.json`.
- Cadence: every-loop
- [ ] Seed `.claude/modifier-matrix.json` with the estate's surfaces (apex hero · apex
  sections · `/login` funnel · OS shell · Workshop · first absorbed surface) at pass 0 + first
  vision scores — accept: matrix committed with ≥6 scored surfaces + the lowest-scored one
  named as next fire's beautify target.

### WS-4 — Deep UI Explorer bootstrap
- Mission: state-graph coverage of BOTH surfaces with real vision verdicts feeding the matrix
  (standing role 17).
- Cadence: every-loop
- [ ] Bootstrap `e2e/deep-ui-explorer/` (explorer.mjs · vision-review.mjs ·
  coverage-ledger.json) with the apex fully walked + the OS shell walked via service-token
  context — accept: coverage ledger committed; run manifest records provider + session id;
  every capture has a schema-validated vision verdict via AI Gateway `megabyte-os`.

### WS-5 — Long-Trail TDD case 001
- Mission: one checkpointed 60-100-action case ground to completion across fires (standing
  role 16; lease + checkpoint + resource prefix per the `long-trail-tdd` skill).
- Cadence: every-loop
- [ ] Design + start case 001 on the estate path — accept: checkpoint file committed with the
  case design (surfaces · action plan · lease) + ≥20 actions executed with screenshots.

### WS-6 — Upstream Sync
- Mission: the pinned `cloudflare-os` submodule bumped deliberately to reviewed refs; overlay
  rebased clean; never blind bumps or in-tree edits.
- Cadence: every-2-loops (lane 18)
- [ ] Inventory the current pin vs upstream HEAD (delta commits · release notes ·
  deprecations) → decision table (pilot / backlog / watch / reject-with-reason) — accept:
  table in `LEDGER.md`; NO pointer move without `pnpm check` + `pnpm deploy` + 6/6 in the
  same fire.

### WS-7 — Loop hardening
- Mission: the loop improves itself every fire (≥1 improvement, role 15).
- Cadence: every-loop
- [ ] Port the fire-lock script (file-lease → `scripts/loop-fire-lock.mjs` with
  claim/heartbeat/release + exit 3 = coalesce) — accept: script committed + command §0
  updated to prefer it + a stale-lease reclaim test.

## Next-wave inbox (discovery appends here; convergence dedupes into workstreams)

- (empty — first fire populates)

## Done

- (empty)

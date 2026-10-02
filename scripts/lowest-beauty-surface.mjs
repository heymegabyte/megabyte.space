#!/usr/bin/env node
/**
 * lowest-beauty-surface — read .claude/modifier-matrix.json and name the
 * Beautify-10x target for THIS fire: the lowest-scored ACTIONABLE surface.
 *
 * Implements the WS-3 doctrine ("UX/Visual targets the LOWEST-scored visited
 * surface each fire") as a deterministic picker instead of an eyeballed scan of
 * a 128-line JSON blob — so every future fire's role-5 selection is fast +
 * reproducible, and a surface below the bar can't be silently skipped.
 *
 * ACTIONABLE = built + scored (aiVisionScore > 0) AND not superseded. A score-0
 * surface is unbuilt (os.admin, os.database-studio) — skipped until it exists.
 * os.login is the stock CF Access page, being REPLACED by WS-8 Better Auth —
 * never a beautify target. A surface at/above STAYS_HOT (9.5) is "cool": still
 * printed, but the picker prefers anything below the bar.
 *
 * Usage: node scripts/lowest-beauty-surface.mjs [--json]
 * Exit 0 always (advisory — informs slice selection, never gates a build).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STAYS_HOT = 9.5; // the Beautify-10x ratchet bar (modifier-matrix $doc)
const SUPERSEDED = new Set(["os.login"]); // stock Access page — replaced, not beautified

const matrix = JSON.parse(readFileSync(join(ROOT, ".claude", "modifier-matrix.json"), "utf8"));
const rows = Object.entries(matrix.surfaces)
  .map(([key, s]) => ({
    key,
    score: s.aiVisionScore ?? 0,
    passes: s.beautifyPasses ?? 0,
    lastVisit: s.lastVisit ?? null,
    lever: (s.next && s.next[0]) || "(no lever queued)",
  }))
  .filter((r) => r.score > 0 && !SUPERSEDED.has(r.key));

// ascending by score, then fewer passes, then older lastVisit (null sorts oldest)
rows.sort(
  (a, b) =>
    a.score - b.score ||
    a.passes - b.passes ||
    String(a.lastVisit ?? "0").localeCompare(String(b.lastVisit ?? "0")),
);

const hot = rows.filter((r) => r.score < STAYS_HOT);
const target = hot[0] ?? rows[0] ?? null;

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ target, ranked: rows, staysHot: STAYS_HOT, hotCount: hot.length }, null, 2));
  process.exit(0);
}

console.log(`Beautify-10x target (lowest actionable surface, bar ${STAYS_HOT}):`);
if (!target) {
  console.log("  — no actionable surface found (all unbuilt or superseded)");
  process.exit(0);
}
console.log(`\n  → ${target.key}  ${target.score}/10  (${target.passes} passes)  — ${target.lever}\n`);
console.log("  ranked ascending:");
for (const r of rows) {
  console.log(
    `    ${r.score < STAYS_HOT ? "🔥" : "✓ "} ${r.key.padEnd(22)} ${String(r.score).padStart(4)}/10  ${r.passes}p  ${r.lastVisit ?? "never"}`,
  );
}
console.log(`\n  ${hot.length} below ${STAYS_HOT} (hot) · ${rows.length - hot.length} at/above (cool)`);

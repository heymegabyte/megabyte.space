#!/usr/bin/env node
/**
 * matrix-summary — a compact one-line-per-surface view of `.claude/modifier-matrix.json`.
 *
 * WHY (loop-improvement, fire-218): the matrix is ~600 lines / ~49K tokens, so reading it whole at the
 * loop's §0 orient TRUNCATES (the Read cap is ~25K) — the lead can't see every surface's Beautify-10x
 * state or reliably find the lowest-scored (hottest) surface to target this fire. This prints each
 * surface as one line — score · passes · density · lastVisit · its top `next` item — sorted by score
 * ASCENDING so the hottest surfaces lead, then a tally. ~40 lines instead of 49K tokens.
 *
 * Usage: node scripts/matrix-summary.mjs            # all surfaces, hottest first
 *        node scripts/matrix-summary.mjs --hot      # only surfaces below 9.5
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MATRIX = join(ROOT, ".claude", "modifier-matrix.json");

const m = JSON.parse(readFileSync(MATRIX, "utf8"));
const hotOnly = process.argv.includes("--hot");

const rows = Object.entries(m.surfaces ?? {}).map(([key, s]) => ({
  key,
  score: typeof s.aiVisionScore === "number" ? s.aiVisionScore : 0,
  passes: typeof s.beautifyPasses === "number" ? s.beautifyPasses : 0,
  density: typeof s.density === "number" ? s.density : 0,
  lastVisit: s.lastVisit ?? "?",
  next: Array.isArray(s.next) && s.next[0] ? String(s.next[0]) : "",
}));
// Hottest first: lowest score, then fewest passes — exactly what Beautify-10x targets.
rows.sort((a, b) => a.score - b.score || a.passes - b.passes);

const pad = (v, n) => String(v).padEnd(n);
const padl = (v, n) => String(v).padStart(n);
const shown = hotOnly ? rows.filter((r) => r.score < 9.5) : rows;

console.log(`${pad("surface", 24)} ${padl("score", 5)} ${padl("pass", 4)} ${padl("dens", 4)}  ${pad("lastVisit", 10)}  next (top item)`);
console.log("-".repeat(110));
for (const r of shown) {
  const next = r.next.length > 56 ? `${r.next.slice(0, 53)}…` : r.next;
  console.log(`${pad(r.key, 24)} ${padl(r.score, 5)} ${padl(r.passes, 4)} ${padl(r.density, 4)}  ${pad(r.lastVisit, 10)}  ${next}`);
}
const below = rows.filter((r) => r.score < 9.5);
console.log("-".repeat(110));
console.log(
  `${rows.length} surfaces · ${below.length} below 9.5 (hot) · lowest: ${rows[0] ? `${rows[0].key} @ ${rows[0].score}` : "n/a"}`,
);

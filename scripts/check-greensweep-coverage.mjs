#!/usr/bin/env node
/**
 * DRIFT GATE (fire-261, §8 loop-improvement) — every WS-DEMO SURFACE verifier (`scripts/verify-*.mjs`
 * whose header is tagged `WS-DEMO`) must be wired into green-sweep.mjs's CHECKS. Retires a recurring
 * mid-tail-death shortcoming: a fire SHIPS a new demo surface + its verifier, DEPLOYS, but dies before
 * adding the verifier to the coherence gate — so the surface silently LEAVES the cross-fire regression
 * net (green-sweep still prints N/N while the new surface is unguarded). It bit /budgets: fire-260
 * shipped + deployed verify-budgets.mjs but died before wiring it into green-sweep (fire-261 salvage).
 * This is the green-sweep analog of check-a11y-coverage (every route in verify-a11y) — same contract,
 * different gate. A green sweep that doesn't RUN a surface's verifier proves nothing about that surface.
 *
 * Pure static analysis (no browser, no creds, fast) → safe for the green-sweep SERIAL preamble +
 * pre-deploy. Source of truth = the WS-DEMO-tagged verifiers on disk; the covered set = the `'*.mjs'`
 * script names referenced in green-sweep.mjs. A WS-DEMO verifier DELIBERATELY excluded from the sweep
 * (none today) goes in EXCLUDE with a one-line reason — the gate then stays an honest forcing function.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS_DIR = join(ROOT, "scripts");
const GREEN = join(SCRIPTS_DIR, "green-sweep.mjs");
const JSON_OUT = process.argv.includes("--json");

if (!existsSync(GREEN)) {
  console.log(`❌ FAIL: green-sweep.mjs not found: ${GREEN}`);
  process.exit(1);
}

// WS-DEMO verifiers deliberately kept OUT of green-sweep (filename → reason). Empty today; the curated
// sweep header documents what else is deliberately out (verify-seo/cwv/*-cyan) — those aren't WS-DEMO.
const EXCLUDE = new Map([]);

// Source of truth: every scripts/verify-*.mjs whose body is tagged WS-DEMO (word-boundary, so a
// verifier merely mentioning e.g. "WS-DEMO2" wouldn't match — only the real tag).
const verifierFiles = readdirSync(SCRIPTS_DIR).filter((f) => /^verify-.*\.mjs$/.test(f));
const wsDemoVerifiers = verifierFiles.filter((f) =>
  /\bWS-DEMO\b/.test(readFileSync(join(SCRIPTS_DIR, f), "utf8")),
);

// Covered set: every single-quoted `*.mjs` script name referenced in green-sweep.mjs (CHECKS entries).
const greenSrc = readFileSync(GREEN, "utf8");
const referenced = new Set(
  [...greenSrc.matchAll(/'([A-Za-z0-9._-]+\.mjs)'/g)].map((m) => m[1]),
);

const uncovered = wsDemoVerifiers.filter((f) => !referenced.has(f) && !EXCLUDE.has(f));

// Dangling references (WARN, not fail): a CHECKS entry naming a verify-/check-/journey- script that is
// no longer on disk — a different drift (renamed/deleted verifier still wired) worth surfacing.
const dangling = [...referenced].filter(
  (name) => /^(verify|check|journey)-.*\.mjs$/.test(name) && !existsSync(join(SCRIPTS_DIR, name)),
);

const report = {
  verifierFiles: verifierFiles.length,
  wsDemoVerifiers: wsDemoVerifiers.length,
  referencedInSweep: referenced.size,
  excluded: [...EXCLUDE.keys()],
  uncovered,
  dangling,
};
console.log(JSON.stringify(report, null, 2));

if (uncovered.length) {
  console.log(
    `\n❌ FAIL: ${uncovered.length} WS-DEMO verifier(s) NOT wired into green-sweep.mjs — add them to CHECKS THIS fire:`,
  );
  for (const f of uncovered) console.log(`   ↳ ${f}`);
  console.log("   (a surface that shipped + deployed but isn't in the sweep silently left the regression net.)");
  if (!JSON_OUT) process.exit(1);
  process.exit(1);
}
if (dangling.length) console.log(`\n⚠️  WARN: green-sweep references script(s) not on disk (renamed/deleted?): ${dangling.join(", ")}`);
console.log(`\n✅ GREENSWEEP-COVERAGE GREEN: all ${wsDemoVerifiers.length} WS-DEMO verifiers are wired into green-sweep`);
process.exit(0);

#!/usr/bin/env node
// Stale-copy gate — fails if a retired-stack / slop term appears in user-visible copy.
//
// Incident this closes (fire-3, 2026-10-01): the apex shipped "Authentik SSO" in the
// How-It-Works + trust copy AFTER that IdP was dead (replaced by OTP/WARP) — a live,
// render-clean regression no console/axe/screenshot gate catches. This grep gate makes
// retired-stack words un-shippable. Extend DENY when a stack element is retired
// (per drift-detection) — keep terms HIGH-signal so minified-bundle scans don't false-positive.
//
// Scans the apex SOURCE (the copy source of truth — where the fire-3 incident lived).
// Source-only keeps the gate deterministic: no risk a minified vendor chunk (three.js,
// react) coincidentally contains a banned substring and breaks every build.
// Exit 0 = clean; 1 = a stale term found. Usage: node scripts/check-stale-copy.mjs

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// High-signal terms that must never appear in shipped copy. Case-insensitive.
// Each: the term + why it's banned (so a future reader knows before editing).
const DENY = [
  { term: "authentik", why: "dead IdP — replaced by Cloudflare Access OTP + WARP (fire-3)" },
  { term: "lorem ipsum", why: "placeholder slop" },
  { term: "coming soon", why: "incomplete-surface slop — ship the thing or omit it" },
];

const SRC_DIR = join(ROOT, "packages/home/src");
const SRC_EXTRA = [join(ROOT, "packages/home/index.html")];

/** Recursively collect files under dir matching exts. */
function collect(dir, exts) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...collect(p, exts));
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

const sourceFiles = [...collect(SRC_DIR, [".tsx", ".ts", ".css"]), ...SRC_EXTRA.filter(existsSync)];

const hits = [];
for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  const lower = text.toLowerCase();
  for (const { term, why } of DENY) {
    if (!lower.includes(term)) continue;
    text.split("\n").forEach((line, i) => {
      if (line.toLowerCase().includes(term)) hits.push({ file: file.replace(ROOT, ""), line: i + 1, term, why });
    });
  }
}

if (hits.length === 0) {
  console.log(`✅ stale-copy: clean — scanned ${sourceFiles.length} source files, 0 banned terms`);
  process.exit(0);
}
console.error(`❌ stale-copy: ${hits.length} banned term(s) in shipped copy:`);
for (const h of hits) console.error(`  • ${h.file}${h.line ? `:${h.line}` : ""} — "${h.term}" (${h.why})`);
console.error(`\nFix the copy, or (if genuinely intentional) remove the term from DENY in scripts/check-stale-copy.mjs.`);
process.exit(1);

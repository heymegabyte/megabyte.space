import test from "node:test";
import assert from "node:assert/strict";

import { CANONICAL_PATHS, fireNumber, ledgerHasEntry, parseArgs } from "./commit-fire-bookkeeping.mjs";

test("fireNumber extracts the canonical fire-<n> key from any slug", () => {
  assert.equal(fireNumber("fire-235"), "fire-235");
  assert.equal(fireNumber("fire-235-salvage-rotate"), "fire-235");
  assert.equal(fireNumber("fire-235-1791373500"), "fire-235");
  assert.equal(fireNumber(null), null);
  assert.equal(fireNumber("no-number-here"), null);
});

test("ledgerHasEntry matches a heading that names the fire", () => {
  const ledger = `# LEDGER\n\n## fire-234 — prior\n- stuff\n\n## fire-235 — Secrets stat fix\n- shipped\n`;
  assert.equal(ledgerHasEntry(ledger, "fire-235"), true);
  assert.equal(ledgerHasEntry(ledger, "fire-234"), true);
});

test("ledgerHasEntry is word-bounded — fire-23 must NOT match fire-235", () => {
  const ledger = `## fire-235 — only this one exists\n`;
  assert.equal(ledgerHasEntry(ledger, "fire-23"), false);
  assert.equal(ledgerHasEntry(ledger, "fire-2"), false);
});

test("ledgerHasEntry is false for a missing entry or empty text", () => {
  assert.equal(ledgerHasEntry("## fire-234 — prior\n", "fire-235"), false);
  assert.equal(ledgerHasEntry("", "fire-235"), false);
  assert.equal(ledgerHasEntry("## fire-235\n", null), false);
});

test("ledgerHasEntry requires a heading line — a bare mention in prose does not count", () => {
  const prose = `Some paragraph mentioning fire-235 inline but not as a heading.\n`;
  assert.equal(ledgerHasEntry(prose, "fire-235"), false);
});

test("parseArgs reads --fire and --note", () => {
  assert.deepEqual(parseArgs(["--fire", "fire-235", "--note", "shipped X"]), {
    fire: "fire-235",
    note: "shipped X",
  });
  assert.deepEqual(parseArgs(["--fire", "fire-9"]), { fire: "fire-9", note: null });
  assert.deepEqual(parseArgs([]), { fire: null, note: null });
});

test("CANONICAL_PATHS is bookkeeping-only — never source or scripts", () => {
  assert.ok(CANONICAL_PATHS.includes(".claude/run-the-loop/LEDGER.md"));
  assert.ok(CANONICAL_PATHS.includes(".claude/modifier-matrix.json"));
  for (const p of CANONICAL_PATHS) {
    assert.ok(!p.startsWith("packages/"), `${p} must not be a source path`);
    assert.ok(!p.startsWith("scripts/"), `${p} must not be a scripts path`);
  }
});

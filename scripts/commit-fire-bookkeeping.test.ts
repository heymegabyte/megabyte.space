import test from "node:test";
import assert from "node:assert/strict";

import { CANONICAL_PATHS, fireNumber, ledgerHasEntry, ledgerWithEntry, parseArgs } from "./commit-fire-bookkeeping.mjs";

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

test("ledgerHasEntry: a heading for ANOTHER fire that mentions this fire mid-line does NOT match (fire-242 guard)", () => {
  // Real fire-242 regression: fire-241's reconstruction heading referenced fire-242 in its own text
  // ("reconstructed by fire-242 from the git log"). The old `.*\\bfire-242\\b` regex matched that
  // heading, so commit-fire-bookkeeping thought fire-242 was "already present" and SILENTLY dropped
  // the append. The fire number must come IMMEDIATELY after the heading marker to count.
  const ledger = `## fire-241 — meta-gate [this entry reconstructed by fire-242 from the git log]\n- salvaged two fires\n`;
  assert.equal(ledgerHasEntry(ledger, "fire-242"), false, "mid-line fire-242 in a fire-241 heading is NOT a fire-242 entry");
  assert.equal(ledgerHasEntry(ledger, "fire-241"), true, "the fire-241 heading still matches fire-241");
});

test("parseArgs reads --fire, --note, and --ledger-file", () => {
  assert.deepEqual(parseArgs(["--fire", "fire-235", "--note", "shipped X"]), {
    fire: "fire-235",
    note: "shipped X",
    ledgerFile: null,
  });
  assert.deepEqual(parseArgs(["--fire", "fire-9"]), { fire: "fire-9", note: null, ledgerFile: null });
  assert.deepEqual(parseArgs([]), { fire: null, note: null, ledgerFile: null });
  assert.deepEqual(parseArgs(["--fire", "fire-237", "--ledger-file", "/tmp/entry.md"]), {
    fire: "fire-237",
    note: null,
    ledgerFile: "/tmp/entry.md",
  });
});

test("ledgerWithEntry appends the entry when the LEDGER lacks it", () => {
  const ledger = `# LEDGER\n\n## fire-236 — prior\n- shipped\n`;
  const entry = `## fire-237 — strand fix\n- did a thing\n`;
  const res = ledgerWithEntry(ledger, entry, "fire-237");
  assert.equal(res.action, "append");
  if (res.action !== "append") return; // narrow the discriminated union for tsc
  assert.ok(ledgerHasEntry(res.text, "fire-237"), "appended text carries the fire-237 heading");
  assert.ok(ledgerHasEntry(res.text, "fire-236"), "appended text preserves the prior entry");
  // exactly one blank line separates the prior tail from the new entry; file ends in a single newline
  assert.ok(res.text.includes("- shipped\n\n## fire-237"), "single blank-line separator");
  assert.ok(res.text.endsWith("\n") && !res.text.endsWith("\n\n"), "one trailing newline");
});

test("ledgerWithEntry is idempotent — skips when the entry already exists (no double-append)", () => {
  const ledger = `# LEDGER\n\n## fire-237 — already here\n- shipped\n`;
  const res = ledgerWithEntry(ledger, `## fire-237 — re-run\n- again\n`, "fire-237");
  assert.equal(res.action, "skip");
  assert.ok(!("text" in res), "skip carries no text payload");
});

test("ledgerWithEntry refuses an entry that does not name the fire (wrong-fire / junk guard)", () => {
  const res = ledgerWithEntry("# LEDGER\n", `## fire-999 — someone else\n- x\n`, "fire-237");
  assert.equal(res.action, "error");
  const bare = ledgerWithEntry("# LEDGER\n", `just some prose mentioning fire-237\n`, "fire-237");
  assert.equal(bare.action, "error", "a bare prose mention is not a heading — refuse");
});

test("ledgerWithEntry refuses a null fire number", () => {
  assert.equal(ledgerWithEntry("# LEDGER\n", "## fire-237 — x\n", null).action, "error");
});

test("CANONICAL_PATHS is bookkeeping-only — never source or scripts", () => {
  assert.ok(CANONICAL_PATHS.includes(".claude/run-the-loop/LEDGER.md"));
  assert.ok(CANONICAL_PATHS.includes(".claude/modifier-matrix.json"));
  for (const p of CANONICAL_PATHS) {
    assert.ok(!p.startsWith("packages/"), `${p} must not be a source path`);
    assert.ok(!p.startsWith("scripts/"), `${p} must not be a scripts path`);
  }
});

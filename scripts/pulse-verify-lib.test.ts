import test from "node:test";
import assert from "node:assert/strict";

import { classifyPulseExercisability, ALL_CLEAR_RE, LOAD_ERROR_RE } from "./pulse-verify-lib.mjs";

test("RUN when ≥1 opportunity is present (the full causal proof path)", () => {
  const r = classifyPulseExercisability({ cards: 2, bodyText: "two cards", consoleErrors: 0 });
  assert.equal(r.action, "run");
});

test("RUN with a single opportunity (fire-161 relaxed the floor to ≥1)", () => {
  assert.equal(classifyPulseExercisability({ cards: 1, bodyText: "", consoleErrors: 0 }).action, "run");
});

test("SKIP when all-clear: 0 cards + a genuine all-clear marker + 0 errors", () => {
  const r = classifyPulseExercisability({ cards: 0, bodyText: "You're all clear — nothing here right now", consoleErrors: 0 });
  assert.equal(r.action, "skip");
});

test("SKIP also matches the 'no opportunities' / 'all caught up' phrasings", () => {
  assert.equal(classifyPulseExercisability({ cards: 0, bodyText: "no opportunities", consoleErrors: 0 }).action, "skip");
  assert.equal(classifyPulseExercisability({ cards: 0, bodyText: "You're all caught up", consoleErrors: 0 }).action, "skip");
});

test("FAIL when 0 cards + a load-error marker (a real regression, NOT all-clear)", () => {
  const r = classifyPulseExercisability({ cards: 0, bodyText: "We couldn't load your opportunities", consoleErrors: 0 });
  assert.equal(r.action, "fail");
});

test("FAIL when 0 cards + no marker at all (blank/broken, never settled)", () => {
  const r = classifyPulseExercisability({ cards: 0, bodyText: "Opportunities Megabyte found for you", consoleErrors: 0 });
  assert.equal(r.action, "fail");
});

test("FAIL when 0 cards + console errors even if an all-clear marker is present (broken surface)", () => {
  const r = classifyPulseExercisability({ cards: 0, bodyText: "all clear", consoleErrors: 3 });
  assert.equal(r.action, "fail");
});

test("console errors do NOT suppress the RUN path when cards exist (full proof catches them later)", () => {
  // ≥1 card always RUNs so the existing end-of-proof console-error assertion still fires.
  assert.equal(classifyPulseExercisability({ cards: 1, bodyText: "all clear", consoleErrors: 5 }).action, "run");
});

test("ALL_CLEAR_RE matches each known empty phrasing", () => {
  for (const s of ["all clear", "all caught up", "nothing here right now", "no opportunities"]) {
    assert.ok(ALL_CLEAR_RE.test(s), `expected ALL_CLEAR_RE to match ${JSON.stringify(s)}`);
  }
});

test("LOAD_ERROR_RE matches the known load-failure phrasing", () => {
  assert.ok(LOAD_ERROR_RE.test("couldn't load your opportunities"));
});

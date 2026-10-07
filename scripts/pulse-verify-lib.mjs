/**
 * Pulse persistence-verifier exercisability classifier (fire-243 loop-improvement §8).
 *
 * `verify-pulse-persist` + `verify-pulse-snooze` prove SERVER-SIDE persistence by dismissing/snoozing
 * a REAL opportunity in one browser context and confirming it's gone in a FRESH one. That proof can
 * only run when the ba-e2e account actually HAS an opportunity — and that count is MUTABLE: it drops
 * to 0 ("all clear") as the account's signals resolve (fire-161 already relaxed the floor ≥2→≥1 for
 * the same reason; it has now reached 0). A hard-fail on 0 opportunities makes BOTH gates red-forever
 * on a legitimately-clean account, which reds the whole green-sweep (the
 * [[permanently-red-gate-causes-starvation]] + [[pure-logic-unit-test-beats-mutable-account-verify]]
 * classes).
 *
 * `verify-pulse.mjs` already draws the right line: an account with 0 cards but a genuine ALL-CLEAR
 * state is VALID ("Only a blank/broken surface fails"). This helper ports that exact distinction to
 * the two persistence verifiers so a clean account SKIPS the un-exercisable proof (exit 0) instead of
 * hard-failing — while a blank / load-errored / console-erroring surface still FAILS, and a populated
 * account still RUNS the full causal proof. Pure + exhaustively unit-tested (pulse-verify-lib.test.ts);
 * the browser verifier is a thin driver over this one decision.
 */

// Settled /pulse empty / error markers — kept verbatim-compatible with verify-pulse.mjs's regexes so
// whatever body text passes there classifies identically here.
export const ALL_CLEAR_RE = /all clear|all caught up|nothing .* right now|no opportunities/i
export const LOAD_ERROR_RE = /couldn.t load your opportunities/i

/**
 * Decide whether the dismiss/snooze persistence proof can run against the settled /pulse state.
 *
 * @param {{ cards: number, bodyText: string, consoleErrors: number }} state
 *   cards         — count of opportunity cards (Dismiss buttons) on the settled surface
 *   bodyText      — document.body.innerText of the settled surface
 *   consoleErrors — console/page errors captured so far on this context
 * @returns {{ action: 'run' | 'skip' | 'fail', reason: string }}
 *   run  — ≥1 opportunity: exercise the full causal proof (unchanged behavior)
 *   skip — 0 opportunities + a genuine all-clear state + no errors: not exercisable, surface healthy
 *   fail — a blank / load-errored / console-erroring surface (a real regression, never an all-clear)
 */
export function classifyPulseExercisability({ cards, bodyText, consoleErrors }) {
  const body = bodyText || ''
  if (cards >= 1) {
    return { action: 'run', reason: `${cards} opportunit${cards === 1 ? 'y' : 'ies'} present — exercising the persistence proof` }
  }
  // cards === 0 — the dismiss/snooze proof cannot run. Legitimate (all-clear) or a regression?
  if (consoleErrors > 0) {
    return { action: 'fail', reason: `0 opportunities AND ${consoleErrors} console error(s) — surface broken, not a clean all-clear` }
  }
  if (LOAD_ERROR_RE.test(body)) {
    return { action: 'fail', reason: `/pulse couldn't load opportunities (not an all-clear state) — regression` }
  }
  if (ALL_CLEAR_RE.test(body)) {
    return { action: 'skip', reason: `account all-clear (0 opportunities) — dismiss/snooze path not exercisable; surface healthy (0 console errors)` }
  }
  return { action: 'fail', reason: `0 cards and no all-clear marker — blank/broken /pulse (did not settle)` }
}

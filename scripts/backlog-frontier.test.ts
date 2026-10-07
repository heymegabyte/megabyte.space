import test from "node:test";
import assert from "node:assert/strict";

import { parseFrontier, renderFrontier } from "./backlog-frontier.mjs";

const FIXTURE = `# BACKLOG

## Format
- item that is not a checkbox

## Workstreams

### WS-N1 — Opportunity Engine
- [x] shipped slice (fire-1, abc123) — accept: done already
- [ ] OPEN detector slice — accept: unit test green + prod URL
- [~] partially-folded slice — accept: decide fold vs split

### WS-DEMO — demoable
- [x] another done one
- [ ] a very long open slice ${"x".repeat(300)} — accept: should be truncated hard

## Next-wave inbox
- [ ] inbox idea one
- [ ] inbox idea two

## Done
- [x] a historical done item (must NOT appear + must NOT be grouped)
- [x] another historical done item
`;

test("parseFrontier extracts only open + partial items, grouped by workstream", () => {
  const { workstreams, counts } = parseFrontier(FIXTURE);
  const names = workstreams.map((w) => w.heading.split(" — ")[0]);
  // WS-N1, WS-DEMO, Next-wave inbox each have ≥1 open/partial; Format/Workstreams/Done do not.
  assert.deepEqual(names, ["WS-N1", "WS-DEMO", "Next-wave inbox"]);
});

test("done items are excluded from collected items but counted", () => {
  const { workstreams, counts } = parseFrontier(FIXTURE);
  const n1 = workstreams.find((w) => w.heading.startsWith("WS-N1"))!;
  assert.equal(n1.items.length, 2); // one [ ] + one [~]
  assert.equal(n1.items.filter((i) => i.status === "open").length, 1);
  assert.equal(n1.items.filter((i) => i.status === "partial").length, 1);
  assert.equal(counts.open, 4); // 1 WS-N1 + 1 WS-DEMO + 2 inbox
  assert.equal(counts.partial, 1);
  // 2 done before Done section + 2 inside Done section = 4 counted, 0 collected.
  assert.equal(counts.done, 4);
});

test("the Done section is a hard stop — its items never group into a workstream", () => {
  const { workstreams } = parseFrontier(FIXTURE);
  assert.equal(
    workstreams.some((w) => w.heading.toLowerCase().startsWith("done")),
    false,
  );
  // Nothing from the Done section leaked into the last real workstream.
  const inbox = workstreams.find((w) => w.heading.startsWith("Next-wave"))!;
  assert.equal(inbox.items.length, 2);
});

test("accept-criteria is trimmed and long slices are truncated for glanceability", () => {
  const { workstreams } = parseFrontier(FIXTURE, { maxLen: 60 });
  const n1open = workstreams
    .find((w) => w.heading.startsWith("WS-N1"))!
    .items.find((i) => i.status === "open")!;
  assert.equal(n1open.text.includes("accept:"), false); // accept criteria dropped
  const demoOpen = workstreams.find((w) => w.heading.startsWith("WS-DEMO"))!.items[0];
  assert.ok(demoOpen.text.length <= 60, `expected ≤60, got ${demoOpen.text.length}`);
  assert.ok(demoOpen.text.endsWith("…"));
});

test("renderFrontier produces a compact text block far smaller than the source", () => {
  const out = renderFrontier(parseFrontier(FIXTURE));
  assert.match(out, /BACKLOG frontier/);
  assert.match(out, /4 open/);
  assert.match(out, /WS-N1/);
  assert.equal(out.includes("historical done item"), false);
  assert.ok(out.length < FIXTURE.length, "render should be smaller than source");
});

#!/usr/bin/env node
// backlog-frontier.mjs — extract the OPEN frontier from the 968-line BACKLOG so a
// fire can orient cheaply. Reading the whole BACKLOG blows the main-thread token cap
// (fire-234: the Read hit the 25K cap at line 86/969); the loop only ever needs the
// unticked frontier at orient. Prints open + partial items grouped by workstream,
// trims accept-criteria, truncates long slices. `--json` for machine reads.
//
// Pure `parseFrontier` + `renderFrontier` are unit-tested (backlog-frontier.test.ts);
// the CLI is a thin wrapper. Secret-free, read-only.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_BACKLOG_PATH = join(REPO_ROOT, ".claude", "run-the-loop", "BACKLOG.md");

const CHECKBOX = /^(\s*)- \[([ x~])\]\s+(.*)$/;
const HEADING = /^(#{2,3})\s+(.*)$/;

/**
 * @typedef {{ status: "open" | "partial", text: string }} FrontierItem
 * @typedef {{ heading: string, items: FrontierItem[] }} FrontierWorkstream
 * @typedef {{ workstreams: FrontierWorkstream[], counts: { open: number, partial: number, done: number } }} Frontier
 */

// Parse the markdown into { workstreams:[{heading, items:[{status,text}]}], counts }.
// The `## Done` section is a hard stop: its items are tallied but never collected.
/**
 * @param {string} markdown
 * @param {{ maxLen?: number }} [opts]
 * @returns {Frontier}
 */
export function parseFrontier(markdown, { maxLen = 140 } = {}) {
  const lines = String(markdown).split(/\r?\n/);
  const workstreams = [];
  const counts = { open: 0, partial: 0, done: 0 };
  let current = null;
  let inDone = false;

  const ensureCurrent = () => {
    if (!current) {
      current = { heading: "(top)", items: [] };
      workstreams.push(current);
    }
    return current;
  };

  for (const line of lines) {
    const heading = line.match(HEADING);
    if (heading) {
      const title = heading[2].trim();
      if (/^Done\b/i.test(title)) {
        inDone = true;
        current = null;
        continue;
      }
      current = { heading: title, items: [] };
      workstreams.push(current);
      continue;
    }

    const box = line.match(CHECKBOX);
    if (!box) continue;
    const mark = box[2];

    if (inDone) {
      if (mark === "x") counts.done++;
      continue;
    }
    if (mark === "x") {
      counts.done++;
      continue;
    }

    const status = mark === "~" ? "partial" : "open";
    counts[status]++;
    let text = box[3].trim();
    const acc = text.indexOf(" — accept:");
    if (acc > 0) text = text.slice(0, acc).trimEnd();
    if (text.length > maxLen) text = text.slice(0, maxLen - 1).trimEnd() + "…";
    ensureCurrent().items.push({ status, text });
  }

  return { workstreams: workstreams.filter((w) => w.items.length), counts };
}

// Render a compact human-readable frontier block.
/**
 * @param {Frontier} frontier
 * @param {{ headingLen?: number }} [opts]
 * @returns {string}
 */
export function renderFrontier({ workstreams, counts }, { headingLen = 90 } = {}) {
  const out = [];
  out.push(
    `BACKLOG frontier — ${counts.open} open · ${counts.partial} partial · ${counts.done} done (unticked items only; full history in BACKLOG.md)`,
  );
  out.push("");
  for (const ws of workstreams) {
    const h = ws.heading.length > headingLen ? ws.heading.slice(0, headingLen - 1) + "…" : ws.heading;
    out.push(`### ${h}  (${ws.items.length})`);
    for (const it of ws.items) {
      out.push(`  [${it.status === "partial" ? "~" : " "}] ${it.text}`);
    }
    out.push("");
  }
  return out.join("\n");
}

function main(argv) {
  const asJson = argv.includes("--json");
  const pathArg = argv.find((a) => !a.startsWith("--") && a.endsWith(".md"));
  const path = pathArg ?? DEFAULT_BACKLOG_PATH;
  let md;
  try {
    md = readFileSync(path, "utf8");
  } catch (err) {
    process.stderr.write(`backlog-frontier: cannot read ${path}: ${err.message}\n`);
    process.exit(2);
  }
  const parsed = parseFrontier(md);
  if (asJson) {
    process.stdout.write(JSON.stringify(parsed, null, 2) + "\n");
  } else {
    process.stdout.write(renderFrontier(parsed) + "\n");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}

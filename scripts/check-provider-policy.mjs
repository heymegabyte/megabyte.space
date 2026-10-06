#!/usr/bin/env node
/**
 * check-provider-policy — regression guard for the agent-provider policy
 * (SSOT: ~/.agentskills/rules/agent-provider-policy.md; repo summary: AGENTS.md).
 *
 * Internal dev/research/agent-orchestration code must NEVER call the Anthropic or OpenAI
 * inference APIs or import their SDKs — frontier work goes through the subscription CLIs
 * (`claude`/`codex` via with-subscription-cli.sh); the ONLY allowed internal API is DeepSeek.
 *
 * This scans the INTERNAL-orchestration surface (scripts/ + .claude/) — NOT the product/fork
 * (cloudflare-os) whose OpenAI/Anthropic usage is intentional product-runtime — and flags any
 * NON-COMMENT line that:
 *   · fetches api.anthropic.com / api.openai.com, or
 *   · imports the Anthropic/OpenAI SDK.
 * The bare key NAME (ANTHROPIC_API_KEY) is allowed (it appears legitimately in env-STRIP calls
 * `env -u ANTHROPIC_API_KEY`, secret-name lists, and docs) — only actual API calls/SDK imports
 * are the violation. Exit 1 on any finding.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["scripts", ".claude"]; // internal-orchestration surface
const SKIP_DIRS = new Set(["node_modules", ".wrangler", "cloudflare-os", "dist", ".git", ".screens", ".journey", "results", "__pycache__"]);
const EXT = new Set([".mjs", ".ts", ".js", ".sh", ".py", ".cjs"]);
const FORBIDDEN = [
  { rx: /api\.anthropic\.com/, why: "internal call to the Anthropic API (use `claude` subscription CLI)" },
  { rx: /api\.openai\.com/, why: "internal call to the OpenAI API (use `codex` subscription CLI)" },
  { rx: /@anthropic-ai\/sdk/, why: "Anthropic SDK import in internal orchestration" },
  { rx: /\bfrom\s+['"]openai['"]|\brequire\(\s*['"]openai['"]/, why: "OpenAI SDK import in internal orchestration" },
];
const isComment = (l) => /^\s*(\/\/|#|\*|<!--)/.test(l);

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(extname(name))) out.push(p);
  }
}

const files = [];
for (const d of SCAN_DIRS) walk(join(ROOT, d), files);

const findings = [];
for (const f of files) {
  let lines;
  try { lines = readFileSync(f, "utf8").split("\n"); } catch { continue; }
  lines.forEach((line, i) => {
    if (isComment(line)) return;
    for (const { rx, why } of FORBIDDEN) {
      if (rx.test(line)) findings.push({ file: f.replace(ROOT + "/", ""), line: i + 1, why, text: line.trim().slice(0, 120) });
    }
  });
}

console.log(`check-provider-policy: scanned ${files.length} internal-orchestration files in ${SCAN_DIRS.join(", ")}`);
if (findings.length === 0) {
  console.log("✅ PROVIDER-POLICY GREEN — no internal Anthropic/OpenAI API calls or SDK imports");
  process.exit(0);
}
console.log(`❌ ${findings.length} provider-policy violation(s) — internal agents must use subscription CLIs, not PAYG APIs:`);
for (const v of findings) console.log(`   ${v.file}:${v.line} — ${v.why}\n      ${v.text}`);
process.exit(1);

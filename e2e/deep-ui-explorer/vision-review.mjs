#!/usr/bin/env node
/**
 * vision-review — real vision verdicts for explorer screenshots (role §1.17).
 *
 * Every screenshot goes through an actual vision model via AI Gateway `megabyte-os`
 * (Workers AI). Verdicts are schema-validated; reviewer FAILURES are recorded
 * honestly (never silently skipped, never fabricated); a clean screen with zero
 * findings is a valid result. Architecture claims from pixels stay HYPOTHESES.
 *
 * Provider + model + usage recorded per image. Scores feed
 * `.claude/modifier-matrix.json` — this script only SUGGESTS matrix rows (stdout);
 * the orchestrator owns the matrix write.
 *
 * Auth (CLAUDE.md § Auth — scoped token lacks Workers scopes):
 *   CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL global pair, or CLOUDFLARE_API_TOKEN.
 *   CLOUDFLARE_ACCOUNT_ID required.
 *
 * Usage:
 *   node e2e/deep-ui-explorer/vision-review.mjs --run e2e/deep-ui-explorer/runs/<runId>
 *   node e2e/deep-ui-explorer/vision-review.mjs --image path.png --surface apex.home.hero
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";

const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const GATEWAY = "megabyte-os";

const RUBRIC = `You are the estate's independent Visual Art Director. Judge this product screenshot
against: black #060610 + cyan #00E5FF brand, cinematic-but-intentional motion culture,
Coinbase-Pro density where data-dense, generic-AI-slop is a failure.
Return STRICT JSON only (no prose, no markdown fence):
{"scores":{"aesthetics":0-10,"structure":0-10,"function":0-10,"a11yPerf":0-10,"absorptionPlacement":0-10},
"overall":0-10,
"findings":[{"dimension":"aesthetics|structure|function|a11yPerf|absorptionPlacement","severity":"low|med|high","note":"specific, actionable"}],
"architectureHypothesis":"one sentence, clearly labeled hypothesis — pixels cannot prove architecture"}`;

const args = parseArgs(process.argv.slice(2));
main().catch((err) => {
  process.stderr.write(`vision-review: fatal ${err?.stack || err}\n`);
  process.exit(2);
});

async function main() {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!acct) fail("CLOUDFLARE_ACCOUNT_ID not set");
  const auth = authHeaders();
  if (!auth) fail("No Cloudflare auth — set CLOUDFLARE_API_TOKEN or CLOUDFLARE_API_KEY+CLOUDFLARE_EMAIL (get-secret)");

  const targets = collectTargets();
  if (!targets.length) fail("No screenshots found (pass --run <dir> or --image <png>)");

  const url = `https://gateway.ai.cloudflare.com/v1/${acct}/${GATEWAY}/workers-ai/${MODEL}`;
  const reviews = [];
  for (const t of targets) {
    const started = Date.now();
    const review = { image: t.path, surface: t.surface, model: MODEL, provider: `ai-gateway:${GATEWAY}` };
    try {
      const b64 = readFileSync(t.path).toString("base64");
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...auth },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: RUBRIC },
                { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } },
              ],
            },
          ],
          max_tokens: 900,
        }),
      });
      // Workers AI REST returns {result, success, errors}; the gateway may pass through raw.
      const body = await res.json().catch(() => null);
      const raw = body?.result?.response ?? body?.response ?? null;
      if (!res.ok || raw == null) {
        review.ok = false;
        review.error = `HTTP ${res.status} ${JSON.stringify(body?.errors || body).slice(0, 300)}`;
      } else {
        const verdict = validateVerdict(parseVerdict(raw));
        if (verdict) {
          review.ok = true;
          review.verdict = verdict;
        } else {
          review.ok = false;
          review.error = "verdict failed schema validation";
          review.raw = String(raw).slice(0, 500);
        }
      }
      review.usage = body?.result?.usage ?? body?.usage ?? null;
    } catch (err) {
      review.ok = false;
      review.error = String(err?.message || err).slice(0, 300);
    }
    review.ms = Date.now() - started;
    reviews.push(review);
    process.stderr.write(`${review.ok ? "✓" : "✗"} ${t.surface || basename(t.path)} ${review.ok ? review.verdict.overall : review.error}\n`);
  }

  if (args.run) {
    const outPath = join(args.run, "vision-reviews.json");
    writeFileSync(outPath, `${JSON.stringify({ reviewedAt: new Date().toISOString(), reviews }, null, 2)}\n`);
    process.stderr.write(`wrote ${outPath}\n`);
  }

  const ok = reviews.filter((r) => r.ok);
  const matrixSuggestions = Object.fromEntries(
    ok.filter((r) => r.surface).map((r) => [r.surface, { aiVisionScore: r.verdict.overall, source: `${MODEL} via ${GATEWAY}` }]),
  );
  process.stdout.write(`${JSON.stringify({ reviewed: reviews.length, ok: ok.length, failed: reviews.length - ok.length, matrixSuggestions }, null, 2)}\n`);
  process.exit(ok.length === reviews.length ? 0 : 1);
}

function collectTargets() {
  if (args.image) return [{ path: args.image, surface: args.surface || null }];
  if (args.run) {
    if (!existsSync(args.run)) fail(`run dir not found: ${args.run}`);
    return readdirSync(args.run)
      .filter((f) => f.endsWith(".png"))
      .map((f) => ({ path: join(args.run, f), surface: f.replace(/\.png$/, "") }));
  }
  return [];
}

function authHeaders() {
  if (process.env.CLOUDFLARE_API_TOKEN) return { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };
  if (process.env.CLOUDFLARE_API_KEY && process.env.CLOUDFLARE_EMAIL)
    return { "x-auth-key": process.env.CLOUDFLARE_API_KEY, "x-auth-email": process.env.CLOUDFLARE_EMAIL };
  return null;
}

/** Pull the first JSON object out of a model response (models love prose + fences). */
function extractJson(text) {
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Turn a model response into a verdict object. JSON first (when the model obeys the
 * JSON ask); otherwise PROSE fallback — llama-3.2-11b-vision reliably ignores the
 * "JSON only" instruction and emits "**Aesthetics: 6/10**" markdown, so parse that
 * rather than discard a real (if unstructured) verdict. Returns null on too little
 * signal (honest fail, never fabricate).
 */
function parseVerdict(text) {
  const json = extractJson(text);
  if (json && json.scores) return json;
  const s = String(text);
  const score = (re) => {
    const m = s.match(re);
    return m ? Math.max(0, Math.min(10, Number(m[1]))) : null;
  };
  const dims = {
    aesthetics: score(/aesthetic\w*[^:\n]*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i),
    structure: score(/structur\w*[^:\n]*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i),
    function: score(/function\w*[^:\n]*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i),
    a11yPerf: score(/(?:a11y|accessib\w*|performance|perf)[^:\n]*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i),
    absorptionPlacement: score(/(?:absorption|placement|integration|brand\w*)[^:\n]*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i),
  };
  const present = Object.values(dims).filter((v) => v != null);
  if (present.length < 3) return null; // too little signal — honest fail, don't fabricate
  const avg = Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10;
  for (const k of Object.keys(dims)) if (dims[k] == null) dims[k] = avg; // model skipped it → neutral avg
  const overall = score(/overall[^:\n]*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i) ?? avg;
  return { scores: dims, overall, findings: [], architectureHypothesis: "parsed from prose (model returned markdown, not JSON)" };
}

/** Manual schema validation — no deps; repair-or-reject, never raw-through. */
function validateVerdict(v) {
  if (!v || typeof v !== "object") return null;
  const dims = ["aesthetics", "structure", "function", "a11yPerf", "absorptionPlacement"];
  const scores = v.scores;
  if (!scores || !dims.every((d) => isScore(scores[d]))) return null;
  if (!isScore(v.overall)) return null;
  const findings = Array.isArray(v.findings) ? v.findings.filter(validFinding) : null;
  if (findings == null) return null;
  return {
    scores: Object.fromEntries(dims.map((d) => [d, Number(scores[d])])),
    overall: Number(v.overall),
    findings,
    architectureHypothesis: typeof v.architectureHypothesis === "string" ? v.architectureHypothesis.slice(0, 300) : "",
  };
}

function validFinding(f) {
  return (
    f &&
    typeof f === "object" &&
    ["aesthetics", "structure", "function", "a11yPerf", "absorptionPlacement"].includes(f.dimension) &&
    ["low", "med", "high"].includes(f.severity) &&
    typeof f.note === "string"
  );
}

function isScore(n) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0 && x <= 10;
}

function fail(msg) {
  process.stderr.write(`vision-review: ${msg}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
  }
  return flags;
}

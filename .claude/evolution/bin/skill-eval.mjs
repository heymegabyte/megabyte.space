#!/usr/bin/env node
// Champion / Challenger + Counterfactual eval harness — megabyte.space Evolution Kernel.
//
// WHAT THIS IS
//   The executable half of kernel/README "How a change gets promoted" step 4: runs
//   champion vs challenger vs minimal vs no-skill over an eval suite, has an INDEPENDENT
//   judge score each output (blind to which variant produced it), then applies
//   kernel/policies.md §3 (promotion-policy) to emit one decision + an evidence bundle.
//
// CONTRACTS (these are LAW — see kernel/evidence-schema.md):
//   INPUT  — Eval CASE  (evals/cases/*.json): { id, origin, source_ref, tier, task,
//            context?, grader{kind,spec,pass_threshold}, must_not[], tags[] }
//   OUTPUT — Eval RESULT (evals/results/<run>.json): { run, when, skill, variants[],
//            per_case[{case,scores}], win_rates{}, decision, rationale, judge, cost,
//            holdout_used } + a one-line append to evals/results/INDEX.md
//
// POLICY (kernel/policies.md):
//   §2 evaluation — the JUDGE model MUST differ from the WORKER model (asserted, not
//      assumed); judge is blind to variant identity (outputs shuffled + anonymized);
//      scoring is multi-objective where the rubric supplies dimensions.
//   §3 promotion  — NO promotion without a counterfactual. Ties go to the SIMPLER variant
//      (no-skill < minimal < challenger < champion by complexity). A no-skill tie
//      questions whether the skill should exist (Minimal-Complexity Principle → retire).
//   §1 evidence   — deterministic graders settle deterministically; the LLM judge is only
//      used where no executable truth exists (grader.kind=rubric|pairwise).
//
// USAGE
//   node skill-eval.mjs --skill <name> \
//     --suite <dir|glob of evals/cases/*.json> \
//     --variants champion=<file>,minimal=<file>,no-skill=,challenger=<file> \
//     --worker deepseek --judge claude [--dry] [--out <path>] [--seed <n>]
//
//   --dry  : NO network. A deterministic stub scorer (keyword presence mined from
//            grader.spec / must_not) exercises every mechanic in CI without burning tokens.
//
// SECRETS
//   API keys come ONLY from `/Users/Apple/.local/bin/get-secret` (DEEPSEEK_API_KEY,
//   ANTHROPIC_API_KEY, OPENAI_API_KEY). Keys are NEVER printed, logged, or written to disk.
//
// MODEL ENDPOINTS (OpenAI-compatible unless noted)
//   deepseek → https://api.deepseek.com/chat/completions         model deepseek-chat
//   openai   → https://api.openai.com/v1/chat/completions        model gpt-4o
//   claude   → https://api.anthropic.com/v1/messages (x-api-key + anthropic-version)
//                                                                 model claude-sonnet-4-6
//
// EXIT CODES
//   0 = ran + wrote a result (decision computed).  1 = usage / validation / IO error.
//   2 = a required secret was missing on a LIVE (non-dry) run (environment, not a bug).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, appendFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVO_ROOT = resolve(HERE, ".."); // .claude/evolution
const RESULTS_DIR = join(EVO_ROOT, "evals", "results");
const GET_SECRET = "/Users/Apple/.local/bin/get-secret";

// ── Model registry ───────────────────────────────────────────────────────────
// family → how to call it. One place to change an id/endpoint. `provider` groups
// families that share a vendor+key so the judge≠worker check can't be fooled by an
// alias (e.g. two OpenAI models are still the same provider — not independent).
const MODELS = {
  deepseek: { provider: "deepseek", secret: "DEEPSEEK_API_KEY", endpoint: "https://api.deepseek.com/chat/completions", model: "deepseek-chat", api: "openai" },
  openai: { provider: "openai", secret: "OPENAI_API_KEY", endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o", api: "openai" },
  gpt: { provider: "openai", secret: "OPENAI_API_KEY", endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o", api: "openai" },
  claude: { provider: "anthropic", secret: "ANTHROPIC_API_KEY", endpoint: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-4-6", api: "anthropic" },
  anthropic: { provider: "anthropic", secret: "ANTHROPIC_API_KEY", endpoint: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-4-6", api: "anthropic" },
};

// Variant complexity order (policy §3 "ties go to the simpler variant"). Lower = simpler.
const COMPLEXITY = { "no-skill": 0, minimal: 1, challenger: 2, champion: 3 };

const die = (msg, code = 1) => {
  console.error(`skill-eval: ${msg}`);
  process.exit(code);
};

// ── Minimal hand-rolled validation (zod is not resolvable standalone; no new deps) ──
function assertCase(c, file) {
  const where = `case ${file}`;
  if (!c || typeof c !== "object") die(`${where}: not an object`);
  if (typeof c.id !== "string" || !c.id) die(`${where}: missing string .id`);
  if (typeof c.task !== "string" || !c.task) die(`${where}: missing string .task`);
  const g = c.grader;
  if (!g || typeof g !== "object") die(`${where}: missing .grader object`);
  if (!["deterministic", "rubric", "pairwise"].includes(g.kind)) die(`${where}: grader.kind must be deterministic|rubric|pairwise (got ${g.kind})`);
  if (typeof g.spec !== "string" || !g.spec) die(`${where}: grader.spec must be a non-empty string`);
  if (g.pass_threshold != null && (typeof g.pass_threshold !== "number" || g.pass_threshold < 0 || g.pass_threshold > 1))
    die(`${where}: grader.pass_threshold must be 0..1`);
  if (c.must_not != null && !Array.isArray(c.must_not)) die(`${where}: must_not must be an array`);
  if (c.tier != null && !["development", "regression", "adversarial", "hidden-holdout"].includes(c.tier))
    die(`${where}: tier must be development|regression|adversarial|hidden-holdout (got ${c.tier})`);
  return c;
}

// ── CLI parse ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { worker: "deepseek", judge: "claude", dry: false, seed: 1, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v == null) die(`flag ${a} needs a value`);
      return v;
    };
    if (a === "--skill") out.skill = next();
    else if (a === "--suite") out.suite = next();
    else if (a === "--variants") out.variants = next();
    else if (a === "--worker") out.worker = next();
    else if (a === "--judge") out.judge = next();
    else if (a === "--out") out.out = next();
    else if (a === "--seed") out.seed = Number(next());
    else if (a === "--dry") out.dry = true;
    else if (a === "-h" || a === "--help") out.help = true;
    else die(`unknown flag: ${a}`);
  }
  return out;
}

const USAGE = `Usage:
  node skill-eval.mjs --skill <name> --suite <dir|glob of cases/*.json> \\
    --variants champion=<file>,minimal=<file>,no-skill=,challenger=<file> \\
    --worker deepseek --judge claude [--dry] [--out <path>] [--seed <n>]

Variants: comma list of name=filepath. Known names: champion, challenger, minimal, no-skill.
  An EMPTY value (e.g. "no-skill=") means empty skill-text — the counterfactual baseline.
--dry    : deterministic stub scorer, no network (CI-safe).`;

// variants spec → { name: { text, source } }. Empty value ⇒ empty text (no-skill baseline).
function parseVariants(spec) {
  if (!spec) die("missing --variants");
  const variants = {};
  for (const pair of spec.split(",")) {
    const eq = pair.indexOf("=");
    if (eq < 0) die(`bad --variants entry "${pair}" (want name=file or name=)`);
    const name = pair.slice(0, eq).trim();
    const file = pair.slice(eq + 1).trim();
    if (!name) die(`bad --variants entry "${pair}" (empty name)`);
    if (!(name in COMPLEXITY)) die(`unknown variant "${name}" — known: ${Object.keys(COMPLEXITY).join(", ")}`);
    if (!file) {
      variants[name] = { text: "", source: "(empty — no-skill baseline)" };
    } else {
      const p = resolve(file);
      if (!existsSync(p)) die(`variant "${name}" file not found: ${p}`);
      variants[name] = { text: readFileSync(p, "utf8"), source: p };
    }
  }
  if (Object.keys(variants).length < 2) die("need ≥2 variants for a counterfactual (policy §3)");
  return variants;
}

// ── Suite loading: a dir (all *.json), a single .json file, or a simple *.json glob ──
function loadSuite(suiteArg) {
  if (!suiteArg) die("missing --suite");
  const p = resolve(suiteArg);
  let files = [];
  if (existsSync(p) && statSync(p).isDirectory()) {
    files = readdirSync(p).filter((f) => f.endsWith(".json")).map((f) => join(p, f));
  } else if (existsSync(p) && statSync(p).isFile()) {
    files = [p];
  } else if (suiteArg.includes("*")) {
    // minimal glob: <dir>/<pattern-with-*>.json
    const dir = resolve(dirname(suiteArg));
    const pat = basename(suiteArg);
    const rx = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    if (existsSync(dir)) files = readdirSync(dir).filter((f) => rx.test(f)).map((f) => join(dir, f));
  }
  files = files.sort();
  if (files.length === 0) die(`no case files matched --suite ${suiteArg}`);
  return files.map((f) => assertCase(JSON.parse(readFileSync(f, "utf8")), f));
}

// ── Secrets: get-secret only; never printed ─────────────────────────────────────
const _secretCache = new Map();
function getSecret(key) {
  if (_secretCache.has(key)) return _secretCache.get(key);
  let val = null;
  // Env override is allowed (operator may export), else shell out to get-secret.
  if (process.env[key]) val = process.env[key];
  else {
    try {
      val = execFileSync(GET_SECRET, [key], { encoding: "utf8" }).trim();
    } catch {
      val = null;
    }
  }
  if (!val) return null;
  _secretCache.set(key, val);
  return val;
}

// ── Model calls (live) — OpenAI-compatible + Anthropic Messages ─────────────────
async function callModel(family, { system, user, temperature = 0, maxTokens = 1024 }) {
  const m = MODELS[family];
  if (!m) die(`unknown model family "${family}" — known: ${Object.keys(MODELS).join(", ")}`);
  const key = getSecret(m.secret);
  if (!key) die(`missing secret ${m.secret} for model "${family}" (get-secret returned nothing)`, 2);

  if (m.api === "anthropic") {
    const res = await fetch(m.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: m.model, max_tokens: maxTokens, temperature, system: system || undefined, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`${family} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    const text = (j.content || []).map((b) => b.text || "").join("");
    const usage = j.usage ? { in: j.usage.input_tokens || 0, out: j.usage.output_tokens || 0 } : { in: 0, out: 0 };
    return { text, usage, model: m.model };
  }
  // openai-compatible (deepseek + openai)
  const res = await fetch(m.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: m.model,
      temperature,
      max_tokens: maxTokens,
      messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`${family} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content ?? "";
  const u = j.usage || {};
  return { text, usage: { in: u.prompt_tokens || 0, out: u.completion_tokens || 0 }, model: m.model };
}

// ── Deterministic scoring helpers (used by BOTH --dry and grader.kind=deterministic) ──
// Pull candidate keywords/regex out of a grader spec: `/foo/` regex tokens win; else
// comma/semicolon/"must mention"-style keyword phrases. This is a transparent heuristic —
// the real judge (live) reads the full rubric; the stub only needs to exercise mechanics.
function keywordsFromSpec(spec) {
  const kws = [];
  const rx = /\/((?:\\.|[^/])+)\//g; // /regex/ tokens
  let mt;
  while ((mt = rx.exec(spec))) kws.push({ kind: "regex", v: mt[1] });
  if (kws.length === 0) {
    for (const raw of spec.split(/[,;\n]|(?:\bmust\b|\bmentions?\b|\bincludes?\b|\bcontains?\b)/i)) {
      const t = raw.replace(/["'`.]/g, "").trim();
      if (t.length >= 3 && !/^(the|a|an|and|or|of|to|is|should|output|answer|response)$/i.test(t)) kws.push({ kind: "kw", v: t });
    }
  }
  return kws;
}

function matchCount(output, kws) {
  const lc = output.toLowerCase();
  let hit = 0;
  for (const k of kws) {
    if (k.kind === "regex") {
      try {
        if (new RegExp(k.v, "i").test(output)) hit++;
      } catch {
        /* bad regex in spec → no credit */
      }
    } else if (lc.includes(k.v.toLowerCase())) hit++;
  }
  return hit;
}

// must_not: any forbidden phrase present ⇒ auto-0 (honored in both dry + live).
function violatesMustNot(output, mustNot) {
  if (!Array.isArray(mustNot)) return false;
  const lc = output.toLowerCase();
  return mustNot.some((f) => {
    if (typeof f !== "string" || !f) return false;
    // allow /regex/ in must_not too
    const m = f.match(/^\/(.+)\/$/);
    if (m) {
      try {
        return new RegExp(m[1], "i").test(output);
      } catch {
        return false;
      }
    }
    return lc.includes(f.toLowerCase());
  });
}

// Deterministic grader (kind=deterministic): regex/assert over output → 0..1. Executable
// truth, so NO judge model is consulted (policy §1: lowest tier that settles it).
function scoreDeterministic(output, grader) {
  const kws = keywordsFromSpec(grader.spec);
  if (kws.length === 0) return output.trim().length > 0 ? 1 : 0; // spec gave nothing checkable
  return matchCount(output, kws) / kws.length;
}

// Dry stub scorer: same keyword logic, applied to the VARIANT'S SYNTHETIC OUTPUT. In dry
// mode we don't call a worker, so each variant's "output" is deterministically synthesized
// from (skill-text + task) so richer skills surface more of the expected keywords — enough
// signal to exercise ranking + the decision function without a network call.
function dryWorkerOutput(variantText, task, context, kws) {
  // The synthetic answer = the parts of (skill-text + task + context) that already contain
  // the expected keywords. A fuller skill ⇒ more keywords present ⇒ higher stub score. This
  // is intentionally mechanical; it tests the harness, not model quality.
  const corpus = `${variantText}\n${task}\n${context || ""}`;
  const present = kws.filter((k) => matchCount(corpus, [k]) > 0).map((k) => k.v);
  return `DRY-STUB OUTPUT (no model called). Signals present from skill+task: ${present.join(" | ") || "(none)"}.`;
}

// ── Judge (live): independent model scores one anonymized output vs the rubric ──────
async function judgeScore(judgeFamily, { task, context, rubric, output, passThreshold }) {
  const system =
    "You are an impartial evaluation judge. Score how well a candidate RESPONSE satisfies the TASK against the RUBRIC. " +
    "Be multi-objective: weigh correctness, requirement coverage, and quality per the rubric dimensions. " +
    'Reply with ONLY compact JSON: {"score": <0..1>, "reasons": "<=200 chars"}. No prose outside the JSON.';
  const user =
    `TASK:\n${task}\n\n` +
    (context ? `CONTEXT:\n${context}\n\n` : "") +
    `RUBRIC (0..1, pass≥${passThreshold}):\n${rubric}\n\n` +
    `CANDIDATE RESPONSE (author hidden):\n${output}\n\n` +
    "Return the JSON now.";
  const { text, usage, model } = await callModel(judgeFamily, { system, user, temperature: 0, maxTokens: 300 });
  let score = 0;
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]);
      score = Math.max(0, Math.min(1, Number(parsed.score)));
      if (!Number.isFinite(score)) score = 0;
    } catch {
      /* unparseable judge reply → 0 (fail-safe, surfaced in cost/log) */
    }
  }
  return { score, usage, model };
}

// Rough USD cost (indicative; per-1M-token public list prices, conservative). Live only.
const PRICE = {
  "deepseek-chat": { in: 0.27, out: 1.1 },
  "gpt-4o": { in: 2.5, out: 10 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
};
function usd(model, usage) {
  const p = PRICE[model];
  if (!p || !usage) return 0;
  return (usage.in / 1e6) * p.in + (usage.out / 1e6) * p.out;
}

// ── Decision (kernel/policies.md §3) ───────────────────────────────────────────
// Inputs: per-variant mean score + pairwise win-rate vs the field. Emits one of
// { keep-champion | promote-challenger | adopt-minimal | retire-skill } + a rationale
// that CITES the scores and the policy clause used.
function decide(variantNames, meanScore, winRate) {
  const EPS = 0.02; // score-equality band → "tie" (ties go to the simpler variant, §3)
  const present = new Set(variantNames);
  // Rank by mean score; break score-ties by SIMPLER variant (lower COMPLEXITY).
  const ranked = [...variantNames].sort((a, b) => {
    const d = meanScore[b] - meanScore[a];
    if (Math.abs(d) > EPS) return d > 0 ? 1 : -1;
    return COMPLEXITY[a] - COMPLEXITY[b]; // tie → simpler first
  });
  const top = ranked[0];
  const topScore = meanScore[top];

  // Everyone within EPS of the top score is a "co-winner"; the simplest among them wins (§3).
  const coWinners = variantNames.filter((v) => Math.abs(meanScore[v] - topScore) <= EPS);
  const simplest = coWinners.sort((a, b) => COMPLEXITY[a] - COMPLEXITY[b])[0];

  const fmt = (v) => `${v}=${(meanScore[v] ?? 0).toFixed(3)}(win ${(winRate[v] ?? 0).toFixed(2)})`;
  const scoreline = variantNames.map(fmt).join(", ");

  // Non-discrimination guard (evaluation-policy §2): if EVERY variant ties — including any
  // deliberately-bad challenger — the eval produced NO signal, so the GRADER failed, not the
  // skill. Refuse to emit a skill verdict; demand a stronger grader first.
  const allScores = variantNames.map((v) => meanScore[v] ?? 0);
  const spread = Math.max(...allScores) - Math.min(...allScores);
  if (variantNames.length >= 2 && spread <= EPS) {
    return {
      decision: "inconclusive-nondiscriminating",
      rationale: `all ${variantNames.length} variants tie within ±${EPS} (spread ${spread.toFixed(3)}) [${scoreline}]; the eval produced NO signal — the grader did not discriminate (a known-bad variant would also pass). Per evaluation-policy §2 + holdout-policy §5, strengthen the grader (pairwise LLM-judge or harder tasks that trip must_not) before trusting any promote/retire verdict. No decision.`,
    };
  }

  // Minimal-Complexity Principle: if no-skill ties the winner, the skill earns no keep.
  if (present.has("no-skill") && coWinners.includes("no-skill")) {
    return {
      decision: "retire-skill",
      rationale: `no-skill ties the field within ±${EPS} [${scoreline}]; policy §3 Minimal-Complexity Principle — a skill that does not beat its own absence should not exist. Retire.`,
    };
  }
  // If minimal is (co-)simplest winner, adopt it over a heavier champion/challenger (§3 tie→simpler).
  if (simplest === "minimal" && present.has("minimal")) {
    const tiedHeavier = coWinners.filter((v) => COMPLEXITY[v] > COMPLEXITY.minimal);
    return {
      decision: "adopt-minimal",
      rationale: `minimal is the simplest variant within the top score band ±${EPS} [${scoreline}]${tiedHeavier.length ? ` (ties ${tiedHeavier.join("/")})` : ""}; policy §3 ties-go-to-simpler → adopt minimal.`,
    };
  }
  // Challenger must BEAT champion by > EPS to promote (a tie keeps the incumbent, §3 + §4 rollback-cheap).
  if (simplest === "challenger" && present.has("challenger")) {
    const champScore = meanScore["champion"] ?? -1;
    if (topScore - champScore > EPS) {
      return {
        decision: "promote-challenger",
        rationale: `challenger ${topScore.toFixed(3)} beats champion ${champScore.toFixed(3)} by >${EPS} [${scoreline}]; policy §3 evidence-backed winner → promote.`,
      };
    }
  }
  // Default: incumbent survives. (Champion top, or a tie that §3 resolves to the incumbent.)
  return {
    decision: "keep-champion",
    rationale: `champion is the (co-)winner and no simpler variant ties it beyond ±${EPS} [${scoreline}]; policy §3 — no counterfactual beat the incumbent. Keep champion.`,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (!args.skill) die("missing --skill\n" + USAGE);

  const variants = parseVariants(args.variants);
  const variantNames = Object.keys(variants).sort((a, b) => COMPLEXITY[a] - COMPLEXITY[b]);
  const cases = loadSuite(args.suite);

  // policy §2: judge MUST be independent from worker. Compare PROVIDERS (alias-proof), and
  // in dry mode there's no model at all so the check is vacuous (stub ≠ a provider).
  if (!args.dry) {
    const w = MODELS[args.worker],
      j = MODELS[args.judge];
    if (!w) die(`unknown --worker "${args.worker}"`);
    if (!j) die(`unknown --judge "${args.judge}"`);
    if (w.provider === j.provider)
      die(`policy §2 violation: judge (${args.judge}/${j.provider}) must be INDEPENDENT from worker (${args.worker}/${w.provider}). Pick a different vendor.`);
  }

  const holdoutUsed = cases.some((c) => c.tier === "hidden-holdout");
  const perCase = [];
  let costTotal = 0;
  const judgeModelIds = new Set();

  for (const c of cases) {
    const threshold = c.grader.pass_threshold ?? 0.7;
    const kws = keywordsFromSpec(c.grader.spec);

    // 1) WORKER: produce one output per variant (prompt = skill-text + task + context).
    const outputs = {}; // variant → text
    for (const v of variantNames) {
      const prompt = `${variants[v].text ? variants[v].text.trim() + "\n\n---\n\n" : ""}${c.task}${c.context ? `\n\nContext:\n${c.context}` : ""}`;
      if (args.dry) {
        outputs[v] = dryWorkerOutput(variants[v].text, c.task, c.context, kws);
      } else {
        const { text, usage, model } = await callModel(args.worker, { user: prompt, temperature: 0, maxTokens: 1024 });
        outputs[v] = text;
        costTotal += usd(model, usage);
      }
    }

    // 2) SCORE each output.
    //    - must_not present ⇒ auto-0 (policy, both modes).
    //    - deterministic grader ⇒ executable scoring, NO judge (policy §1).
    //    - rubric/pairwise ⇒ INDEPENDENT judge, BLIND to variant (shuffled + anonymized).
    const scores = {};

    // Pre-compute auto-0s and deterministic scores (no judge needed).
    const needJudge = []; // variants that still need a judge score
    for (const v of variantNames) {
      if (violatesMustNot(outputs[v], c.must_not)) {
        scores[v] = 0;
        continue;
      }
      if (c.grader.kind === "deterministic" || args.dry) {
        scores[v] = scoreDeterministic(outputs[v], c.grader);
      } else {
        needJudge.push(v);
      }
    }

    // Judge the remainder BLIND: shuffle variant→label so the judge can't tell which is which.
    if (needJudge.length > 0) {
      const order = seededShuffle(needJudge, `${args.seed}:${c.id}`);
      for (const v of order) {
        const { score, usage, model } = await judgeScore(args.judge, {
          task: c.task,
          context: c.context,
          rubric: c.grader.spec,
          output: outputs[v],
          passThreshold: threshold,
        });
        scores[v] = score;
        costTotal += usd(model, usage);
        judgeModelIds.add(model);
      }
    }

    perCase.push({ case: c.id, tier: c.tier || "development", threshold, scores });
  }

  // 3) Aggregate: mean score + pairwise win-rate (fraction of cases a variant is sole/≥-best).
  const meanScore = {};
  for (const v of variantNames) meanScore[v] = perCase.reduce((s, pc) => s + (pc.scores[v] ?? 0), 0) / perCase.length;

  const winRate = {};
  for (const v of variantNames) winRate[v] = 0;
  for (const pc of perCase) {
    const best = Math.max(...variantNames.map((v) => pc.scores[v] ?? 0));
    const winners = variantNames.filter((v) => (pc.scores[v] ?? 0) >= best - 1e-9);
    for (const v of winners) winRate[v] += 1 / winners.length / perCase.length; // split credit on ties
  }

  // 4) DECIDE per policy §3.
  const { decision, rationale } = decide(variantNames, meanScore, winRate);

  // 5) Write the RESULT (evals/results/<run>.json) matching evidence-schema.md § Eval RESULT.
  const when = new Date().toISOString().slice(0, 10);
  const runId = `${args.skill}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}${args.dry ? "-dry" : ""}`;
  const judgeLabel = args.dry
    ? "deterministic-stub (dry; no judge model)"
    : `${args.judge}/${[...judgeModelIds][0] || MODELS[args.judge].model}`;

  const result = {
    run: runId,
    when,
    skill: args.skill,
    variants: variantNames,
    worker: args.dry ? "deterministic-stub (dry)" : `${args.worker}/${MODELS[args.worker].model}`,
    per_case: perCase.map((pc) => ({ case: pc.case, scores: pc.scores })),
    win_rates: Object.fromEntries(variantNames.map((v) => [v, Number(winRate[v].toFixed(4))])),
    mean_scores: Object.fromEntries(variantNames.map((v) => [v, Number(meanScore[v].toFixed(4))])),
    decision,
    rationale,
    judge: judgeLabel,
    cost: args.dry ? "$0.00 (dry)" : `$${costTotal.toFixed(4)}`,
    holdout_used: holdoutUsed,
    dry: args.dry,
    variant_sources: Object.fromEntries(variantNames.map((v) => [v, variants[v].source])),
    case_count: cases.length,
  };

  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = args.out ? resolve(args.out) : join(RESULTS_DIR, `${runId}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");

  // 6) Append one line to INDEX.md (create with a header if absent).
  const indexPath = join(RESULTS_DIR, "INDEX.md");
  if (!existsSync(indexPath)) {
    writeFileSync(
      indexPath,
      "# Eval results index\n\nAppend-only. One line per run (`bin/skill-eval.mjs`). Decisions follow kernel/policies.md §3.\n\n| when | skill | decision | scores (mean) | judge | holdout | run |\n| --- | --- | --- | --- | --- | --- | --- |\n",
    );
  }
  const scoreCell = variantNames.map((v) => `${v} ${meanScore[v].toFixed(2)}`).join(", ");
  appendFileSync(
    indexPath,
    `| ${when} | ${args.skill} | **${decision}** | ${scoreCell} | ${judgeLabel} | ${holdoutUsed ? "yes" : "no"} | \`${basename(outPath)}\` |\n`,
  );

  // 7) Human-readable summary to stdout (never prints secrets).
  console.log(`\nskill-eval — ${args.skill}${args.dry ? "  [DRY]" : ""}`);
  console.log(`  worker=${result.worker}  judge=${judgeLabel}  cases=${cases.length}  holdout=${holdoutUsed}`);
  for (const v of variantNames) console.log(`  ${v.padEnd(12)} mean=${meanScore[v].toFixed(3)}  win=${winRate[v].toFixed(2)}  <- ${variants[v].source}`);
  console.log(`  DECISION: ${decision}`);
  console.log(`  rationale: ${rationale}`);
  console.log(`  cost: ${result.cost}`);
  console.log(`  wrote: ${outPath}`);
  console.log(`  index: ${indexPath}`);
  process.exit(0);
}

// Seeded Fisher-Yates (stable per run+case) so the blind-judge shuffle is reproducible.
function seededShuffle(arr, seedStr) {
  const a = [...arr];
  let h = parseInt(createHash("sha256").update(seedStr).digest("hex").slice(0, 8), 16) || 1;
  const rand = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

main().catch((e) => die(e?.stack || String(e)));

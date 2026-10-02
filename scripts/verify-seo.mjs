#!/usr/bin/env node
// SEO-strict gate for the apex served HTML (what a crawler sees). SEO strict was a
// Hard Gate with no automated coverage — this closes that. Checks run against the
// RAW shell (no JS), which is what non-rendering crawlers index.
//
// HARD (exit 1 on fail): title 50-60 · meta desc 120-156 · canonical · og:image
// 1200×630 · every JSON-LD block parses with @context + @type.
// WARN (exit 0): exactly 1 H1 IN THE SHELL — the apex renders its H1 client-side
// (React), so the static shell has 0; satisfied only by SSG/pre-render (BACKLOG).
// Usage: node scripts/verify-seo.mjs [url]

const URL = process.argv[2] || "https://megabyte.space/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

const html = await (await fetch(URL, { headers: { "User-Agent": UA, Accept: "text/html" } })).text();

const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
const desc = (html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) || [])[1] || "";
const h1 = (html.match(/<h1[\s>]/gi) || []).length;
const canon = /<link[^>]*rel="canonical"/.test(html);
const ogW = (/<meta[^>]*property="og:image:width"[^>]*content="(\d+)"/.exec(html) || [])[1];
const ogH = (/<meta[^>]*property="og:image:height"[^>]*content="(\d+)"/.exec(html) || [])[1];
const jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
  try {
    return JSON.parse(m[1]);
  } catch {
    return { __invalid: true };
  }
});

const hard = [];
const record = (name, pass, detail) => {
  hard.push({ name, pass });
  console.log(`${pass ? "✅ PASS" : "❌ FAIL"}  ${name} — ${detail}`);
};

record("title 50-60 chars", title.length >= 50 && title.length <= 60, `${title.length} chars`);
record("meta description 120-156 chars", desc.length >= 120 && desc.length <= 156, `${desc.length} chars`);
record("canonical link present", canon, String(canon));
record("og:image 1200x630", ogW === "1200" && ogH === "630", `${ogW}x${ogH}`);
record("≥1 JSON-LD block, all valid", jsonld.length > 0 && jsonld.every((b) => !b.__invalid && b["@context"] && b["@type"]), jsonld.map((b) => b["@type"] || "INVALID").join(", ") || "none");

// WARN-only — the SSG gap.
const h1Ok = h1 === 1;
console.log(`${h1Ok ? "✅ PASS" : "⚠️  WARN"}  exactly 1 H1 in shell — found ${h1}${h1Ok ? "" : " (client-rendered; needs SSG — BACKLOG)"}`);

const failed = hard.filter((c) => !c.pass);
console.log(`\n${hard.length - failed.length}/${hard.length} hard SEO checks green${h1Ok ? "" : " · 1 WARN (H1-in-shell / SSG)"}`);
process.exit(failed.length === 0 ? 0 : 1);

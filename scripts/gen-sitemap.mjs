#!/usr/bin/env node
// Generate dist/sitemap.xml with a FRESH lastmod every build. The hand-maintained
// public/sitemap.xml went stale (lastmod 2026-09-29 while the apex shipped ~15× since) —
// a search engine reads a stale lastmod as "nothing changed, don't re-crawl". The sitemap
// is a GENERATED artifact derived from the known indexable route set, never hand-edited
// (drift-detection § build-artifact drift guards). Runs AFTER `vite build` so Vite's
// public/ copy doesn't clobber it.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "packages", "home", "dist", "sitemap.xml");
const posts = JSON.parse(readFileSync(join(HERE, "..", "packages", "home", "src", "blog-posts.json"), "utf8"));

// Indexable public routes only. /status is a live-telemetry utility page → intentionally omitted.
const ROUTES = [
  { loc: "https://megabyte.space/", lastmod: "2026-11-12" },
  { loc: "https://megabyte.space/blog", lastmod: posts[0].modified.slice(0, 10) },
  ...posts.map((post) => ({ loc: `https://megabyte.space${post.path}`, lastmod: post.modified.slice(0, 10) })),
];

const urls = ROUTES.map(
  (r) =>
    `  <url>\n    <loc>${r.loc}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n  </url>`,
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, xml);
console.log(`✅ sitemap: generated dist/sitemap.xml · ${ROUTES.length} route(s)`);

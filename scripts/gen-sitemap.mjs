#!/usr/bin/env node
// Generate dist/sitemap.xml with a FRESH lastmod every build. The hand-maintained
// public/sitemap.xml went stale (lastmod 2026-09-29 while the apex shipped ~15× since) —
// a search engine reads a stale lastmod as "nothing changed, don't re-crawl". The sitemap
// is a GENERATED artifact derived from the known indexable route set, never hand-edited
// (drift-detection § build-artifact drift guards). Runs AFTER `vite build` so Vite's
// public/ copy doesn't clobber it.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "packages", "home", "dist", "sitemap.xml");
const today = new Date().toISOString().slice(0, 10);

// Indexable public routes only. /status is a live-telemetry utility page → intentionally omitted.
const ROUTES = [{ loc: "https://megabyte.space/", changefreq: "weekly", priority: "1.0" }];

const urls = ROUTES.map(
  (r) =>
    `  <url>\n    <loc>${r.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, xml);
console.log(`✅ sitemap: generated dist/sitemap.xml · lastmod ${today} · ${ROUTES.length} route(s)`);

#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "packages", "home", "dist", "feed.xml");
const posts = JSON.parse(readFileSync(join(ROOT, "packages", "home", "src", "blog-posts.json"), "utf8"));
const escapeXml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const items = posts
  .map((post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>https://megabyte.space${post.path}</link>
      <guid isPermaLink="true">https://megabyte.space${post.path}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.published).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
    </item>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Megabyte Labs Blog</title>
    <link>https://megabyte.space/blog</link>
    <description>Product milestones, engineering notes, and lessons from building Megabyte OS.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(posts[0].modified).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, xml);
console.log(`✅ feed: generated dist/feed.xml · ${posts.length} post(s)`);

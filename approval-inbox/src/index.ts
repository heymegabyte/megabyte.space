// Megabyte OS — Approval Inbox (estate idea #7: the Autonomous Business OS human-oversight surface).
//
// Surfaces the estate's real "needs-you" queue — open GitHub PRs across the heymegabyte org (the
// autonomous fleet's pending work) — each as an approval card: PLAN (title) · SOURCE (repo + author)
// · CONFIDENCE (draft/ready + age + labels) · one-click HANDOFF (Review on GitHub).
//
// SECURITY — this shows PRIVATE-repo data, and `*.megabyte.space` Worker custom domains are PUBLIC by
// default (NOT gated by the wildcard Access — proven via CF Browser Run, see the
// custom-domain-workers-are-public memory). So this worker serves the private data ONLY when
// INBOX_ARMED==="1", which is flipped on ONLY AFTER an explicit CF Access app for inbox.megabyte.space
// is confirmed to gate unauthed requests. Un-armed (or tokenless) ⇒ a public, data-free placeholder —
// so it can NEVER leak private data even if the Access gate is missing/misconfigured.

interface Env {
  GITHUB_TOKEN?: string;
  INBOX_ARMED?: string; // "1" ⇒ serve the real private queue (only flip ON behind a verified Access gate)
  GH_ORG?: string; // defaults to heymegabyte
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};
// Full security-header set (idea #2). Inbox gating CONFIRMED Access-gated 2026-10-26 via CF Browser
// Run (a true non-WARP unauthed client got the Access "Sign in" page, NOT the data — this WARP Mac
// is NOT a valid gating test). CSP is defense-in-depth: the page is static HTML (inline <style>, no
// <script>, no images/fonts), so default-src 'none' + style-src 'unsafe-inline' holds. Applied to the
// HTML page AND the /api/approvals JSON.
const SEC = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; frame-ancestors 'none'",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";

interface Approval {
  repo: string;
  number: number;
  title: string;
  author: string;
  url: string;
  draft: boolean;
  createdAt: string;
  ageDays: number;
  labels: string[];
  comments: number;
}

async function fetchApprovals(env: Env): Promise<{ armed: boolean; approvals: Approval[]; error?: string }> {
  if (env.INBOX_ARMED !== "1" || !env.GITHUB_TOKEN) return { armed: false, approvals: [] };
  const org = env.GH_ORG || "heymegabyte";
  // Cache the GitHub response 60s (Cache API) to protect the 30/min search rate limit + latency.
  const cacheKey = new Request(`https://inbox.cache/approvals?org=${org}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return await cached.json();

  try {
    const r = await fetch(
      `https://api.github.com/search/issues?q=is:pr+is:open+org:${org}&sort=created&order=asc&per_page=50`,
      { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": UA } },
    );
    if (!r.ok) return { armed: true, approvals: [], error: `GitHub ${r.status}` };
    const data = (await r.json()) as { items?: any[] };
    const now = Date.now();
    const approvals: Approval[] = (data.items || []).map((i) => ({
      repo: (i.repository_url || "").split("/").pop() || "?",
      number: i.number,
      title: i.title || "",
      author: i.user?.login || "?",
      url: i.html_url || "",
      draft: !!i.draft,
      createdAt: i.created_at || "",
      ageDays: i.created_at ? Math.floor((now - Date.parse(i.created_at)) / 86400000) : 0,
      labels: (i.labels || []).map((l: any) => (typeof l === "string" ? l : l.name)).filter(Boolean),
      comments: i.comments || 0,
    }));
    const result = { armed: true, approvals };
    // Cache 60s.
    await cache.put(
      cacheKey,
      new Response(JSON.stringify(result), { headers: { "content-type": "application/json", "cache-control": "max-age=60" } }),
    );
    return result;
  } catch (e) {
    return { armed: true, approvals: [], error: (e as Error).message };
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function confidenceBadge(a: Approval): string {
  if (a.draft) return `<span class="badge draft">DRAFT</span>`;
  if (a.ageDays > 14) return `<span class="badge stale">STALE · ${a.ageDays}d</span>`;
  return `<span class="badge ready">READY${a.ageDays ? ` · ${a.ageDays}d` : ""}</span>`;
}

function renderCards(approvals: Approval[]): string {
  if (!approvals.length) return `<p class="empty">Nothing awaiting you. The queue is clear. ✦</p>`;
  const byRepo = new Map<string, Approval[]>();
  for (const a of approvals) (byRepo.get(a.repo) || byRepo.set(a.repo, []).get(a.repo)!).push(a);
  const groups = [...byRepo.entries()].sort((x, y) => y[1].length - x[1].length);
  return groups
    .map(
      ([repo, items]) => `<section class="repo"><h2>${esc(repo)} <span class="n">${items.length}</span></h2>
${items
  .map(
    (a) => `<a class="card" href="${esc(a.url)}" target="_blank" rel="noopener">
  <div class="row1"><span class="num">#${a.number}</span>${confidenceBadge(a)}${a.comments ? `<span class="cmt">💬 ${a.comments}</span>` : ""}</div>
  <div class="title">${esc(a.title)}</div>
  <div class="meta"><span class="author">@${esc(a.author)}</span>${a.labels.slice(0, 3).map((l) => `<span class="label">${esc(l)}</span>`).join("")}<span class="cta">Review →</span></div>
</a>`,
  )
  .join("\n")}</section>`,
    )
    .join("\n");
}

function page(body: string, count: number, armed: boolean, stamp: string, gov: { ready: number; drafts: number; stalled: number }): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
${armed ? '<meta http-equiv="refresh" content="90"/>' : ""}
<title>Approval Inbox · Megabyte OS</title>
<style>
*,*::before,*::after{box-sizing:border-box}
:root{--bg:#060610;--panel:#0b0b16;--line:rgba(255,255,255,.09);--cyan:#00E5FF;--fg:#eaf6ff;--sub:rgba(255,255,255,.55)}
html,body{margin:0}body{background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
.bg{position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(60vw 50vh at 70% -10%,rgba(0,229,255,.10),transparent 60%),radial-gradient(50vw 40vh at 10% 0,rgba(124,58,237,.10),transparent 60%)}
header{position:relative;z-index:1;padding:40px 24px 8px;max-width:1100px;margin:0 auto}
h1{font-size:clamp(1.6rem,4vw,2.3rem);font-weight:680;letter-spacing:-.02em;margin:0}
.eyebrow{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;color:var(--cyan);text-transform:uppercase;margin:0 0 6px}
.sub{color:var(--sub);font-size:14px;margin:8px 0 0}
main{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:16px 24px 64px}
.repo{margin:26px 0 0}
.repo h2{font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--sub);text-transform:lowercase;margin:0 0 10px;display:flex;align-items:center;gap:8px;font-family:ui-monospace,monospace}
.repo h2 .n{background:rgba(0,229,255,.12);color:var(--cyan);border-radius:20px;padding:1px 9px;font-size:11px}
.card{display:block;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.015));border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:0 0 10px;text-decoration:none;color:inherit;transition:border-color .15s,transform .05s,background .15s}
.card:hover{border-color:rgba(0,229,255,.45);background:rgba(0,229,255,.05)}
.card:active{transform:translateY(1px)}
.row1{display:flex;align-items:center;gap:10px;margin:0 0 6px}
.num{font-family:ui-monospace,monospace;font-size:12px;color:var(--sub)}
.title{font-size:15.5px;font-weight:550;line-height:1.35;text-wrap:balance}
.meta{display:flex;align-items:center;gap:8px;margin:9px 0 0;flex-wrap:wrap}
.author{font-size:12px;color:var(--sub)}
.label{font-size:10.5px;color:var(--cyan);background:rgba(0,229,255,.09);border-radius:6px;padding:1px 7px}
.cmt{font-size:11px;color:var(--sub);margin-left:auto}
.cta{margin-left:auto;font-size:12.5px;color:var(--cyan);font-weight:600}
.meta .cta{margin-left:auto}
.badge{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;border-radius:6px;padding:2px 7px;font-weight:600}
.badge.ready{color:#7CFFB2;background:rgba(124,255,178,.1)}
.badge.draft{color:var(--sub);background:rgba(255,255,255,.06)}
.badge.stale{color:#ffb86b;background:rgba(255,184,107,.1)}
.empty{color:var(--sub);font-size:15px;padding:40px 0}
.placeholder{position:relative;z-index:1;max-width:620px;margin:14vh auto;padding:0 24px;text-align:center}
.placeholder .mark{font-size:40px;filter:drop-shadow(0 0 16px rgba(0,229,255,.4))}
.foot{color:rgba(255,255,255,.32);font-size:11.5px;margin-top:10px;font-family:ui-monospace,monospace}
.gov{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0}
.chip{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:11.5px;letter-spacing:.04em;padding:4px 11px;border-radius:20px;background:rgba(255,255,255,.06);color:var(--sub);border:1px solid var(--line)}
.chip.ok{color:#7CFFB2;background:rgba(124,255,178,.08);border-color:rgba(124,255,178,.22)}
.chip.warn{color:#ffb86b;background:rgba(255,184,107,.1);border-color:rgba(255,184,107,.26)}
.escalate{color:#ffb86b;font-size:13px;margin:12px 0 0;font-weight:550}
</style></head><body><div class="bg" aria-hidden="true"></div>
${armed
    ? `<header><p class="eyebrow">Megabyte OS · Autonomous Business OS</p><h1>Approval Inbox</h1>
<p class="sub">${count} item${count === 1 ? "" : "s"} await your review — the autonomous fleet's open work across the estate. <span class="foot">updated ${stamp}</span></p>
<div class="gov"><span class="chip">✦ ${count} awaiting</span><span class="chip ok">✓ ${gov.ready} ready</span><span class="chip muted">◷ ${gov.drafts} draft${gov.drafts === 1 ? "" : "s"}</span>${gov.stalled ? `<span class="chip warn">⚠ ${gov.stalled} stalled &gt;14d</span>` : ""}</div>
${gov.stalled ? `<p class="escalate">⚠ ${gov.stalled} approval${gov.stalled === 1 ? "" : "s"} stalled beyond 14 days — escalate or clear.</p>` : ""}</header>
<main>${body}</main>`
    : `<main class="placeholder"><div class="mark">✦</div><h1>Approval Inbox</h1>
<p class="sub">This human-oversight surface is <strong>arming behind authentication</strong>. It will show the estate's pending approvals once its access gate is verified. No data is exposed until then.</p>
<p class="foot">Megabyte OS · idea #7</p></main>`}
</body></html>`;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const accept = req.headers.get("accept") || "";

    if (req.method === "GET" && accept.includes("text/event-stream") && !accept.includes("text/html"))
      return new Response("Method Not Allowed", { status: 405, headers: CORS });

    if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: CORS });

    const { armed, approvals, error } = await fetchApprovals(env);

    if (url.pathname === "/api/approvals") {
      return Response.json(
        { armed, count: approvals.length, approvals, ...(error ? { error } : {}) },
        { headers: { ...CORS, ...SEC, "cache-control": "no-store" } },
      );
    }

    const stamp = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
    // Paperclip-style governance summary (watchdog escalation) — derived from already-fetched data.
    const gov = {
      ready: approvals.filter((a) => !a.draft).length,
      drafts: approvals.filter((a) => a.draft).length,
      stalled: approvals.filter((a) => a.ageDays > 14).length,
    };
    const html = page(renderCards(approvals), approvals.length, armed, stamp, gov);
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", ...CORS, ...SEC, "cache-control": "no-store" } });
  },
};

// Megabyte OS — MCP server (estate idea #8: "ship the OS into the agents").
//
// Exposes megabyte-os capabilities to any MCP client (Claude, ChatGPT, VS Code, …) over the MCP
// Streamable-HTTP transport (JSON-RPC 2.0 over POST). This is OS-as-MCP-SERVER — distinct from the
// OS's `mcp` GATEKEEPER, which is OS-as-MCP-client (the OS connecting OUT to external MCP servers).
//
// Scope is deliberately PUBLIC + READ-ONLY + NON-SENSITIVE (live feature flags, an about blurb, the
// integrations catalog) — nothing here is gated, destructive, or private, so no auth is required
// (same posture as a public API). Every tool returns BOTH `content` (text the model reads) AND
// `structuredContent` (for clients that render structure) — the dual-output / graceful-degradation
// contract from the MCP Apps doctrine. New sensitive/destructive tools would require auth + the
// mcp-server-hardening gates before shipping.

interface Env {
  OS_ORIGIN?: string; // defaults to https://megabyte.space
  // CF-native per-colo rate limiter (unsafe binding) — protects the public JSON-RPC surface from
  // abuse / cost amplification (each tools/call fans out to the OS origin). Fail-soft if unbound.
  MCP_RATELIMIT?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  // CF version-metadata binding — the deployed Worker version {id, tag, timestamp}, injected at deploy
  // (never hardcoded → never rots). Surfaced at GET /health so monitoring can assert the live version.
  CF_VERSION?: { id: string; tag: string; timestamp: string };
}

const SERVER = { name: "megabyte-os", version: "0.1.0" };
const DEFAULT_PROTOCOL = "2025-06-18";
const SUPPORTED_PROTOCOLS = new Set(["2024-11-05", "2025-03-26", "2025-06-18", "2026-07-28"]);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, authorization",
  "access-control-max-age": "86400",
};

// Security headers — the apex + this server shipped only HSTS/nosniff/XFO/referrer (no CSP /
// Permissions-Policy / cross-origin). Closed here: the info page is static (inline <style> + the CF
// beacon + JSON-LD data), so a tight CSP won't break it; CORP stays cross-origin so browser MCP
// clients can still reach it. Applied to every response (harmless on JSON-RPC, enforced on HTML).
const SEC = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "cross-origin",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src https://static.cloudflareinsights.com; connect-src https://cloudflareinsights.com; base-uri 'none'; frame-ancestors 'none'",
};

// --- The OS capability catalog the tools ground on (real, non-sensitive facts). ------------------
const OS_INFO = {
  name: "Megabyte OS",
  url: "https://megabyte.space",
  tagline: "An autonomous business operating system — operate around goals, opportunities, and outcomes.",
  description:
    "Megabyte OS is Brian Zalewski's solo AI-native studio OS (Megabyte Labs), running on Cloudflare " +
    "at megabyte.space. It is a fork of Cloudflare OS: a force-login (Better Auth — GitHub + Google SSO " +
    "+ magic-link) workshop where AI agents build gadgets, run workspaces, and operate integrations. " +
    "Cloudflare-native throughout (Workers, D1, R2, KV, Durable Objects, AI Gateway).",
  surfaces: ["Home", "Workspaces", "Outputs", "Blueprints", "Explore", "Context", "Pulse", "Gadgets"],
  auth: "Better Auth (GitHub + Google SSO + magic-link + email/password); force-login before the OS.",
  stack: ["Cloudflare Workers", "D1", "R2", "KV", "Durable Objects", "AI Gateway", "React", "TanStack Router"],
};

// Real deployed OS integrations ("gatekeepers" — the OS connects OUT to these).
const INTEGRATIONS = [
  { key: "github", name: "GitHub" },
  { key: "google", name: "Google" },
  { key: "slack", name: "Slack" },
  { key: "notion", name: "Notion" },
  { key: "linear", name: "Linear" },
  { key: "spotify", name: "Spotify" },
  { key: "supabase", name: "Supabase" },
  { key: "homeassistant", name: "Home Assistant" },
  { key: "confluence", name: "Confluence" },
  { key: "zoominfo", name: "ZoomInfo" },
  { key: "mcp", name: "MCP (connect to external MCP servers)" },
  { key: "mcp-portal", name: "MCP Portal" },
];

const TOOLS = [
  {
    name: "get_feature_flags",
    description:
      "Get Megabyte OS's live feature flags (evaluated at the edge via Cloudflare Flagship). " +
      "Returns the current boolean values that control OS behavior, e.g. native_os_only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "about_megabyte_os",
    description:
      "Describe what Megabyte OS is: its purpose, surfaces, authentication, and the Cloudflare-native " +
      "stack it runs on. Use this to understand the product before calling other tools.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    _meta: { "openai/outputTemplate": "ui://megabyte-os/overview" },
  },
  {
    name: "list_integrations",
    description:
      "List the integrations (gatekeepers) Megabyte OS can connect to — GitHub, Google, Slack, Notion, " +
      "Linear, Spotify, Supabase, Home Assistant, Confluence, ZoomInfo, and external MCP servers.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

// --- Tool implementations (each returns { text, structured }). -----------------------------------
async function runTool(name: string, origin: string): Promise<{ text: string; structured: unknown }> {
  switch (name) {
    case "get_feature_flags": {
      // Grounded on the live, public /api/flags endpoint. Fail-soft: never throw to the client.
      try {
        const r = await fetch(`${origin}/api/flags`, { headers: { accept: "application/json" } });
        const flags = r.ok ? ((await r.json()) as Record<string, unknown>) : {};
        const lines = Object.entries(flags).map(([k, v]) => `- ${k}: ${v}`);
        const text = lines.length
          ? `Megabyte OS feature flags (live):\n${lines.join("\n")}`
          : "No feature flags are currently exposed.";
        return { text, structured: { flags, source: `${origin}/api/flags`, live: r.ok } };
      } catch {
        return {
          text: "Feature flags are temporarily unavailable (the OS flag endpoint did not respond).",
          structured: { flags: {}, live: false },
        };
      }
    }
    case "about_megabyte_os": {
      const text =
        `${OS_INFO.name} — ${OS_INFO.tagline}\n\n${OS_INFO.description}\n\n` +
        `Surfaces: ${OS_INFO.surfaces.join(", ")}.\nAuth: ${OS_INFO.auth}\n` +
        `Stack: ${OS_INFO.stack.join(", ")}.\nLive at ${OS_INFO.url}.`;
      return { text, structured: OS_INFO };
    }
    case "list_integrations": {
      const text =
        `Megabyte OS integrations (${INTEGRATIONS.length}):\n` +
        INTEGRATIONS.map((i) => `- ${i.name} (${i.key})`).join("\n");
      return { text, structured: { count: INTEGRATIONS.length, integrations: INTEGRATIONS } };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- JSON-RPC 2.0 handling. ----------------------------------------------------------------------
type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method?: string; params?: any };
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0" as const, id, result });
const err = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0" as const, id, error: { code, message } });

async function handleRpc(msg: Rpc, origin: string): Promise<object | null> {
  const { id, method, params } = msg;
  // Notifications (no id) get no response.
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize": {
      const requested = params?.protocolVersion;
      const protocolVersion = SUPPORTED_PROTOCOLS.has(requested) ? requested : DEFAULT_PROTOCOL;
      return ok(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        serverInfo: SERVER,
        instructions:
          "Megabyte OS exposed as MCP tools. Call about_megabyte_os first, then get_feature_flags " +
          "or list_integrations. All tools are read-only and return structured content.",
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notification, no response
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "resources/list":
      // MCP Apps (SEP-1865): the ui:// view an Apps-capable client (ChatGPT/Claude) renders inline.
      return ok(id, { resources: RESOURCES });
    case "resources/read": {
      if (params?.uri === UI_TEMPLATE_URI)
        return ok(id, { contents: [{ uri: UI_TEMPLATE_URI, mimeType: "text/html+skybridge", text: UI_OVERVIEW_HTML }] });
      return isNotification ? null : err(id, -32602, `Unknown resource: ${params?.uri}`);
    }
    case "tools/call": {
      const name = params?.name;
      if (!name || !TOOLS.some((t) => t.name === name)) {
        return isNotification ? null : err(id, -32602, `Unknown tool: ${name}`);
      }
      try {
        const { text, structured } = await runTool(name, origin);
        // MCP Apps: link the inline ui:// view. Graceful degradation — text + structuredContent remain
        // the answer for the (many) clients that don't render the view.
        const meta = name === "about_megabyte_os" ? { _meta: { "openai/outputTemplate": UI_TEMPLATE_URI } } : {};
        return ok(id, { content: [{ type: "text", text }], structuredContent: structured, isError: false, ...meta });
      } catch (e) {
        // Tool-level errors go in the result (isError:true), not a protocol error, per MCP.
        return ok(id, {
          content: [{ type: "text", text: `Tool ${name} failed: ${(e as Error).message}` }],
          isError: true,
        });
      }
    }
    default:
      return isNotification ? null : err(id, -32601, `Method not found: ${method}`);
  }
}

const INFO_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Megabyte OS · MCP Server</title>
<meta name="description" content="Use Megabyte OS as MCP tools — point Claude, ChatGPT, or VS Code at this Model Context Protocol server (JSON-RPC over HTTP). Read-only tools: about the OS, live feature flags, integrations."/>
<link rel="canonical" href="https://mcp.megabyte.space/"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="https://mcp.megabyte.space/"/>
<meta property="og:title" content="Megabyte OS · MCP Server"/>
<meta property="og:description" content="Point an MCP client (Claude, ChatGPT, VS Code) at this URL to use Megabyte OS as tools."/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="Megabyte OS · MCP Server"/>
<meta name="twitter:description" content="Use Megabyte OS as MCP tools over the Model Context Protocol."/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Megabyte OS MCP Server","applicationCategory":"DeveloperApplication","operatingSystem":"Cloudflare Workers","url":"https://mcp.megabyte.space/","description":"A Model Context Protocol (MCP) server exposing Megabyte OS as read-only tools to AI agents.","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"publisher":{"@type":"Organization","name":"Megabyte Labs","url":"https://megabyte.space"}}</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#060610;color:#eaf6ff;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif}main{max-width:560px;padding:32px;text-align:center}
h1{font-size:22px;margin:0 0 6px}code{background:rgba(0,229,255,.1);color:#00E5FF;padding:2px 7px;border-radius:6px;font-size:13px}
p{color:rgba(255,255,255,.65);line-height:1.6;font-size:14.5px}a{color:#00E5FF}</style></head>
<body><main><h1>Megabyte OS · MCP Server</h1>
<p>This is an <strong>MCP (Model Context Protocol) server</strong> — point an MCP client (Claude, ChatGPT,
VS Code) at this URL to use Megabyte OS as tools. It speaks JSON-RPC over <code>POST</code> (Streamable HTTP).</p>
<p>Tools: <code>about_megabyte_os</code> · <code>get_feature_flags</code> · <code>list_integrations</code>.
Read-only &amp; public. The OS itself is at <a href="https://megabyte.space">megabyte.space</a>.</p></main></body></html>`;

// --- MCP Apps (SEP-1865): an inline ui:// overview card an Apps-capable client renders in a sandboxed
// iframe. ENRICHMENT ONLY — every tool still returns text + structuredContent for non-rendering clients.
const UI_TEMPLATE_URI = "ui://megabyte-os/overview";
const RESOURCES = [
  {
    uri: UI_TEMPLATE_URI,
    name: "Megabyte OS overview card",
    description: "Interactive overview of Megabyte OS — surfaces, integrations, stack. Rendered inline by MCP-Apps-capable clients.",
    mimeType: "text/html+skybridge",
  },
];
const UI_OVERVIEW_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;background:#060610;color:#eaf6ff}
.card{max-width:640px;margin:0 auto;padding:22px}
.eyebrow{font-family:ui-monospace,monospace;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:#00E5FF;margin:0 0 6px}
h1{font-size:20px;margin:0 0 6px;letter-spacing:-.01em}
.tag{color:rgba(255,255,255,.62);font-size:13.5px;line-height:1.5;margin:0 0 16px}
.row{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 6px}
.chip{font-size:11px;border-radius:20px;padding:3px 10px;background:rgba(0,229,255,.08);color:#9fe9ff;border:1px solid rgba(0,229,255,.18)}
.lab{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.4);margin:14px 0 7px}
a{color:#00E5FF;text-decoration:none;font-weight:600;font-size:13px}</style></head><body><div class="card">
<p class="eyebrow">Megabyte OS · Autonomous Business OS</p>
<h1>${OS_INFO.name}</h1>
<p class="tag">${OS_INFO.tagline}</p>
<p class="lab">Surfaces</p><div class="row">${OS_INFO.surfaces.map((s) => `<span class="chip">${s}</span>`).join("")}</div>
<p class="lab">Integrations</p><div class="row">${INTEGRATIONS.slice(0, 10).map((i) => `<span class="chip">${i.name}</span>`).join("")}</div>
<p class="lab">Stack</p><div class="row">${OS_INFO.stack.map((s) => `<span class="chip">${s}</span>`).join("")}</div>
<p style="margin-top:16px"><a href="${OS_INFO.url}">Open Megabyte OS →</a></p>
</div></body></html>`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = env.OS_ORIGIN || "https://megabyte.space";

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (req.method === "GET") {
      // Version-stamped health probe — monitoring (Uptime Kuma) can assert the LIVE deployed version.
      if (new URL(req.url).pathname === "/health") {
        return Response.json(
          { ok: true, service: SERVER.name, version: env.CF_VERSION ?? null, protocol: DEFAULT_PROTOCOL, ts: new Date().toISOString() },
          { headers: { ...CORS, ...SEC, "cache-control": "no-store" } },
        );
      }
      // Only the MCP SSE-stream probe (Accept: text/event-stream) gets 405 — this server is
      // request/response only, no server-initiated stream. EVERY other GET (browsers, uptime
      // monitors, bare curl) gets the info page (200) so the endpoint is human-friendly + monitorable.
      const accept = req.headers.get("accept") || "";
      if (accept.includes("text/event-stream") && !accept.includes("text/html")) {
        return new Response("Method Not Allowed (no SSE stream; POST JSON-RPC for MCP)", { status: 405, headers: CORS });
      }
      return new Response(INFO_HTML, { headers: { "content-type": "text/html; charset=utf-8", ...CORS, ...SEC } });
    }

    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

    // Rate-limit the public JSON-RPC surface per client IP (CF-native binding). Public + unauthed, and
    // every tools/call fans out to the OS origin, so hammering is a real cost/abuse vector. Fail-soft:
    // if the binding is ever absent the check is skipped rather than breaking the server.
    if (env.MCP_RATELIMIT) {
      const ip = req.headers.get("cf-connecting-ip") || "anon";
      const { success } = await env.MCP_RATELIMIT.limit({ key: ip });
      if (!success) {
        return Response.json(err(null, -32000, "Rate limit exceeded — max 60 requests/min per IP. Retry shortly."), {
          status: 429,
          headers: { ...CORS, ...SEC, "retry-after": "60", "cache-control": "no-store" },
        });
      }
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(err(null, -32700, "Parse error"), { status: 400, headers: CORS });
    }

    // Support a single message or a JSON-RPC batch.
    const batch = Array.isArray(body) ? (body as Rpc[]) : [body as Rpc];
    const responses: object[] = [];
    for (const msg of batch) {
      const res = await handleRpc(msg, origin);
      if (res) responses.push(res);
    }

    // All notifications ⇒ 202 with no body (per the Streamable-HTTP spec).
    if (responses.length === 0) return new Response(null, { status: 202, headers: CORS });

    const payload = Array.isArray(body) ? responses : responses[0];
    return Response.json(payload, { headers: { ...CORS, ...SEC, "cache-control": "no-store" } });
  },
};

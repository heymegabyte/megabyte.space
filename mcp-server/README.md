# Megabyte OS — MCP Server (estate idea #8)

Exposes Megabyte OS to any MCP client (Claude, ChatGPT, VS Code, …) as tools — "ship the OS into
the agents," the 2026 MCP-Apps distribution surface. **OS-as-MCP-server**, distinct from the OS's
`mcp` gatekeeper (which is OS-as-MCP-*client*, connecting OUT to external MCP servers).

Standalone worker `megabyte-os-mcp` — intentionally NOT wired into the OS deploy pipeline
(`deployment.jsonc`/`deploy.ts`), so it carries zero apex-deploy risk.

## Transport + tools

- MCP **Streamable HTTP** (JSON-RPC 2.0 over `POST`). `GET` with `text/html` → a human info page;
  `GET` for an SSE stream → 405 (this server is request/response only). CORS-open for browser MCP clients.
- Tools (all **read-only, public, non-sensitive** → no auth, same posture as a public API; every tool
  returns BOTH `content` text AND `structuredContent` per the dual-output / graceful-degradation contract):
  - `about_megabyte_os` — what the OS is, surfaces, auth, stack.
  - `get_feature_flags` — the OS's **live** feature flags (grounded on `megabyte.space/api/flags`, the
    Cloudflare Flagship edge eval from idea #5). Fail-soft.
  - `list_integrations` — the OS's integrations (GitHub, Google, Slack, Notion, Linear, Spotify,
    Supabase, Home Assistant, Confluence, ZoomInfo, external MCP).

## Deploy + verify

```bash
cd mcp-server
npx wrangler deploy                       # → megabyte-os-mcp.<subdomain>.workers.dev
# verify (JSON-RPC):
URL=https://megabyte-os-mcp.<subdomain>.workers.dev
curl -s "$URL" -H content-type:application/json \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}'
curl -s "$URL" -H content-type:application/json -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
curl -s "$URL" -H content-type:application/json \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_feature_flags"}}'
```

## Follow-ups

- Brandable `mcp.megabyte.space` custom domain (add a Worker custom-domain route; set `workers_dev`
  explicitly since `routes` auto-disables it).
- New **sensitive/destructive** tools would require auth (CF Access JWT / bearer) + the
  `mcp-server-hardening` gates (rate-limit, audit log, `.strict()` schemas) BEFORE shipping.
- An MCP Apps `ui://` view for a high-value tool (e.g. a feature-flags card).

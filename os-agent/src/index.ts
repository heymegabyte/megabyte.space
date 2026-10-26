// Megabyte OS — Agent pilot (estate idea #6: rebuild OS agent surfaces on the Cloudflare Agents SDK).
//
// Pilots ONE OS agent on the Agents SDK `Agent` base class, demonstrating the primitives #6 asks for:
//   • DURABLE SESSION  — OSAgent is a SQLite-backed Durable Object; conversation history + a per-session
//                        turn counter persist across requests via this.setState / this.state.
//   • SUB-AGENTS       — OSAgent delegates "fetch the live feature flags" to a FlagsResearcher sub-agent
//                        (this.subAgent), the SDK's child-agent pattern (discovered via ctx.exports).
//   • GROUNDED + LLM   — answers are grounded on real OS data (static OS facts + the live /api/flags the
//                        sub-agent fetches) and generated with Workers AI (env.AI), fail-soft.
//
// HTTP is routed via getAgentByName() + RPC methods (the SDK's server-side RPC path) — routeAgentRequest
// is WebSocket/useAgent-oriented and rejects plain HTTP POSTs with "Invalid request". Standalone worker
// (zero apex risk). Public: only PUBLIC OS info (like the MCP server). A per-session turn cap (durable
// state) guards the cost-bearing LLM.

import { Agent, getAgentByName } from "agents";

interface Env {
  AI: { run(model: string, input: unknown): Promise<any> };
  OSAgent: DurableObjectNamespace;
}

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_TURNS = 20;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const OS_FACTS =
  "Megabyte OS is Brian Zalewski's autonomous business operating system (Megabyte Labs), running on " +
  "Cloudflare at megabyte.space. It is a force-login (Better Auth: GitHub + Google SSO + magic-link) " +
  "fork of Cloudflare OS where AI agents build gadgets, run workspaces, and operate integrations " +
  "(GitHub, Google, Slack, Notion, Linear, Spotify, Supabase, Home Assistant, Confluence, ZoomInfo, MCP). " +
  "It is Cloudflare-native: Workers, D1, R2, KV, Durable Objects, AI Gateway. It operates around goals, " +
  "opportunities, and outcomes, with calm/beautiful/fast UX and an approval-inbox for human oversight.";

interface AskResult {
  response: string;
  session: { turns: number; maxTurns: number };
  groundedFlags: Record<string, unknown>;
  model: string;
  subAgent: "FlagsResearcher";
}

// --- The grounding sub-agent: fetches the OS's LIVE feature flags. -------------------------------
export class FlagsResearcher extends Agent<Env> {
  async getFlags(): Promise<Record<string, unknown>> {
    try {
      const r = await fetch("https://megabyte.space/api/flags", { headers: { accept: "application/json" } });
      return r.ok ? ((await r.json()) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
}

interface OSState {
  turns: number;
  history: { role: "user" | "assistant"; content: string }[];
}

// --- The pilot OS agent: durable session + sub-agent delegation + grounded Workers-AI answers. ---
export class OSAgent extends Agent<Env, OSState> {
  initialState: OSState = { turns: 0, history: [] };

  info() {
    return {
      agent: "megabyte-os",
      pilot: "Cloudflare Agents SDK (Agent base class) — durable session + sub-agents + Workers AI",
      usage: 'POST {"message":"..."} to /agents/os-agent/<session-id>',
      session: { turns: this.state.turns, maxTurns: MAX_TURNS },
    };
  }

  async ask(message: string): Promise<AskResult> {
    const msg = (message || "").toString().slice(0, 2000).trim();
    const base = { session: { turns: this.state.turns, maxTurns: MAX_TURNS }, model: MODEL, subAgent: "FlagsResearcher" as const };
    if (!msg) return { response: "message required", groundedFlags: {}, ...base };
    if (this.state.turns >= MAX_TURNS)
      return { response: `Session turn limit (${MAX_TURNS}) reached. Start a new session.`, groundedFlags: {}, ...base };

    // SUB-AGENT: delegate live-flag grounding to a child agent.
    let flags: Record<string, unknown> = {};
    try {
      const researcher = await this.subAgent(FlagsResearcher, "flags");
      flags = await researcher.getFlags();
    } catch {
      /* fail-soft: ground without live flags */
    }

    const system =
      `You are the Megabyte OS concierge. Answer ONLY about Megabyte OS, grounded in these facts; ` +
      `be concise (2-4 sentences), accurate, and never invent capabilities.\n\nFACTS: ${OS_FACTS}\n` +
      `LIVE FEATURE FLAGS: ${JSON.stringify(flags)}`;
    const messages = [
      { role: "system", content: system },
      ...this.state.history.slice(-8),
      { role: "user", content: msg },
    ];

    let answer = "";
    try {
      const out = await this.env.AI.run(MODEL, { messages, max_tokens: 400 });
      answer = (out?.response || out?.result?.response || "").toString().trim();
    } catch (e) {
      answer = `(LLM unavailable: ${(e as Error).message}) Grounded facts: ${OS_FACTS}`;
    }
    if (!answer) answer = "I couldn't generate a response just now. Please try again.";

    const history = [
      ...this.state.history,
      { role: "user" as const, content: msg },
      { role: "assistant" as const, content: answer },
    ].slice(-16);
    this.setState({ turns: this.state.turns + 1, history });

    return { response: answer, groundedFlags: flags, ...base, session: { turns: this.state.turns, maxTurns: MAX_TURNS } };
  }
}

const INFO = `Megabyte OS Agent (idea #6 pilot — Cloudflare Agents SDK).
POST {"message":"what is megabyte os?"} to /agents/os-agent/<your-session-id>
Durable session (state persists per session) + a FlagsResearcher sub-agent + Workers AI, grounded on real OS data.`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/agents\/os-agent\/([^/]+)\/?$/);
    if (m) {
      const agent = await getAgentByName(env.OSAgent, decodeURIComponent(m[1]));
      if (request.method === "GET")
        return Response.json(await agent.info(), { headers: { ...CORS, "cache-control": "no-store" } });
      if (request.method === "POST") {
        let body: { message?: string } = {};
        try {
          body = (await request.json()) as { message?: string };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
        }
        const result = await agent.ask(body.message || "");
        return Response.json(result, { headers: { ...CORS, "cache-control": "no-store" } });
      }
      return new Response("Method Not Allowed", { status: 405, headers: CORS });
    }
    return new Response(INFO, { headers: { "content-type": "text/plain; charset=utf-8", ...CORS } });
  },
} satisfies ExportedHandler<Env>;

import { makeAuth, type Env } from "./src/auth";

/**
 * megabyte-auth — the Better Auth rail. NOT directly routed; the apex worker
 * (megabyte-home) forwards megabyte.space/api/auth/* here over a service binding.
 * Everything else 404s (this worker has no public surface of its own).
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth/")) {
      return makeAuth(env).handler(request);
    }
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;

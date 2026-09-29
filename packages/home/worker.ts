// Public front door for megabyte.space.
// Serves the marketing homepage from static assets; /login funnels into the
// Access-gated Cloudflare OS at os.megabyte.space.

interface Env {
  ASSETS: Fetcher;
}

const OS_ORIGIN = "https://os.megabyte.space";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/login" || url.pathname === "/login/") {
      return Response.redirect(`${OS_ORIGIN}/${url.search}`, 302);
    }

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", surface: "megabyte-home" });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;

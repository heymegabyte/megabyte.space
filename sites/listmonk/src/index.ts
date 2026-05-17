import { Container, ContainerProxy, getContainer } from '@cloudflare/containers';

interface Env {
  LISTMONK: DurableObjectNamespace;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
}

/** Branded loading page shown while Listmonk container boots */
function loadingPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Listmonk — Starting Up</title>
  <meta name="theme-color" content="#060610">
  <meta http-equiv="refresh" content="5">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      min-height:100dvh;display:flex;align-items:center;justify-content:center;flex-direction:column;
      background:#060610;color:#e8e6f0;font-family:'Space Grotesk',system-ui,sans-serif;
      -webkit-font-smoothing:antialiased;
    }
    .loader{text-align:center;max-width:420px;padding:2rem}
    .spinner{
      width:48px;height:48px;border:3px solid rgba(255,255,255,0.06);
      border-top-color:#00E5FF;border-radius:50%;
      animation:spin 0.8s linear infinite;margin:0 auto 1.5rem;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{font-size:1.4rem;margin-bottom:0.5rem;font-weight:600}
    h1 span{color:#00E5FF}
    p{color:rgba(232,230,240,0.6);font-size:0.9rem;line-height:1.5}
    .status{
      margin-top:1.5rem;padding:0.75rem 1.25rem;
      background:rgba(0,229,255,0.05);border:1px solid rgba(0,229,255,0.15);
      border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:0.8rem;
      color:#00E5FF;
    }
    .dots::after{content:'';animation:dots 1.5s steps(4,end) infinite}
    @keyframes dots{
      0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}
    }
    .brand{
      position:fixed;bottom:2rem;
      font-size:0.75rem;color:rgba(232,230,240,0.3);
    }
    .brand a{color:rgba(0,229,255,0.5);text-decoration:none}
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <h1>list<span>monk</span></h1>
    <p>Waking up the newsletter engine and its database. This usually takes 10-15 seconds on first visit.</p>
    <div class="status">
      <span class="dots">Initializing</span>
    </div>
    <p style="margin-top:1rem;font-size:0.8rem">This page auto-refreshes every 5 seconds.</p>
  </div>
  <div class="brand">Powered by <a href="https://megabyte.space">Megabyte Labs</a></div>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Retry-After': '5',
      'Cache-Control': 'no-store',
    },
  });
}

export class ListmonkContainer extends Container {
  defaultPort = 9000;
  sleepAfter = '30m';
  enableInternet = true;

  override envVars = {
    LISTMONK_app__address: '0.0.0.0:9000',
    LISTMONK_app__admin_username: 'admin',
    LISTMONK_app__admin_password: 'admin',
    LISTMONK_db__host: 'ep-steep-heart-amhar31u.c-5.us-east-1.aws.neon.tech',
    LISTMONK_db__port: '5432',
    LISTMONK_db__user: 'neondb_owner',
    LISTMONK_db__password: 'npg_Um42aYVPWIQj',
    LISTMONK_db__database: 'listmonk',
    LISTMONK_db__ssl_mode: 'require',
  };

  override onStart(): void {
    console.log('[listmonk] Container started — Neon wakeup + Listmonk boot complete');
  }

  override onStop(): void {
    console.log('[listmonk] Container stopped after idle timeout');
  }

  override onError(error: unknown): void {
    console.error('[listmonk] Container error:', error);
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health check handled at container level
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Proxy to Listmonk
    try {
      return await this.containerFetch(request);
    } catch {
      return loadingPage();
    }
  }
}

// Required for outbound interception
export { ContainerProxy };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check at worker level (before container)
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Route to the single Listmonk container instance
    try {
      const container = getContainer(env.LISTMONK, 'listmonk-primary');
      const response = await container.fetch(request);

      // If container is still booting or crashed, show loading page
      if (response.status === 500 || response.status === 502 || response.status === 503) {
        return loadingPage();
      }

      return response;
    } catch {
      return loadingPage();
    }
  },
};

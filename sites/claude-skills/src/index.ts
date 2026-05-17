import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

interface Env {
  ENVIRONMENT: string;
  ASSETS: Fetcher;
  LISTMONK_URL: string;
  LISTMONK_USER: string;
  LISTMONK_PASS: string;
  CF_ACCESS_CLIENT_ID: string;
  CF_ACCESS_CLIENT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'https://img.shields.io', 'data:'],
      connectSrc: ["'self'", 'https://listmonk.megabyte.space'],
      frameAncestors: ["'none'"],
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
  })
);

app.get('/health', (c) =>
  c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
);

app.get('/api/skills', (c) =>
  c.json({
    categories: 14,
    agents: 18,
    platforms: 32,
    referenceDocs: 94,
    version: '7.2.1',
    repo: 'https://github.com/megabytespace/claude-skills',
  })
);

// Newsletter subscription proxy (bypasses CF Access via service token)
app.post('/api/subscribe', async (c) => {
  const body = await c.req.parseBody();
  const email = String(body.email || '').trim();
  if (!email || !email.includes('@')) {
    return c.json({ error: 'Valid email required' }, 400);
  }

  const auth = btoa(`${c.env.LISTMONK_USER}:${c.env.LISTMONK_PASS}`);
  const res = await fetch(`${c.env.LISTMONK_URL}/api/public/subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Access-Client-Id': c.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': c.env.CF_ACCESS_CLIENT_SECRET,
    },
    body: JSON.stringify({
      email,
      name: '',
      list_uuids: ['345144f6-b088-484b-8e7b-4ee7bbb4e4c4'],
    }),
  });

  if (res.ok) {
    return c.json({ ok: true, message: 'Check your inbox to confirm.' });
  }

  const text = await res.text();
  console.error('Listmonk error:', res.status, text);
  return c.json({ error: 'Subscription failed. Try hey@megabyte.space.' }, 502);
});

app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, 500);
});

export default app;

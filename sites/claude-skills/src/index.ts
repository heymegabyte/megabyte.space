import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

interface Env {
  ENVIRONMENT: string;
  ASSETS: Fetcher;
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
      connectSrc: ["'self'"],
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

app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, 500);
});

export default app;

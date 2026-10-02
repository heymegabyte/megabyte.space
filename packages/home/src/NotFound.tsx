// Styled 404 for the apex. The Worker returns a real 404 STATUS for unknown HTML
// paths (no soft-404s); this renders inside that shell. Black/cyan + a static
// nebula glow (no WebGL weight on the error path), reusing the apex's own classes.
// A near-miss path gets a "Did you mean …?" closest-route suggestion (extra-mile).
import { KNOWN_ROUTES } from "./known-routes";

/** Levenshtein edit distance (small strings only). */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

/** The closest real route to a typo'd path, when it's a near miss (never "/"). */
function closestRoute(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const route of KNOWN_ROUTES) {
    if (route === "/") continue;
    const dist = editDistance(p, route);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = route;
    }
  }
  return best && bestDistance > 0 && bestDistance <= 4 ? best : null;
}

export default function NotFound() {
  const suggestion = typeof window !== "undefined" ? closestRoute(window.location.pathname) : null;
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#060610] px-6 text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 32%, rgba(0,229,255,0.12), transparent 60%), radial-gradient(48% 42% at 72% 72%, rgba(124,58,237,0.16), transparent 62%)",
        }}
      />
      <div className="relative">
        <p className="eyebrow">Megabyte OS · 404</p>
        <h1 className="font-display mt-5 text-[clamp(4rem,19vw,11rem)] font-extrabold leading-none tracking-tight">
          <span className="text-gradient">404</span>
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-white/70">
          Lost in the nebula — this page drifted out of orbit.
        </p>
        {suggestion && (
          <p className="mt-3 text-sm text-white/55" data-testid="notfound-suggestion">
            Did you mean{" "}
            <a href={suggestion} className="text-[--color-cyan] underline transition hover:text-white">
              {suggestion}
            </a>
            ?
          </p>
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/"
            data-testid="notfound-home"
            className="cta-primary font-display rounded-full px-8 py-3.5 text-base font-bold text-[#03030a]"
          >
            ← Back to Megabyte OS
          </a>
          <a
            href="/status"
            className="rounded-full border border-white/15 px-7 py-3.5 text-base text-white/80 transition hover:border-[--color-cyan] hover:text-white"
          >
            System status
          </a>
        </div>
      </div>
    </main>
  );
}

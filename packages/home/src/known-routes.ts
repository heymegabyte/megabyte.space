/**
 * The apex's real HTML routes — the SINGLE SOURCE OF TRUTH shared by the Worker
 * (soft-404 status rewrite + pageview capture) AND the SPA entry (main.tsx) so
 * the two can never drift (per the soft-404 doctrine). Add a route here the same
 * change that ships a new apex page.
 */
export const KNOWN_ROUTES = ["/", "/status", "/signin"] as const;

/** True when `pathname` is a real apex HTML route (trailing-slash tolerant). */
export function isKnownRoute(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return (KNOWN_ROUTES as readonly string[]).includes(p);
}

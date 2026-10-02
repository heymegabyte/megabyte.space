// Styled 404 for the apex. The Worker returns a real 404 STATUS for unknown HTML
// paths (no soft-404s); this renders inside that shell. Black/cyan + a static
// nebula glow (no WebGL weight on the error path), reusing the apex's own classes.

export default function NotFound() {
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

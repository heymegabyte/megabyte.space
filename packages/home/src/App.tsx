import { Fragment, useEffect, useRef, type CSSProperties } from "react";

// First-run overlay (WS-11): the WebGL homepage is an intro LAYER over the OS —
// shown the first time, dismissed by "Enter the OS", skipped on return visits.
// Gated by VITE_FIRST_RUN_OVERLAY so the live public apex stays byte-identical
// until the domain flip lands the OS at the apex.
const FIRST_RUN_OVERLAY = import.meta.env.VITE_FIRST_RUN_OVERLAY === "true";
const ENTERED_KEY = "megabyteOS_entered";
const OS_ENTRY = "/login";

/** True once the visitor has pressed "Enter the OS" at least once. */
function hasEntered(): boolean {
  try {
    return localStorage.getItem(ENTERED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Persist the first-run flag so return visits skip straight to the OS. */
function markEntered(): void {
  try {
    localStorage.setItem(ENTERED_KEY, "1");
  } catch {
    /* storage unavailable — the overlay simply shows again, no harm */
  }
}

// Asymmetric bento: span + featured drive a 3×3 lg grid that breaks the uniform
// 3×2 — card 0 is a wide hero tile, card 1 is tall, card 4 is wide. Gap-free on
// lg; a 1-col stack on mobile (spans are sm/lg-only, so no overflow @390).
const FEATURES = [
  {
    kicker: "Agent chat",
    title: "Agents that know the company",
    body: "Ask for work, not files. Every agent is preloaded with how Megabyte Labs operates — context, tools, and rules included.",
    accent: "from-cyan-400/20",
    span: "sm:col-span-2 lg:col-span-2",
    featured: true,
  },
  {
    kicker: "Gadgets",
    title: "Apps that build themselves",
    body: "Every slide deck, dashboard, and tool is your private instance. Missing a feature? Ask the agent to add it — safely.",
    accent: "from-violet-500/20",
    span: "lg:row-span-2",
    featured: true,
  },
  {
    kicker: "Gatekeepers",
    title: "Security that says yes",
    body: "Capability-scoped access to GitHub, Google, email, and more. Every action logged, simulated ahead, approved in bulk.",
    accent: "from-sky-400/20",
    span: "",
    featured: false,
  },
  {
    kicker: "Blueprints",
    title: "From prompt to product",
    body: "Slides for tomorrow's meeting, an issue dashboard for a repo, a collaborative whiteboard — one sentence each.",
    accent: "from-cyan-400/20",
    span: "",
    featured: false,
  },
  {
    kicker: "Scheduler",
    title: "Work while you sleep",
    body: "Agents run on timers and recurrences. Schedule research, reports, and follow-ups — they arrive finished.",
    accent: "from-violet-500/20",
    span: "lg:col-span-2",
    featured: true,
  },
  {
    kicker: "Your cloud",
    title: "Yours, all the way down",
    body: "Open source, running entirely on the Megabyte Labs Cloudflare account. No SaaS middleman, no data leaving home.",
    accent: "from-sky-400/20",
    span: "",
    featured: false,
  },
];

// Each step carries a cyan line-icon echoing the per-step accent cap above it:
// shield+keyhole = sign-in/identity, chat bubble = ask/describe, check = approve,
// share arrow = ship/share. Decorative (aria-hidden) — the number + title carry meaning.
const STEPS = [
  {
    n: "01",
    title: "Sign in",
    body: "One login through Megabyte Labs' identity — a one-time email code, zero-touch on managed devices.",
    icon: (
      <>
        <path d="M12 3l7 2.6v5.1c0 4.3-2.9 7.4-7 8.6-4.1-1.2-7-4.3-7-8.6V5.6L12 3z" />
        <circle cx="12" cy="10.5" r="1.6" />
        <path d="M12 12.1v2.4" />
      </>
    ),
  },
  {
    n: "02",
    title: "Ask",
    body: "Describe the document, app, or task. Attach repos, docs, or data through Gatekeepers.",
    icon: (
      <>
        <path d="M4 5.5h16v10H8l-4 3.5z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
  {
    n: "03",
    title: "Approve",
    body: "Agents queue side-effects instead of stalling. Review the log, approve in one sweep.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.2l2.6 2.6L16 9.4" />
      </>
    ),
  },
  {
    n: "04",
    title: "Ship",
    body: "Share the Gadget with the team — each person gets their own safe, remixable copy.",
    icon: (
      <>
        <path d="M21 4L3 11l6.5 2.5L12 20l3-6.5L21 4z" />
        <path d="M9.5 13.5L21 4" />
      </>
    ),
  },
] as const;

// Trust pillars — each row carries a cyan line-icon + staggers in on reveal
// (.trust-row, mirrors the how-it-works step cascade) + glows on hover. Honest
// static properties, not a fabricated "audit ticker".
const TRUST = [
  {
    k: "access",
    v: "cloudflare zero-trust on every route",
    icon: <path d="M12 3l7 2.6v5.1c0 4.3-2.9 7.4-7 8.6-4.1-1.2-7-4.3-7-8.6V5.6L12 3z" />,
  },
  {
    k: "simulate",
    v: "side-effects queued, never auto-fired",
    icon: <path d="M8 5.5l9.5 6.5L8 18.5z" />,
  },
  {
    k: "audit",
    v: "every read + write logged per gadget",
    icon: (
      <>
        <path d="M2 12s3.6-6.3 10-6.3 10 6.3 10 6.3-3.6 6.3-10 6.3S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.6" />
      </>
    ),
  },
  {
    k: "sandbox",
    v: "each app isolated in its own runtime",
    icon: (
      <>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
      </>
    ),
  },
];

function useReveals() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function App() {
  // A return visitor (flag set) skips straight to the OS. Only fires on "/" so the
  // OS entry itself is never intercepted, and only when the build flag is on.
  const skip = FIRST_RUN_OVERLAY && typeof window !== "undefined" && window.location.pathname === "/" && hasEntered();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useReveals();

  useEffect(() => {
    if (skip) window.location.replace(OS_ENTRY);
  }, [skip]);

  // Lazy-load the WebGL field so the ~468 KB three.js chunk is OFF the LCP path —
  // the hero text paints first; the field fades in a beat later (progressive, and
  // a non-issue under prefers-reduced-motion). three.js becomes its own on-demand
  // chunk instead of a modulepreload in the HTML shell.
  useEffect(() => {
    if (skip || !canvasRef.current) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("./webgl").then(({ mountHeroField }) => {
      if (cancelled || !canvasRef.current) return;
      cleanup = mountHeroField(canvasRef.current);
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [skip]);

  if (skip) {
    return (
      <div
        data-testid="os-redirect"
        className="flex min-h-[100svh] items-center justify-center bg-[#060610] text-center text-white/80"
      >
        <p className="font-display animate-pulse text-lg">Entering Megabyte OS…</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* WebGL field — fixed behind the hero, fades as you scroll */}
      <div aria-hidden className="fixed inset-0 z-0">
        <canvas ref={canvasRef} data-webgl className="h-full w-full" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_20%,transparent_0%,#060610_78%)]" />
      </div>

      <header className="glass fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="/" className="font-display flex items-center gap-2.5 text-lg font-bold tracking-tight" aria-label="Megabyte OS home">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="shrink-0">
              <rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="#00E5FF" strokeWidth="2" />
              <path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#00E5FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="whitespace-nowrap">
              Megabyte <span className="text-[--color-cyan]">OS</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-white/70 sm:flex" aria-label="Primary">
            <a className="transition hover:text-[--color-cyan]" href="#features">Features</a>
            <a className="transition hover:text-[--color-cyan]" href="#how">How it works</a>
            <a className="transition hover:text-[--color-cyan]" href="#trust">Trust</a>
          </nav>
          <a
            href="/login"
            onClick={markEntered}
            className="cta-primary font-display rounded-full px-5 py-2 text-sm font-semibold text-[#03030a]"
          >
            Log in
          </a>
        </div>
      </header>

      <main id="main" className="relative z-10">
        {/* Hero */}
        <section className="flex min-h-[100svh] items-center px-5 pt-24">
          <div className="mx-auto w-full max-w-6xl">
            <p className="eyebrow reveal">Megabyte Labs · internal AI workspace</p>
            <h1 className="font-display mt-5 max-w-4xl text-[clamp(2.6rem,7vw,5.2rem)] leading-[1.02] font-extrabold tracking-tight">
              {["The", "operating", "system", "for"].map((w, i) => (
                <Fragment key={w}>
                  <span className="kinetic-word" style={{ "--w": i } as CSSProperties}>
                    {w}
                  </span>{" "}
                </Fragment>
              ))}
              <span className="text-gradient kinetic-fade">one human and a fleet of agents.</span>
            </h1>
            <p className="reveal mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Megabyte OS is where documents write themselves, apps grow their own features, and every agent action
              is guarded, logged, and yours to approve. Built on Cloudflare OS — running on our own edge.
            </p>
            <div className="reveal mt-10 flex flex-wrap items-center gap-4">
              <a
                href="/login"
                onClick={markEntered}
                className="cta-primary font-display rounded-full px-8 py-3.5 text-base font-bold text-[#03030a]"
                data-testid="hero-login"
              >
                Enter the OS →
              </a>
              <a
                href="https://github.com/cloudflare/cloudflare-os"
                rel="noreferrer"
                target="_blank"
                className="rounded-full border border-white/15 px-7 py-3.5 text-base text-white/80 transition hover:border-[--color-cyan] hover:text-white"
              >
                View source
              </a>
            </div>
            <dl className="reveal mt-16 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-6 text-sm">
              {[
                ["6", "Workers on the edge"],
                ["∞", "Private app instances"],
                ["1", "Human in the loop"],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-3xl font-bold text-[--color-cyan]">{n}</dd>
                  <dd className="mt-1 text-white/55">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative px-5 py-28">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow reveal">What lives inside</p>
            <h2 className="font-display reveal mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
              A workspace that <span className="text-gradient">does the work</span>
            </h2>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article
                  key={f.title}
                  className={`card reveal grain relative flex flex-col overflow-hidden p-7 ${f.span}`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${f.accent} to-transparent opacity-60`} />
                  <p className="eyebrow relative">{f.kicker}</p>
                  <h3 className={`font-display relative mt-3 font-semibold ${f.featured ? "text-2xl" : "text-xl"}`}>
                    {f.title}
                  </h3>
                  <p className="relative mt-3 max-w-prose leading-relaxed text-white/65">{f.body}</p>
                  {f.featured && (
                    <div className="relative mt-auto flex items-center gap-3 pt-7">
                      <span className="h-px flex-1 bg-gradient-to-r from-[--color-cyan]/50 to-transparent" aria-hidden />
                      <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[--color-cyan]/70">{f.kicker}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="px-5 py-28">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow reveal">How it works</p>
            <h2 className="font-display reveal mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Four moves, <span className="text-gradient">zero friction</span>
            </h2>
            <ol className="timeline reveal mt-14 grid gap-5 md:mt-24 md:grid-cols-4 md:pt-10">
              {STEPS.map(({ n, title, body, icon }, i) => (
                <li key={n} className="card step-card p-7" style={{ "--step-i": i } as CSSProperties}>
                  <span className="step-node" aria-hidden="true" />
                  <div className="flex items-center gap-3">
                    <span className="step-icon grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[--color-cyan]/25 bg-[--color-cyan]/10 text-[--color-cyan] transition duration-300">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {icon}
                      </svg>
                    </span>
                    <span className="step-num font-mono text-sm text-[--color-cyan]">{n}</span>
                  </div>
                  <h3 className="font-display mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/72">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="px-5 py-28">
          <div className="card reveal grain mx-auto max-w-6xl overflow-hidden p-10 sm:p-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_100%_0%,rgba(124,58,237,0.18),transparent_60%)]" />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="eyebrow">Gatekeeper security</p>
                <h2 className="font-display mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Agents move fast. <span className="text-gradient">Nothing bad happens.</span>
                </h2>
                <p className="mt-5 leading-relaxed text-white/70">
                  Gatekeepers wrap every external service in a capability-scoped API. Side-effects are simulated so
                  agents never stall waiting for you — then you approve the queue in one pass, with a full audit log.
                  Identity sits behind Cloudflare Access: a one-time email code, with WARP zero-touch on managed devices.
                </p>
              </div>
              <ul className="space-y-3.5 font-mono text-sm">
                {TRUST.map(({ k, v, icon }, i) => (
                  <li
                    key={k}
                    className="trust-row group flex items-center gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 transition duration-300 hover:border-[--color-cyan]/40 hover:bg-black/50"
                    style={{ "--row-i": i } as CSSProperties}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[--color-cyan]/25 bg-[--color-cyan]/10 text-[--color-cyan] transition duration-300 group-hover:border-[--color-cyan]/50 group-hover:bg-[--color-cyan]/20 motion-safe:group-hover:scale-110">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {icon}
                      </svg>
                    </span>
                    <span className="text-[--color-cyan]">{k}</span>
                    <span className="text-white/60">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-32 pt-8 text-center">
          <div className="reveal mx-auto max-w-3xl">
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Ready when <span className="text-gradient">you are.</span>
            </h2>
            <p className="mt-5 text-white/60">One login. Every agent, gadget, and blueprint on the other side.</p>
            <a
              href="/login"
              onClick={markEntered}
              className="cta-primary font-display mt-9 inline-block rounded-full px-10 py-4 text-lg font-bold text-[#03030a]"
              data-testid="footer-login"
            >
              Enter Megabyte OS →
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-white/60">
          <p className="flex flex-wrap items-center gap-x-1.5">
            © {new Date().getFullYear()} Megabyte Labs · <a className="transition hover:text-[--color-cyan]" href="mailto:hey@megabyte.space">hey@megabyte.space</a> ·{" "}
            <a className="inline-flex items-center gap-1.5 transition hover:text-[--color-cyan]" href="/status" data-testid="footer-status">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[--color-cyan] motion-reduce:animate-none" aria-hidden />
              System status
            </a>
          </p>
          <p className="font-mono">
            built on{" "}
            <a className="text-white/60 transition hover:text-[--color-cyan]" href="https://github.com/cloudflare/cloudflare-os" rel="noreferrer" target="_blank">
              cloudflare-os
            </a>{" "}
            · deployed from{" "}
            <a className="text-white/60 transition hover:text-[--color-cyan]" href="https://github.com/heymegabyte/megabyte.space" rel="noreferrer" target="_blank">
              heymegabyte/megabyte.space
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

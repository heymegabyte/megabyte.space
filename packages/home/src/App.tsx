import { useEffect, useRef, type CSSProperties } from "react";
import { mountHeroField } from "./webgl";

const FEATURES = [
  {
    kicker: "Agent chat",
    title: "Agents that know the company",
    body: "Ask for work, not files. Every agent is preloaded with how Megabyte Labs operates — context, tools, and rules included.",
    accent: "from-cyan-400/20",
  },
  {
    kicker: "Gadgets",
    title: "Apps that build themselves",
    body: "Every slide deck, dashboard, and tool is your private instance. Missing a feature? Ask the agent to add it — safely.",
    accent: "from-violet-500/20",
  },
  {
    kicker: "Gatekeepers",
    title: "Security that says yes",
    body: "Capability-scoped access to GitHub, Google, email, and more. Every action logged, simulated ahead, approved in bulk.",
    accent: "from-sky-400/20",
  },
  {
    kicker: "Blueprints",
    title: "From prompt to product",
    body: "Slides for tomorrow's meeting, an issue dashboard for a repo, a collaborative whiteboard — one sentence each.",
    accent: "from-cyan-400/20",
  },
  {
    kicker: "Scheduler",
    title: "Work while you sleep",
    body: "Agents run on timers and recurrences. Schedule research, reports, and follow-ups — they arrive finished.",
    accent: "from-violet-500/20",
  },
  {
    kicker: "Your cloud",
    title: "Yours, all the way down",
    body: "Open source, running entirely on the Megabyte Labs Cloudflare account. No SaaS middleman, no data leaving home.",
    accent: "from-sky-400/20",
  },
];

const STEPS = [
  ["01", "Sign in", "One login through Megabyte Labs' identity — a one-time email code, zero-touch on managed devices."],
  ["02", "Ask", "Describe the document, app, or task. Attach repos, docs, or data through Gatekeepers."],
  ["03", "Approve", "Agents queue side-effects instead of stalling. Review the log, approve in one sweep."],
  ["04", "Ship", "Share the Gadget with the team — each person gets their own safe, remixable copy."],
] as const;

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useReveals();

  useEffect(() => {
    if (!canvasRef.current) return;
    return mountHeroField(canvasRef.current);
  }, []);

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
            <h1 className="font-display reveal mt-5 max-w-4xl text-[clamp(2.6rem,7vw,5.2rem)] leading-[1.02] font-extrabold tracking-tight">
              The operating system for <span className="text-gradient">one human and a fleet of agents.</span>
            </h1>
            <p className="reveal mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Megabyte OS is where documents write themselves, apps grow their own features, and every agent action
              is guarded, logged, and yours to approve. Built on Cloudflare OS — running on our own edge.
            </p>
            <div className="reveal mt-10 flex flex-wrap items-center gap-4">
              <a
                href="/login"
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
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article key={f.title} className={`card reveal grain overflow-hidden p-7`}>
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${f.accent} to-transparent opacity-60`} />
                  <p className="eyebrow relative">{f.kicker}</p>
                  <h3 className="font-display relative mt-3 text-xl font-semibold">{f.title}</h3>
                  <p className="relative mt-3 leading-relaxed text-white/65">{f.body}</p>
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
              {STEPS.map(([n, title, body], i) => (
                <li key={n} className="card step-card p-7" style={{ "--step-i": i } as CSSProperties}>
                  <span className="step-node" aria-hidden="true" />
                  <span className="step-num font-mono text-sm text-[--color-cyan]">{n}</span>
                  <h3 className="font-display mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
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
              <ul className="space-y-4 font-mono text-sm">
                {[
                  ["access", "cloudflare zero-trust on every route"],
                  ["simulate", "side-effects queued, never auto-fired"],
                  ["audit", "every read + write logged per gadget"],
                  ["sandbox", "each app isolated in its own runtime"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/30 px-5 py-4">
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
              className="cta-primary font-display mt-9 inline-block rounded-full px-10 py-4 text-lg font-bold text-[#03030a]"
              data-testid="footer-login"
            >
              Enter Megabyte OS →
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-white/45">
          <p>
            © {new Date().getFullYear()} Megabyte Labs · <a className="transition hover:text-[--color-cyan]" href="mailto:hey@megabyte.space">hey@megabyte.space</a>
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

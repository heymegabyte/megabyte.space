import { useEffect, useState } from "react";

// Build-in-public estate pulse (Loop Observatory seed — idea #3/#10). Reads the
// live AnalyticsCounter DO via /api/analytics/live and shows honest edge telemetry:
// Megabyte OS runs in the open on Megabyte Labs' own Cloudflare account. Fail-soft —
// if the endpoint is unreachable, the static context still renders ("telemetry offline").

interface Pulse {
  total: number;
  today: number;
}

type State = { status: "loading" } | { status: "ok"; data: Pulse } | { status: "offline" };

function Stat({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="card grain relative overflow-hidden p-7">
      <p className="eyebrow relative">{label}</p>
      <p className="font-display relative mt-3 text-5xl font-extrabold tracking-tight text-[--color-cyan] tabular-nums">
        {value}
      </p>
      {live && (
        <span className="absolute right-6 top-6 flex items-center gap-2 font-mono text-xs text-white/50">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[--color-cyan] motion-reduce:animate-none" aria-hidden />
          live
        </span>
      )}
    </div>
  );
}

export default function StatusView() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/analytics/live", { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { ok?: boolean; total?: number; today?: number };
        if (cancelled) return;
        if (body.ok && Number.isFinite(body.total) && Number.isFinite(body.today)) {
          setState({ status: "ok", data: { total: body.total!, today: body.today! } });
        } else {
          setState({ status: "offline" });
        }
      } catch {
        if (!cancelled) setState({ status: "offline" });
      }
    };
    void load();
    const id = window.setInterval(load, 30000); // visibility-agnostic 30s refresh — no manual button
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-US");
  const total = state.status === "ok" ? fmt(state.data.total) : state.status === "loading" ? "…" : "—";
  const today = state.status === "ok" ? fmt(state.data.today) : state.status === "loading" ? "…" : "—";

  return (
    <main className="min-h-[100svh] bg-[#060610] px-5 py-20 text-white">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="font-mono text-sm text-white/50 transition hover:text-[--color-cyan]">
          ← Megabyte OS
        </a>
        <p className="eyebrow mt-10">Megabyte OS · live edge telemetry</p>
        <h1 className="font-display mt-4 text-[clamp(2.2rem,6vw,3.8rem)] font-extrabold leading-[1.05] tracking-tight">
          Running <span className="text-gradient">in the open.</span>
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-white/65">
          Megabyte OS is built in public on Megabyte Labs' own Cloudflare edge — no SaaS middleman, no
          data leaving home. These numbers are live, straight from a zero-PII Durable Object counter.
          {state.status === "offline" && <span className="text-white/40"> (telemetry offline — showing static context)</span>}
        </p>

        <section className="mt-12 grid gap-5 sm:grid-cols-2">
          <Stat label="Pageviews served" value={total} live={state.status === "ok"} />
          <Stat label="Today" value={today} live={state.status === "ok"} />
          <Stat label="Workers on the edge" value="6" />
          <Stat label="Human in the loop" value="1" />
        </section>

        <p className="mt-10 font-mono text-xs leading-relaxed text-white/40">
          counts only · no IP, no cookies, no fingerprint · refreshes every 30s · served from Cloudflare's
          global network. source:{" "}
          <a className="text-white/60 transition hover:text-[--color-cyan]" href="https://github.com/heymegabyte/megabyte.space" rel="noreferrer" target="_blank">
            heymegabyte/megabyte.space
          </a>
        </p>
      </div>
    </main>
  );
}

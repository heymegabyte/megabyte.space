import { useEffect, useState } from "react";

// Build-in-public estate pulse (Loop Observatory seed — idea #3/#10). Reads the
// live AnalyticsCounter DO via /api/analytics/live and shows honest edge telemetry:
// Megabyte OS runs in the open on Megabyte Labs' own Cloudflare account. Fail-soft —
// if the endpoint is unreachable, the static context still renders ("telemetry offline").

interface Pulse {
  total: number;
  today: number;
  daily: { day: string; count: number }[];
  topPaths: { path: string; count: number }[];
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

/** Cyan area sparkline of daily pageviews (last N days). SVG, zero deps. */
function Sparkline({ data }: { data: { day: string; count: number }[] }) {
  if (data.length < 2) return null;
  const w = 600;
  const h = 120;
  const pad = 8;
  const max = Math.max(1, ...data.map((d) => d.count));
  const n = data.length;
  const px = (i: number) => pad + (i / (n - 1)) * (w - pad * 2);
  const py = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const line = data.map((d, i) => `${px(i).toFixed(1)},${py(d.count).toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const last = data[n - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-28 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Daily pageviews over the last ${n} days, peak ${max}`}
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark)" />
      <polyline
        points={line}
        fill="none"
        stroke="#00E5FF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={px(n - 1)} cy={py(last.count)} r="4" fill="#00E5FF" />
    </svg>
  );
}

/** Top paths as cyan mini-bars (share of the busiest path). */
function TopPaths({ paths }: { paths: { path: string; count: number }[] }) {
  if (!paths.length) return null;
  const max = Math.max(1, ...paths.map((p) => p.count));
  return (
    <ul className="space-y-2 font-mono text-sm">
      {paths.map((p) => (
        <li key={p.path} className="relative overflow-hidden rounded-lg border border-white/10 bg-black/30 px-4 py-2.5">
          <span
            className="absolute inset-y-0 left-0 bg-[--color-cyan]/10"
            style={{ width: `${(p.count / max) * 100}%` }}
            aria-hidden
          />
          <span className="relative flex items-center justify-between gap-4">
            <span className="truncate text-white/80">{p.path}</span>
            <span className="shrink-0 tabular-nums text-[--color-cyan]">{p.count.toLocaleString("en-US")}</span>
          </span>
        </li>
      ))}
    </ul>
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
        const body = (await res.json()) as {
          ok?: boolean;
          total?: number;
          today?: number;
          daily?: { day: string; count: number }[];
          topPaths?: { path: string; count: number }[];
        };
        if (cancelled) return;
        if (body.ok && Number.isFinite(body.total) && Number.isFinite(body.today)) {
          setState({
            status: "ok",
            data: { total: body.total!, today: body.today!, daily: body.daily ?? [], topPaths: body.topPaths ?? [] },
          });
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
          {state.status === "offline" && <span className="text-white/60"> (telemetry offline — showing static context)</span>}
        </p>

        <section className="mt-12 grid gap-5 sm:grid-cols-2">
          <Stat label="Pageviews served" value={total} live={state.status === "ok"} />
          <Stat label="Today" value={today} live={state.status === "ok"} />
          <Stat label="Workers on the edge" value="6" />
          <Stat label="Human in the loop" value="1" />
        </section>

        {state.status === "ok" && state.data.daily.length >= 2 && (
          <section className="mt-12" data-testid="status-sparkline">
            <p className="eyebrow">Pageviews · last 14 days</p>
            <div className="card grain mt-4 overflow-hidden p-7">
              <Sparkline data={state.data.daily} />
            </div>
          </section>
        )}

        {state.status === "ok" && state.data.topPaths.length > 0 && (
          <section className="mt-10" data-testid="status-top-paths">
            <p className="eyebrow">Top paths</p>
            <div className="mt-4">
              <TopPaths paths={state.data.topPaths} />
            </div>
          </section>
        )}

        <p className="mt-10 font-mono text-xs leading-relaxed text-white/60">
          counts only · no IP, no cookies, no fingerprint · refreshes every 30s · served from Cloudflare's
          global network. source:{" "}
          <a className="text-[--color-cyan] underline transition hover:text-white" href="https://github.com/heymegabyte/megabyte.space" rel="noreferrer" target="_blank">
            heymegabyte/megabyte.space
          </a>
        </p>
      </div>
    </main>
  );
}

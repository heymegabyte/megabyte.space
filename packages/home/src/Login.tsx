import { useEffect, useState, type FormEvent } from "react";

type Provider = "google" | "github";
type LoginState = "idle" | "loading" | "error" | "sent";

async function postAuth(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Canonical public login: social OAuth and passwordless email only. */
export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/get-session", { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((session: { user?: unknown } | null) => {
        if (session?.user) window.location.replace("/");
      })
      .catch(() => {});
  }, []);

  async function startSocial(nextProvider: Provider) {
    setProvider(nextProvider);
    setState("loading");
    setError("");
    try {
      const response = await postAuth("/api/auth/sign-in/social", {
        provider: nextProvider,
        callbackURL: `${window.location.origin}/`,
      });
      const body = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
      if (!response.ok || !body.url) throw new Error(body.message || "Unable to start sign-in.");
      window.location.assign(body.url);
    } catch (cause) {
      setProvider(null);
      setState("error");
      setError(cause instanceof Error ? cause.message : "Unable to start sign-in.");
    }
  }

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setError("");
    try {
      const response = await postAuth("/api/auth/sign-in/magic-link", {
        email: email.trim(),
        callbackURL: `${window.location.origin}/`,
      });
      if (!response.ok) throw new Error("Couldn't send the link just now. Please try again.");
      setState("sent");
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Unable to send the sign-in link.");
    }
  }

  const busy = state === "loading";
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#060610] px-5 py-16 text-white" data-testid="login-page">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_-5%,rgba(0,229,255,0.13),transparent_60%),radial-gradient(55%_55%_at_85%_105%,rgba(124,58,237,0.16),transparent_60%)]" />
      <section className="card grain relative w-full max-w-md overflow-hidden p-8 sm:p-10">
        <a href="/" className="font-display flex items-center gap-2.5 text-lg font-bold tracking-tight" aria-label="Megabyte OS home">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="#00E5FF" strokeWidth="2" /><path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#00E5FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Megabyte <span className="text-[--color-cyan]">OS</span>
        </a>
        <h1 className="font-display mt-8 text-3xl font-bold tracking-tight">Sign in to your <span className="text-gradient">workspace.</span></h1>
        <p className="mt-3 text-sm text-white/60">Continue with Google, GitHub, or a secure email link.</p>

        <div className="mt-8 space-y-3">
          {(["google", "github"] as const).map((item) => (
            <button key={item} type="button" onClick={() => startSocial(item)} disabled={busy} data-testid={`auth-${item}`} className="w-full rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold transition hover:border-[--color-cyan]/60 hover:bg-[--color-cyan]/5 disabled:opacity-60">
              {provider === item ? "Connecting…" : `Continue with ${item === "google" ? "Google" : "GitHub"}`}
            </button>
          ))}
        </div>

        <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-white/10" /><span className="font-mono text-xs uppercase tracking-wider text-white/35">or</span><span className="h-px flex-1 bg-white/10" /></div>
        {state === "sent" ? (
          <div data-testid="auth-sent" className="rounded-xl border border-[--color-cyan]/30 bg-[--color-cyan]/5 p-4 text-sm text-white/75">Check your inbox. The link will sign you in and open the app directly.</div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <label className="block"><span className="sr-only">Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@company.com" className="w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 text-white outline-none focus:border-[--color-cyan]/60" /></label>
            <button type="submit" disabled={busy || !email.trim()} data-testid="auth-magiclink" className="cta-primary font-display w-full rounded-full px-8 py-3.5 text-base font-bold text-[#03030a] disabled:opacity-60">{busy && !provider ? "Sending…" : "Email me a sign-in link"}</button>
          </form>
        )}
        {state === "error" && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      </section>
    </main>
  );
}

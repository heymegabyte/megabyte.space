import { useEffect, useState, type FormEvent } from "react";

// BA-2: the black/cyan Better Auth login surface on megabyte.space. Same-origin
// with the auth rail (/api/auth/*, forwarded to megabyte-auth), so no CORS. Dark:
// a new /signin route — the live /login 302 is untouched. Email+password now;
// Google/GitHub SSO + magic-link buttons land once their providers are wired.

type Mode = "signin" | "signup";

function Field(props: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{props.label}</span>
      <input
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
        minLength={props.minLength}
        className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[--color-cyan]/60 focus:ring-2 focus:ring-[--color-cyan]/30"
      />
    </label>
  );
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error" | "done" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  // null = checking, false = anonymous, { email } = already signed in → don't show a form.
  const [session, setSession] = useState<{ email: string } | null | false>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/get-session", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: { email?: string } } | null) => {
        if (!cancelled) setSession(d?.user?.email ? { email: d.user.email } : false);
      })
      .catch(() => {
        if (!cancelled) setSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" } }).catch(() => {});
    setSession(false);
    setState("idle");
  }

  async function sendLink() {
    if (!email) {
      setState("error");
      setError("Enter your email first, then I'll send a link.");
      return;
    }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackURL: "/status" }),
      });
      if (!res.ok) {
        setState("error");
        setError("Couldn't send the link just now — please try again.");
        return;
      }
      setState("sent");
    } catch {
      setState("error");
      setError("Network hiccup — please try again.");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    const path = mode === "signin" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
    const payload = mode === "signin" ? { email, password } : { name, email, password };
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; message?: string; error?: { message?: string } };
      if (!res.ok || !data.token) {
        setState("error");
        setError(data.message || data.error?.message || (mode === "signin" ? "That email or password didn't match." : "We couldn't create that account."));
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setError("Network hiccup — please try again.");
    }
  }

  const swap = (m: Mode) => {
    setMode(m);
    setState("idle");
    setError("");
  };

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#060610] px-5 py-16 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_-5%,rgba(0,229,255,0.13),transparent_60%),radial-gradient(55%_55%_at_85%_105%,rgba(124,58,237,0.16),transparent_60%)]"
      />
      <div className="card grain relative w-full max-w-md overflow-hidden p-8 sm:p-10">
        <a href="/" className="font-display flex items-center gap-2.5 text-lg font-bold tracking-tight" aria-label="Megabyte OS home">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="shrink-0">
            <rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="#00E5FF" strokeWidth="2" />
            <path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#00E5FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="whitespace-nowrap">
            Megabyte <span className="text-[--color-cyan]">OS</span>
          </span>
        </a>

        {session ? (
          <div className="mt-10 text-center" data-testid="auth-already">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[--color-cyan]/40 bg-[--color-cyan]/10 text-[--color-cyan]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12l5 5L20 6" />
              </svg>
            </div>
            <h1 className="font-display mt-6 text-2xl font-bold tracking-tight">
              Already <span className="text-gradient">signed in.</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">You're signed in as {session.email}.</p>
            <a href="/status" className="cta-primary font-display mt-8 inline-block rounded-full px-8 py-3 text-sm font-bold text-[#03030a]">
              Continue →
            </a>
            <p className="mt-5 text-sm text-white/55">
              Not you?{" "}
              <button type="button" className="text-[--color-cyan] transition hover:text-white" onClick={signOut}>
                Sign out
              </button>
            </p>
          </div>
        ) : state === "done" || state === "sent" ? (
          <div className="mt-10 text-center" data-testid={state === "done" ? "auth-success" : "auth-sent"}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[--color-cyan]/40 bg-[--color-cyan]/10 text-[--color-cyan]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {state === "done" ? (
                  <path d="M4 12l5 5L20 6" />
                ) : (
                  <>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M4 7l8 5 8-5" />
                  </>
                )}
              </svg>
            </div>
            <h1 className="font-display mt-6 text-2xl font-bold tracking-tight">
              {state === "done" ? (
                <>
                  You're <span className="text-gradient">in.</span>
                </>
              ) : (
                <>
                  Check your <span className="text-gradient">inbox.</span>
                </>
              )}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {state === "done"
                ? `Signed in as ${email}. Your Megabyte OS workspace opens here once the OS moves to this door.`
                : `We sent a one-time sign-in link to ${email}. Open it on this device to continue.`}
            </p>
            {state === "done" && (
              <a href="/status" className="cta-primary font-display mt-8 inline-block rounded-full px-8 py-3 text-sm font-bold text-[#03030a]">
                See live status →
              </a>
            )}
          </div>
        ) : (
          <>
            <h1 className="font-display mt-8 text-3xl font-bold tracking-tight">
              {mode === "signin" ? (
                <>
                  Welcome <span className="text-gradient">back.</span>
                </>
              ) : (
                <>
                  Create your <span className="text-gradient">account.</span>
                </>
              )}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {mode === "signin" ? "Sign in to your Megabyte OS workspace." : "One account for every agent, gadget, and blueprint."}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              {mode === "signup" && <Field label="Name" type="text" value={name} onChange={setName} autoComplete="name" required />}
              <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={8}
              />

              {state === "error" && (
                <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                data-testid="auth-submit"
                className="cta-primary font-display w-full rounded-full px-8 py-3.5 text-center text-base font-bold text-[#03030a] disabled:opacity-60"
              >
                {state === "loading" ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            {mode === "signin" && (
              <>
                <div className="my-5 flex items-center gap-3">
                  <span aria-hidden className="h-px flex-1 bg-white/10" />
                  <span className="font-mono text-xs uppercase tracking-wider text-white/35">or</span>
                  <span aria-hidden className="h-px flex-1 bg-white/10" />
                </div>
                <button
                  type="button"
                  onClick={sendLink}
                  disabled={state === "sending"}
                  data-testid="auth-magiclink"
                  className="w-full rounded-full border border-[--color-cyan]/30 px-8 py-3 text-sm font-semibold text-[--color-cyan] transition hover:border-[--color-cyan]/60 hover:bg-[--color-cyan]/5 disabled:opacity-60"
                >
                  {state === "sending" ? "Sending…" : "Email me a sign-in link"}
                </button>
              </>
            )}

            <p className="mt-6 text-center text-sm text-white/55">
              {mode === "signin" ? (
                <>
                  New to Megabyte OS?{" "}
                  <button type="button" className="text-[--color-cyan] transition hover:text-white" onClick={() => swap("signup")}>
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have one?{" "}
                  <button type="button" className="text-[--color-cyan] transition hover:text-white" onClick={() => swap("signin")}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

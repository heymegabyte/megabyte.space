import { useEffect, type ReactNode } from "react";
import blogPosts from "./blog-posts.json";
import {
  SITE_URL,
  articleStructuredData,
  getBlogPageMetadata,
  type PageMetadata,
} from "./page-metadata";

type BlogPost = (typeof blogPosts)[number];

const STARTUP_PROGRAMS_ARTICLE = blogPosts.find((post) => post.slug === "daytona-e2b-sentry-startup-programs")!;
const LIVEKIT_ARTICLE = blogPosts.find((post) => post.slug === "livekit-startup-sponsorship-telephony")!;

function usePageMetadata(metadata: PageMetadata) {
  useEffect(() => {
    document.title = metadata.title;

    const upsertMeta = (selector: string, attributes: Record<string, string>) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement("meta");
        document.head.appendChild(element);
      }
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    };

    upsertMeta('meta[name="description"]', { name: "description", content: metadata.description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: metadata.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: metadata.description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: metadata.type });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: `${SITE_URL}${metadata.path}` });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: metadata.image });
    upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: metadata.imageAlt });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Megabyte Labs" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: metadata.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: metadata.description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: metadata.image });
    upsertMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: metadata.imageAlt });

    if (metadata.published) {
      upsertMeta('meta[property="article:published_time"]', { property: "article:published_time", content: metadata.published });
      upsertMeta('meta[property="article:modified_time"]', { property: "article:modified_time", content: metadata.modified ?? metadata.published });
      if (metadata.section) upsertMeta('meta[property="article:section"]', { property: "article:section", content: metadata.section });
      if (metadata.author) upsertMeta('meta[property="article:author"]', { property: "article:author", content: metadata.author });
    }

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    canonical?.setAttribute("href", `${SITE_URL}${metadata.path}`);

    const structuredData = articleStructuredData(metadata);
    if (structuredData) {
      let script = document.head.querySelector<HTMLScriptElement>("#blog-posting-structured-data");
      if (!script) {
        script = document.createElement("script");
        script.id = "blog-posting-structured-data";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }
  }, [metadata]);
}

function BlogShell({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#060610] text-white">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(65% 48% at 48% 0%, rgba(0,229,255,0.11), transparent 68%), radial-gradient(42% 40% at 96% 38%, rgba(124,58,237,0.12), transparent 70%)",
        }}
      />
      <header className="glass relative z-10 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="/" className="font-display flex items-center gap-2.5 text-lg font-bold tracking-tight" aria-label="Megabyte OS home">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="shrink-0">
              <rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="#00E5FF" strokeWidth="2" />
              <path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#00E5FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Megabyte <span className="text-[--color-cyan]">OS</span></span>
          </a>
          <nav className="flex items-center gap-5 text-sm" aria-label="Primary">
            <a className="text-[--color-cyan]" href="/blog" aria-current={currentPath === "/blog" ? "page" : undefined}>Blog</a>
            <a className="hidden text-white/65 transition hover:text-white sm:inline" href="/status">Status</a>
            <a className="rounded-full border border-white/15 px-4 py-2 text-white/80 transition hover:border-[--color-cyan] hover:text-white" href="/login">Log in</a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="relative z-10 mt-24 border-t border-white/10 px-5 py-10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 text-sm text-white/55">
          <p>© {new Date().getFullYear()} Megabyte Labs</p>
          <a className="transition hover:text-[--color-cyan]" href="mailto:hey@megabyte.space">hey@megabyte.space</a>
        </div>
      </footer>
    </div>
  );
}

export function BlogIndex() {
  const metadata = getBlogPageMetadata("/blog");
  if (!metadata) throw new Error("Missing blog metadata");
  usePageMetadata(metadata);

  return (
    <BlogShell currentPath="/blog">
      <main id="main-content" tabIndex={-1} className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-20 sm:pt-28">
        <p className="eyebrow">Megabyte Labs · Blog</p>
        <h1 className="font-display mt-5 text-5xl font-extrabold tracking-tight sm:text-6xl">
          Building in <span className="text-gradient">public.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
          Product milestones, engineering notes, and lessons from building an operating system for one human and a fleet of agents.
        </p>

        <section className="mt-16" aria-labelledby="latest-posts">
          <h2 id="latest-posts" className="sr-only">Latest posts</h2>
          <div className="space-y-6">
            {blogPosts.map((post) => (
              <article key={post.slug} className="card grain overflow-hidden p-7 sm:p-10">
                <p className="eyebrow">{post.category} · <time dateTime={post.published}>{post.displayDate}</time></p>
                <h2 className="font-display mt-4 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
                  <a className="transition hover:text-[--color-cyan]" href={post.path}>{post.title}</a>
                </h2>
                <p className="mt-4 max-w-2xl leading-relaxed text-white/65">{post.description}</p>
                <a className="font-display mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-[--color-cyan] transition hover:text-white" href={post.path}>
                  Read the announcement <span aria-hidden>→</span>
                </a>
              </article>
            ))}
          </div>
        </section>
        <a className="font-mono mt-8 inline-flex min-h-11 items-center text-sm text-white/55 transition hover:text-[--color-cyan]" href="/feed.xml">
          Subscribe via RSS
        </a>
      </main>
    </BlogShell>
  );
}

function BlogArticle({ post, title, children }: { post: BlogPost; title: ReactNode; children: ReactNode }) {
  const metadata = getBlogPageMetadata(post.path);
  if (!metadata) throw new Error("Missing article metadata");
  usePageMetadata(metadata);

  return (
    <BlogShell currentPath={post.path}>
      <main id="main-content" tabIndex={-1} className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-16 sm:pt-24">
        <article>
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-sm text-white/55">
              <li><a className="transition hover:text-[--color-cyan]" href="/">Home</a></li>
              <li aria-hidden>/</li>
              <li><a className="transition hover:text-[--color-cyan]" href="/blog">Blog</a></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-white/75">{post.category}</li>
            </ol>
          </nav>
          <header className="mt-10 border-b border-white/10 pb-12">
            <p className="eyebrow">{post.category} · <time dateTime={post.published}>{post.displayDate}</time></p>
            <h1 className="font-display mt-5 text-[clamp(2.5rem,7vw,4.75rem)] font-extrabold leading-[1.05] tracking-tight">
              {title}
            </h1>
            <p className="mt-7 max-w-3xl text-xl leading-relaxed text-white/70">{post.description}</p>
            <p className="font-mono mt-6 text-sm text-white/50">By {post.author} · {post.readingMinutes} min read</p>
          </header>

          <div className="blog-prose mt-12">{children}</div>
        </article>
      </main>
    </BlogShell>
  );
}

export function StartupProgramsArticle() {
  return (
    <BlogArticle
      post={STARTUP_PROGRAMS_ARTICLE}
      title={<>We’ve joined the <span className="text-gradient">Daytona, E2B, and Sentry</span> startup programs.</>}
    >
            <p>
              We’re excited to share that Megabyte Labs has recently been accepted into the startup programs for Daytona, E2B, and Sentry. Each company is working on a different part of the infrastructure modern software teams—and increasingly, software agents—depend on.
            </p>

            <h2>Why these three programs matter to us</h2>
            <p>
              Megabyte OS is built around a simple idea: agents should be able to do meaningful work while people retain control. Delivering that experience requires isolated environments for work, secure sandboxes for running generated code, and clear visibility when something goes wrong.
            </p>

            <div className="grid gap-4 py-3 sm:grid-cols-3">
              <a className="card block p-5" href="https://www.daytona.io/startups" rel="noreferrer" target="_blank">
                <h3 className="font-display text-lg font-semibold text-[--color-cyan]">Daytona</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">Infrastructure for creating and managing development environments.</p>
                <span className="mt-3 inline-block text-xs text-white/45">Startup program ↗ <span className="sr-only">(opens in a new tab)</span></span>
              </a>
              <a className="card block p-5" href="https://e2b.dev/startups" rel="noreferrer" target="_blank">
                <h3 className="font-display text-lg font-semibold text-[--color-cyan]">E2B</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">Secure cloud sandboxes designed for AI agents and code execution.</p>
                <span className="mt-3 inline-block text-xs text-white/45">Startup program ↗ <span className="sr-only">(opens in a new tab)</span></span>
              </a>
              <a className="card block p-5" href="https://sentry.io/for/startups/apply/" rel="noreferrer" target="_blank">
                <h3 className="font-display text-lg font-semibold text-[--color-cyan]">Sentry</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">Error monitoring and performance insights for production software.</p>
                <span className="mt-3 inline-block text-xs text-white/45">Startup program ↗ <span className="sr-only">(opens in a new tab)</span></span>
              </a>
            </div>

            <p>
              Those capabilities line up closely with the problems we solve every day. Joining these programs gives us a chance to learn from the teams building this infrastructure and to keep improving the reliability and safety of the systems behind Megabyte OS.
            </p>

            <h2>What comes next</h2>
            <p>
              Acceptance is a milestone, not a finish line. We’ll keep evaluating each platform against real product needs, integrating deliberately, and sharing what we learn. Our priorities remain the same: useful agents, strong isolation, observable systems, and a human firmly in the loop.
            </p>
            <p>
              Thank you to the Daytona, E2B, and Sentry teams for welcoming us. We’re glad to be building alongside you.
            </p>

            <aside className="card mt-12 p-7">
              <p className="eyebrow">Follow along</p>
              <p className="mt-3 leading-relaxed text-white/70">
                We’ll share more product and engineering updates here as Megabyte OS grows. Questions? Email <a href="mailto:hey@megabyte.space">hey@megabyte.space</a>.
              </p>
            </aside>
    </BlogArticle>
  );
}

export function LiveKitStartupSponsorshipArticle() {
  return (
    <BlogArticle
      post={LIVEKIT_ARTICLE}
      title={<>LiveKit is sponsoring Megabyte Labs as we push into <span className="text-gradient">telephony.</span></>}
    >
      <p>
        We’re excited to share that Megabyte Labs has just received startup sponsorship from LiveKit. The support arrives at the right moment: one of our pushes going forward is bringing useful, carefully governed agent experiences to the telephone.
      </p>

      <h2>Why the telephone matters</h2>
      <p>
        The web is not the only place work happens. Customers call, teams coordinate in real time, and many important workflows still begin with a phone number. A telephone interface can make an agent available without asking someone to install an app, learn a new tool, or sit in front of a screen.
      </p>
      <p>
        That convenience raises the bar for the infrastructure behind it. Voice interaction must feel immediate, survive the realities of the public phone network, and preserve the controls we care about: clear identity, explicit permissions, useful audit trails, safe handoffs, and a human in the loop.
      </p>

      <h2>LiveKit behind the Twilio edge</h2>
      <p>
        Our direction is to explore Twilio for the telephone-network edge—the phone numbers and connection to the public switched telephone network—while evaluating LiveKit as the low-latency realtime backend for the media and agent side of the call.
      </p>
      <p>
        LiveKit supports more than one path between the two systems. Twilio Elastic SIP Trunking can route inbound and outbound calls into LiveKit, while LiveKit’s Twilio Connector can bridge Twilio Media Streams to LiveKit rooms over WebSockets. Once a call enters a room, it can connect to realtime application logic or a LiveKit Agent.
      </p>

      <div className="grid gap-4 py-3 sm:grid-cols-3">
        <a className="card block p-5" href="https://livekit.io/startups" rel="noreferrer" target="_blank">
          <h3 className="font-display text-lg font-semibold text-[--color-cyan]">LiveKit for Startups</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">The program supporting our next stage of realtime product development.</p>
          <span className="mt-3 inline-block text-xs text-white/45">Program details ↗ <span className="sr-only">(opens in a new tab)</span></span>
        </a>
        <a className="card block p-5" href="https://docs.livekit.io/telephony/start/providers/twilio/" rel="noreferrer" target="_blank">
          <h3 className="font-display text-lg font-semibold text-[--color-cyan]">Twilio SIP</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">A documented route for connecting Twilio trunks to LiveKit telephony.</p>
          <span className="mt-3 inline-block text-xs text-white/45">Read the guide ↗ <span className="sr-only">(opens in a new tab)</span></span>
        </a>
        <a className="card block p-5" href="https://docs.livekit.io/telephony/connectors/twilio/" rel="noreferrer" target="_blank">
          <h3 className="font-display text-lg font-semibold text-[--color-cyan]">Twilio Connector</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">A WebSocket bridge from Twilio Media Streams into LiveKit rooms.</p>
          <span className="mt-3 inline-block text-xs text-white/45">Read the guide ↗ <span className="sr-only">(opens in a new tab)</span></span>
        </a>
      </div>

      <h2>What comes next</h2>
      <p>
        This sponsorship gives us room to prototype, measure latency and reliability, and learn which integration path best fits the experiences we want to build. It does not mean we are shipping autonomous phone calls tomorrow. We’ll move deliberately, validate the complete call path, and design approval and escalation into the product from the start.
      </p>
      <p>
        Thank you to the LiveKit team for backing Megabyte Labs. We’re looking forward to seeing what becomes possible when the reach of Twilio meets LiveKit’s realtime infrastructure and the governed agent model behind Megabyte OS.
      </p>

      <aside className="card mt-12 p-7">
        <p className="eyebrow">Follow along</p>
        <p className="mt-3 leading-relaxed text-white/70">
          We’ll share what we learn as the telephony work develops. Questions or a use case we should hear about? Email <a href="mailto:hey@megabyte.space">hey@megabyte.space</a>.
        </p>
      </aside>
    </BlogArticle>
  );
}

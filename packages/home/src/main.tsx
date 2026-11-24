import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import StatusView from "./StatusView";
import NotFound from "./NotFound";
import Login from "./Login";
import { BlogIndex, LiveKitStartupSponsorshipArticle, StartupProgramsArticle } from "./Blog";
import { isKnownRoute } from "./known-routes";
import { initVitals } from "./vitals";
import "./index.css";

// Minimal path routing — the apex homepage, the build-in-public /status page, the
// Better Auth /login surface, and a styled 404 for everything else (the Worker
// also returns a real 404 STATUS so unknown paths are never soft-404s).
const path = window.location.pathname;
const clean = path.replace(/\/+$/, "") || "/";
const view = !isKnownRoute(path) ? (
  <NotFound />
) : clean === "/status" ? (
  <StatusView />
) : clean === "/login" ? (
  <Login />
) : clean === "/blog" ? (
  <BlogIndex />
) : clean === "/blog/daytona-e2b-sentry-startup-programs" ? (
  <StartupProgramsArticle />
) : clean === "/blog/livekit-startup-sponsorship-telephony" ? (
  <LiveKitStartupSponsorshipArticle />
) : (
  <App />
);

createRoot(document.getElementById("app")!).render(<StrictMode>{view}</StrictMode>);

// Report real-visitor field Core Web Vitals to the DO (build-in-public /status card).
initVitals();

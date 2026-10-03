import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import StatusView from "./StatusView";
import NotFound from "./NotFound";
import Login from "./Login";
import { isKnownRoute } from "./known-routes";
import { initVitals } from "./vitals";
import "./index.css";

// Minimal path routing — the apex homepage, the build-in-public /status page, the
// Better Auth /signin surface (BA-2), and a styled 404 for everything else (the Worker
// also returns a real 404 STATUS so unknown paths are never soft-404s).
const path = window.location.pathname;
const clean = path.replace(/\/+$/, "") || "/";
const view = !isKnownRoute(path) ? (
  <NotFound />
) : clean === "/status" ? (
  <StatusView />
) : clean === "/signin" ? (
  <Login />
) : (
  <App />
);

createRoot(document.getElementById("app")!).render(<StrictMode>{view}</StrictMode>);

// Report real-visitor field Core Web Vitals to the DO (build-in-public /status card).
initVitals();

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import StatusView from "./StatusView";
import NotFound from "./NotFound";
import { isKnownRoute } from "./known-routes";
import { initVitals } from "./vitals";
import "./index.css";

// Minimal path routing — the apex homepage, the build-in-public /status page, and a
// styled 404 for everything else (the Worker also returns a real 404 STATUS so unknown
// paths are never soft-404s). Full SPA routing isn't warranted for two real routes.
const path = window.location.pathname;
const view = !isKnownRoute(path) ? <NotFound /> : path.replace(/\/+$/, "") === "/status" ? <StatusView /> : <App />;

createRoot(document.getElementById("app")!).render(<StrictMode>{view}</StrictMode>);

// Report real-visitor field Core Web Vitals to the DO (build-in-public /status card).
initVitals();

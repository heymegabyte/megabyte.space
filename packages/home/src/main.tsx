import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import StatusView from "./StatusView";
import "./index.css";

// Minimal path routing — the apex homepage at every path except the build-in-public
// /status telemetry page. Full SPA routing isn't warranted for two surfaces.
const isStatus = window.location.pathname === "/status";

createRoot(document.getElementById("app")!).render(<StrictMode>{isStatus ? <StatusView /> : <App />}</StrictMode>);

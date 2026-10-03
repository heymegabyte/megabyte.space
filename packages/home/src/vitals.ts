// Field Core Web Vitals beacon. Reports real-visitor LCP / CLS / INP / TTFB to
// /api/vitals via navigator.sendBeacon when each metric finalizes (web-vitals
// fires LCP/CLS/INP on page hide, TTFB early). Zero-PII — metric name + value
// only, no IDs, no attribution payload. Same-origin, so CSP connect-src 'self'
// already allows it. Best-effort: never throws into the page.
import { onCLS, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

function send({ name, value }: Metric): void {
  // CLS is unitless (0.xx) — keep 3 decimals; the others are ms — round to int.
  const rounded = name === "CLS" ? Math.round(value * 1000) / 1000 : Math.round(value);
  const body = JSON.stringify({ metric: name, value: rounded });
  try {
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/vitals", body);
    } else {
      void fetch("/api/vitals", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* beacon is best-effort — a failed send must never break the page */
  }
}

/** Wire the four field vitals. Call once after the app mounts. */
export function initVitals(): void {
  onLCP(send);
  onCLS(send);
  onINP(send);
  onTTFB(send);
}

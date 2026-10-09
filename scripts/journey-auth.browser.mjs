#!/usr/bin/env node
// Local fixture-browser regression only: never production or case-001 coverage.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { chromium } from "playwright";
import { authenticateJourney } from "./journey-auth.ts";

const browser = await chromium.launch();
try {
  for (const scenario of ["success", "rejected", "missing-shell", "invalid-session", "network-failure"]) {
    const context = await browser.newContext();
    try {
      const server = createServer((request, response) => {
        const path = request.url;
        if (path === "/api/auth/get-session") {
          if (scenario === "network-failure") return request.socket.destroy();
          response.setHeader("Content-Type", "application/json");
          return response.end(JSON.stringify(scenario === "invalid-session" ? null : { user: { email: "fixture@example.test" }, session: { id: "fixture" } }));
        }
        const html = path === "/pulse"
          ? (scenario === "missing-shell" ? "<main>Login required</main>" : "<aside>Authenticated fixture navigation</aside>")
          : `<input type="email"><input type="password"><button data-testid="auth-submit" onclick="${scenario === "rejected" ? "" : "document.querySelector('#ok').setAttribute('data-testid','auth-success')"}">Sign in</button><div id="ok"></div>`;
        response.setHeader("Content-Type", "text/html"); response.end(html);
      });
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const apex = `http://127.0.0.1:${server.address().port}`;
      try {
      const page = await context.newPage();
      await page.goto(`${apex}/signin`);
      // Shorten negative-case waits, retaining real Playwright selectors and visibility behavior.
      const boundedPage = new Proxy(page, { get(target, prop) {
        if (prop === "waitForSelector") return (selector, options) => target.waitForSelector(selector, { ...options, timeout: 250 });
        if (prop === "locator") return (selector) => {
          const locator = target.locator(selector);
          return { waitFor: (options) => locator.waitFor({ ...options, timeout: 250 }) };
        };
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      } });
      const run = authenticateJourney(boundedPage, apex, "fixture@example.test", "fixture-only");
      if (scenario === "success") await run;
      else await assert.rejects(run, { message: "Journey authentication failed before authenticated shell verification" });
      console.log(`PASS ${scenario} (local fixture Chromium)`);
      } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    } finally { await context.close(); }
  }
} finally { await browser.close(); }

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:4179", headless: true, trace: "off" },
  projects: [{
    name: "constrained-chromium",
    use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 }, reducedMotion: "no-preference" },
  }],
  webServer: process.env.RUNTIME_BOUNDARY_EXTERNAL_SERVER === "1" ? undefined : {
    command: "node ../../node_modules/wrangler/bin/wrangler.js dev --port 4179 --ip 127.0.0.1",
    cwd: "packages/home",
    url: "http://127.0.0.1:4179/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

// Router-only deploy: ships a FRONTEND-only change (the router serves workshop-frontend/dist as
// assets) when the full `node scripts/deploy.ts` is blocked at the backend (Worker Loader / Dynamic
// Workers paid-plan requirement, code 10195). Reuses deploy.ts's own generateConfigs so the router's
// generated config (custom domain, service bindings, BA_GATE/BETTER_AUTH vars) is byte-identical to a
// full deploy. Assumes `build(config)` already ran (it does, before any deploy aborts).
import { readFile, writeFile, rm } from "node:fs/promises";
import { parse } from "jsonc-parser";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { generateConfigs } from "./deploy.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const opts = { allowTrailingComma: true };
const readJsonc = async (p: string) => parse(await readFile(p, "utf8"), [], opts);

const config = await readJsonc(join(root, "deployment.jsonc"));
const bases = {
  router: await readJsonc(join(root, "cloudflare-os/packages/router/wrangler.jsonc")),
  workshop: await readJsonc(join(root, "cloudflare-os/packages/workshop-backend/wrangler.jsonc")),
  context: await readJsonc(join(root, "cloudflare-os/packages/gatekeeper-context/wrangler.jsonc")),
  scheduler: await readJsonc(join(root, "cloudflare-os/packages/gatekeeper-scheduler/wrangler.jsonc")),
  customGatekeeper: await readJsonc(join(root, "packages/custom-gatekeeper/wrangler.jsonc")),
  errorReporter: await readJsonc(join(root, "packages/error-reporter/wrangler.jsonc")),
};
const generated = generateConfigs(config as any, bases as any);
const routerDir = join(root, "cloudflare-os/packages/router");
const cfgPath = join(routerDir, "wrangler.prod.jsonc");
await writeFile(cfgPath, JSON.stringify(generated.router, null, 2) + "\n");
try {
  const r = spawnSync("npx", ["--no-install", "wrangler", "deploy", "--config", "wrangler.prod.jsonc"],
    { cwd: routerDir, stdio: "inherit", env: process.env });
  process.exitCode = r.status ?? 1;
} finally {
  await rm(cfgPath, { force: true });
}

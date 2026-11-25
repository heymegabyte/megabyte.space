// Workshop-only incident deploy: aligns the backend RPC surface with an already-deployed frontend
// without mutating routes, DNS, Access, auth, or the remaining Gatekeeper fleet.
import { readFile, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";
import { generateConfigs } from "./deploy.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJsonc = async (path: string) => parse(await readFile(path, "utf8"), [], { allowTrailingComma: true });
const config = await readJsonc(join(root, "deployment.jsonc"));
const bases = {
  router: await readJsonc(join(root, "cloudflare-os/packages/router/wrangler.jsonc")),
  workshop: await readJsonc(join(root, "cloudflare-os/packages/workshop-backend/wrangler.jsonc")),
  context: await readJsonc(join(root, "cloudflare-os/packages/gatekeeper-context/wrangler.jsonc")),
  scheduler: await readJsonc(join(root, "cloudflare-os/packages/gatekeeper-scheduler/wrangler.jsonc")),
  customGatekeeper: await readJsonc(join(root, "packages/custom-gatekeeper/wrangler.jsonc")),
  errorReporter: await readJsonc(join(root, "packages/error-reporter/wrangler.jsonc")),
};
const generated = generateConfigs(config, bases);
const workshopDir = join(root, "cloudflare-os/packages/workshop-backend");
const cfgPath = join(workshopDir, "wrangler.prod.jsonc");

const build = spawnSync("pnpm", ["run", "build:worker"], { cwd: workshopDir, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

await writeFile(cfgPath, JSON.stringify(generated.workshop, null, 2) + "\n");
try {
  const deploy = spawnSync("pnpm", ["exec", "wrangler", "deploy", "--config", "wrangler.prod.jsonc"], {
    cwd: workshopDir,
    stdio: "inherit",
  });
  process.exitCode = deploy.status ?? 1;
} finally {
  await rm(cfgPath, { force: true });
}

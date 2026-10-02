#!/usr/bin/env node
/**
 * gen-build-info — writes packages/home/public/build-info.json {deployedAt, commit}
 * at build time so /status can show a "Last deployed Xm ago · <sha>" build-in-public
 * freshness line. Runs BEFORE `vite build` so Vite copies it from public/ into dist/.
 * Regular Node build script (not a Workflow sandbox) → Date + git are fine here.
 */
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
} catch {
  /* detached / no git — leave 'unknown' */
}
const info = { deployedAt: new Date().toISOString(), commit };
writeFileSync(join(ROOT, "packages", "home", "public", "build-info.json"), `${JSON.stringify(info)}\n`);
console.log(`gen-build-info: ${commit} @ ${info.deployedAt}`);

#!/usr/bin/env node
/**
 * check-submodule-resolvable — assert every submodule's committed gitlink SHA is
 * actually resolvable from the URL recorded in `.gitmodules`.
 *
 * The trap this retires (fire-26, WS-11): the submodule's gitlink was moved to a
 * commit that exists ONLY in our fork (`heymegabyte/cloudflare-os@7358a9d8`), but
 * `.gitmodules` still pointed at upstream (`cloudflare/cloudflare-os`) which does
 * NOT have that commit. Nothing local catches it — `pnpm check`/`pnpm deploy` use
 * the already-checked-out submodule and never re-resolve `.gitmodules`; only a fresh
 * `git clone --recurse-submodules` (CI, a new machine) fails, loudly and late.
 *
 * This gate makes that failure local + instant: for each submodule it reads the
 * committed gitlink (`git ls-tree HEAD <path>`) and the `.gitmodules` url, then
 * `git ls-remote <url>` and asserts the gitlink SHA is a ref tip on that remote.
 *
 * Exit 0 = every gitlink resolvable from its .gitmodules url. Exit 1 = a gitlink
 * the recorded url cannot resolve (push the commit, or repoint the url).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const gm = join(ROOT, ".gitmodules");

const sh = (cmd) => execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();

if (!existsSync(gm)) {
  console.log("no .gitmodules — nothing to check");
  process.exit(0);
}

// Parse .gitmodules into { name: { path, url, branch } }.
const mods = {};
let cur = null;
for (const raw of readFileSync(gm, "utf8").split("\n")) {
  const line = raw.trim();
  const m = line.match(/^\[submodule "(.+)"\]$/);
  if (m) {
    cur = m[1];
    mods[cur] = {};
    continue;
  }
  if (!cur) continue;
  const kv = line.match(/^(path|url|branch)\s*=\s*(.+)$/);
  if (kv) mods[cur][kv[1]] = kv[2].trim();
}

let failed = 0;
const names = Object.keys(mods);
if (names.length === 0) {
  console.log("no submodules declared in .gitmodules");
  process.exit(0);
}

for (const name of names) {
  const { path, url, branch } = mods[name];
  if (!path || !url) {
    console.error(`FAIL  ${name}: missing path or url in .gitmodules`);
    failed++;
    continue;
  }
  let gitlink;
  try {
    // `<mode> commit <sha>\t<path>` for a gitlink entry.
    gitlink = sh(`git ls-tree HEAD "${path}"`).split(/\s+/)[2];
  } catch {
    console.error(`FAIL  ${name}: no committed gitlink at ${path} (git ls-tree HEAD)`);
    failed++;
    continue;
  }
  if (!gitlink || !/^[0-9a-f]{40}$/.test(gitlink)) {
    console.error(`FAIL  ${name}: unexpected gitlink "${gitlink}" at ${path}`);
    failed++;
    continue;
  }
  let refs;
  try {
    refs = sh(`git ls-remote "${url}"`);
  } catch (e) {
    console.error(`FAIL  ${name}: cannot reach ${url} (${String(e.message).split("\n")[0]})`);
    failed++;
    continue;
  }
  const tips = new Set(refs.split("\n").map((l) => l.split(/\s+/)[0]));
  if (tips.has(gitlink)) {
    const where = branch ? ` (branch ${branch})` : "";
    console.log(`PASS  ${name}: gitlink ${gitlink.slice(0, 8)} is a ref tip on ${url}${where}`);
  } else {
    // Distinguish the common prod-ahead-of-git salvage case (fire-147/164/166: the fork was
    // committed + FF-pushed, but the parent repo never bumped the gitlink, so HEAD's gitlink is
    // a now-superseded ancestor) from a genuinely-unreachable gitlink. If the WORKING-TREE
    // checkout is itself a ref tip AND a descendant of the stale gitlink, the fix is a one-liner
    // (`git add <path>`), not a push/repoint — so say THAT instead of the misleading remedy.
    let wt = null;
    try {
      wt = sh(`git -C "${path}" rev-parse HEAD`);
    } catch {}
    let wtAhead = false;
    if (wt && tips.has(wt) && wt !== gitlink) {
      try {
        execSync(`git -C "${path}" merge-base --is-ancestor ${gitlink} ${wt}`, { cwd: ROOT });
        wtAhead = true;
      } catch {}
    }
    if (wtAhead) {
      console.error(
        `FAIL  ${name}: STALE GITLINK — committed gitlink ${gitlink.slice(0, 8)} is BEHIND the ` +
          `working-tree checkout ${wt.slice(0, 8)} (a ref tip on ${url}). The fork is already ` +
          `pushed; the parent repo just didn't record it (prod-ahead-of-git). ` +
          `Bump it: git add ${path} && commit.`,
      );
    } else {
      console.error(
        `FAIL  ${name}: gitlink ${gitlink.slice(0, 8)} is NOT a ref tip on ${url}. ` +
          `A fresh clone cannot resolve it. Push the commit to that remote, or repoint ` +
          `the .gitmodules url (git submodule set-url ${path} <url-that-has-it>).`,
      );
    }
    failed++;
  }
}

console.log(failed === 0 ? "\nOK — all submodule gitlinks resolvable" : `\n${failed} unresolvable gitlink(s)`);
process.exit(failed === 0 ? 0 : 1);

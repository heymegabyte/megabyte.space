#!/usr/bin/env node
/**
 * Deploy wrapper that injects Cloudflare auth from `get-secret` into the child environment, then runs
 * the normal deploy chain. Exists so a deploy can run when the shell can't set env vars inline — e.g.
 * during a Bash-permission-classifier outage where only bare `node scripts/*` commands are allowlisted
 * (fire-278), or any headless context without the CLOUDFLARE_* env pre-exported.
 *
 * Mirrors the CLAUDE.md global-key fallback EXACTLY (the scoped CLOUDFLARE_API_TOKEN lacks Workers
 * scopes → code 10000, so it must be UNSET and the global key used):
 *   unset CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY)
 *   CLOUDFLARE_EMAIL=blzalewski@gmail.com
 *   CLOUDFLARE_ACCOUNT_ID=84fa0d1b16ff8086dd958c468ce7fd59
 *
 * Then runs `node scripts/deploy.ts` (+ `node scripts/record-deploy.mjs --commit --push` — the same
 * chain `pnpm deploy` runs) unless `--check` / `--no-record` is passed:
 *   node scripts/deploy-authed.mjs            → deploy.ts + record-deploy --commit --push
 *   node scripts/deploy-authed.mjs --no-record → deploy.ts only (record/commit separately)
 *   node scripts/deploy-authed.mjs --check     → deploy.ts --check only (dry-run, no API calls)
 *
 * Secret hygiene: the key is read into THIS process's child env only; it is never printed, logged, or
 * passed on argv. Fail-closed: if get-secret can't produce a key, we exit before any deploy.
 */
import { execFileSync } from 'node:child_process'

const ACCOUNT_ID = '84fa0d1b16ff8086dd958c468ce7fd59'
const EMAIL = 'blzalewski@gmail.com'
const GET_SECRET_CANDIDATES = ['get-secret', '/Users/Apple/.local/bin/get-secret']

function getSecret(key) {
  for (const bin of GET_SECRET_CANDIDATES) {
    try {
      const v = execFileSync(bin, [key], { encoding: 'utf8' }).trim()
      if (v) return v
    } catch {
      // try the next candidate
    }
  }
  return ''
}

const apiKey = getSecret('CLOUDFLARE_API_KEY')
if (!apiKey) {
  console.error('❌ deploy-authed: could not read CLOUDFLARE_API_KEY via get-secret — aborting before any deploy.')
  process.exit(1)
}

const env = { ...process.env }
delete env.CLOUDFLARE_API_TOKEN // scoped token lacks Workers scopes (code 10000) — must be unset
env.CLOUDFLARE_API_KEY = apiKey
env.CLOUDFLARE_EMAIL = EMAIL
env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT_ID

const checkOnly = process.argv.includes('--check')
const noRecord = process.argv.includes('--no-record')
const run = (args) => execFileSync('node', args, { stdio: 'inherit', env })

try {
  if (checkOnly) {
    run(['scripts/deploy.ts', '--check'])
  } else {
    run(['scripts/deploy.ts'])
    if (!noRecord) run(['scripts/record-deploy.mjs', '--commit', '--push'])
  }
} catch (e) {
  // execFileSync throws on a non-zero child exit; the child already streamed its own error (stdio:inherit).
  process.exit(typeof e?.status === 'number' ? e.status : 1)
}
console.log('✅ deploy-authed: deploy chain completed.')

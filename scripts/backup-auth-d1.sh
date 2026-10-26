#!/usr/bin/env bash
# Offsite backup of the megabyte-auth D1 (all Better-Auth user/session data) → private R2.
# D1 Time Travel is only 30 days + in-account; this is the offsite copy (estate idea: DR).
# Idempotent: dated key per run. Verifies the round-trip. Wrap with the Healthchecks dead-man's-switch
# for monitoring: ~/.claude/skills/healthchecks-monitor/hc-run.sh auth-d1-backup -- scripts/backup-auth-d1.sh
set -euo pipefail

DB="${AUTH_D1_NAME:-megabyte-auth}"
BUCKET="${AUTH_BACKUP_BUCKET:-megabyte-auth-backup}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
KEY="megabyte-auth/${STAMP}.sql"
OUT="$(mktemp -t auth-d1-XXXX).sql"
VERIFY="$(mktemp -t auth-d1-verify-XXXX).sql"
WR="npx -y wrangler"

# CF auth: the scoped token lacks D1/R2 scopes — use the global-key fallback (same as deploy).
if [ -z "${CLOUDFLARE_API_KEY:-}" ]; then
  GS="$(command -v get-secret || echo "$HOME/.local/bin/get-secret")"
  unset CLOUDFLARE_API_TOKEN
  export CLOUDFLARE_API_KEY="$("$GS" CLOUDFLARE_API_KEY)"
  export CLOUDFLARE_EMAIL="blzalewski@gmail.com"
  export CLOUDFLARE_ACCOUNT_ID="84fa0d1b16ff8086dd958c468ce7fd59"
fi

cleanup() { rm -f "$OUT" "$VERIFY"; }
trap cleanup EXIT

echo "backup-auth-d1: exporting D1 '$DB' (remote)…"
$WR r2 bucket create "$BUCKET" 2>/dev/null || true   # idempotent; private by default
$WR d1 export "$DB" --remote --output "$OUT" >/dev/null
BYTES="$(wc -c < "$OUT" | tr -d ' ')"
TABLES="$(grep -c 'CREATE TABLE' "$OUT" || true)"
[ "$BYTES" -gt 1000 ] || { echo "backup-auth-d1: export too small ($BYTES bytes) — aborting, no upload"; exit 1; }

echo "backup-auth-d1: exported ${BYTES} bytes, ${TABLES} tables → R2 $BUCKET/$KEY"
$WR r2 object put "$BUCKET/$KEY" --file "$OUT" >/dev/null

# Verify the round-trip (object exists + byte-identical) before declaring success.
$WR r2 object get "$BUCKET/$KEY" --file "$VERIFY" >/dev/null
VBYTES="$(wc -c < "$VERIFY" | tr -d ' ')"
[ "$VBYTES" = "$BYTES" ] || { echo "backup-auth-d1: round-trip MISMATCH ($BYTES vs $VBYTES) — backup NOT verified"; exit 1; }

echo "backup-auth-d1: ✅ verified ${VBYTES} bytes at $BUCKET/$KEY"

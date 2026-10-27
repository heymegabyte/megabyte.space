#!/usr/bin/env bash
# Remote backup of the megabyte-auth D1 (all Better-Auth user/session data) → private R2.
# Separate R2 copy in the same Cloudflare account; not an independent offsite recovery copy.
# Idempotent: dated key per run. Verifies the round-trip. Wrap with the Healthchecks dead-man's-switch
# for monitoring: ~/.claude/skills/healthchecks-monitor/hc-run.sh auth-d1-backup -- scripts/backup-auth-d1.sh
set -euo pipefail
umask 077
# Resolve the repository-pinned Wrangler even when invoked from a scheduler directory.
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

DB="${AUTH_D1_NAME:-megabyte-auth}"
BUCKET="${AUTH_BACKUP_BUCKET:-megabyte-auth-backup}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
KEY="megabyte-auth/${STAMP}.sql"
SCRATCH="$(mktemp -d -t auth-d1-XXXXXX)"
cleanup() { rm -rf -- "$SCRATCH"; }
trap cleanup EXIT
OUT="$SCRATCH/export.sql"
VERIFY="$SCRATCH/verify.sql"
WR=(npx -y pnpm@11.17.0 exec wrangler)

# CF auth: the scoped token lacks D1/R2 scopes — use the global-key fallback (same as deploy).
if [ -z "${CLOUDFLARE_API_KEY:-}" ]; then
  GS="$(command -v get-secret || echo "$HOME/.local/bin/get-secret")"
  unset CLOUDFLARE_API_TOKEN
  CLOUDFLARE_API_KEY="$("$GS" CLOUDFLARE_API_KEY)"
  [ -n "$CLOUDFLARE_API_KEY" ] || { echo "backup-auth-d1: missing Cloudflare credential" >&2; exit 1; }
  export CLOUDFLARE_API_KEY
  export CLOUDFLARE_EMAIL="blzalewski@gmail.com"
  export CLOUDFLARE_ACCOUNT_ID="84fa0d1b16ff8086dd958c468ce7fd59"
fi

echo "backup-auth-d1: exporting D1 '$DB' (remote)…"
# Bucket must already exist; provisioning belongs to the operator.
"${WR[@]}" d1 export "$DB" --remote --output "$OUT" >/dev/null
BYTES="$(wc -c < "$OUT" | tr -d ' ')"
TABLES="$(grep -c 'CREATE TABLE' "$OUT" || true)"
[ "$BYTES" -gt 1000 ] || { echo "backup-auth-d1: export too small ($BYTES bytes) — aborting, no upload"; exit 1; }

echo "backup-auth-d1: exported ${BYTES} bytes, ${TABLES} tables → R2 $BUCKET/$KEY"
"${WR[@]}" r2 object put "$BUCKET/$KEY" --remote --file "$OUT" >/dev/null

# Verify the round-trip (object exists + byte-identical) before declaring success.
"${WR[@]}" r2 object get "$BUCKET/$KEY" --remote --file "$VERIFY" >/dev/null
VBYTES="$(wc -c < "$VERIFY" | tr -d ' ')"
cmp -s "$OUT" "$VERIFY" || { echo "backup-auth-d1: round-trip content MISMATCH ($BYTES vs $VBYTES bytes) — backup NOT verified"; exit 1; }

echo "backup-auth-d1: ✅ verified ${VBYTES} bytes at $BUCKET/$KEY"

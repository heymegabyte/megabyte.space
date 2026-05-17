#!/bin/sh
# Neon Postgres wakeup script — wakes serverless compute before Listmonk connects

echo "[wakeup] Pinging Neon Postgres to wake from suspend..."

MAX_RETRIES=15
RETRY_DELAY=3
ATTEMPT=0

while [ "$ATTEMPT" -lt "$MAX_RETRIES" ]; do
  ATTEMPT=$((ATTEMPT + 1))
  if PGPASSWORD="$LISTMONK_db__password" psql \
    -h "$LISTMONK_db__host" \
    -p "${LISTMONK_db__port:-5432}" \
    -U "$LISTMONK_db__user" \
    -d "$LISTMONK_db__database" \
    -c "SELECT 1;" >/dev/null 2>&1; then
    echo "[wakeup] Neon Postgres is awake (attempt $ATTEMPT)"
    break
  fi
  echo "[wakeup] Attempt $ATTEMPT/$MAX_RETRIES — Neon still waking, retrying in ${RETRY_DELAY}s..."
  sleep "$RETRY_DELAY"
done

if [ "$ATTEMPT" -ge "$MAX_RETRIES" ]; then
  echo "[wakeup] WARNING: Could not wake Neon after $MAX_RETRIES attempts. Starting Listmonk anyway..."
fi

# Run Listmonk database migrations (idempotent)
echo "[startup] Running Listmonk migrations..."
/listmonk --install --idempotent --yes 2>&1 || echo "[startup] Migration returned non-zero (may be fine if tables exist)"

echo "[startup] Starting Listmonk on port 9000..."
exec /listmonk

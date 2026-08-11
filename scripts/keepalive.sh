#!/usr/bin/env bash
# Keepalive pinger for PromurciaOS on Render free plan.
# Run on any machine/server that stays on. Example:
#   nohup ./scripts/keepalive.sh > /tmp/promurcia-keepalive.log 2>&1 &
# Or with systemd, cron, etc.

URL="${PROMURCIA_URL:-https://promurcia-os.onrender.com/api/health}"
INTERVAL_SEC="${PROMURCIA_KEEPALIVE_INTERVAL:-600}" # default 10 minutes

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

echo "[$(date -Iseconds)] Keepalive started -> $URL every ${INTERVAL_SEC}s"

while true; do
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$URL" 2>&1)
  http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
  body=$(echo "$response" | sed '$d')
  echo "[$(date -Iseconds)] HTTP $http_code -> $body"
  sleep "$INTERVAL_SEC"
done

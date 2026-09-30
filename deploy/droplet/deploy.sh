#!/usr/bin/env bash
# Build on this computer, run migrations through an SSH tunnel, upload, restart.
#   deploy/droplet/deploy.sh root@HOST
set -euo pipefail

TARGET="${1:?usage: deploy.sh user@host}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TUNNEL_PORT=55432

echo "==> Build"
cd "$ROOT"
pnpm --filter @stoperica/web build
pnpm --filter @stoperica/api run build:bundle

echo "==> Migrate (via SSH tunnel)"
DB_URL=$(ssh "$TARGET" "sed -n 's/^DATABASE_URL=//p' /etc/stoperica/api.env")
TUNNEL_URL="${DB_URL/@127.0.0.1:5432/@127.0.0.1:$TUNNEL_PORT}"
ssh -fN -M -S /tmp/stoperica-tunnel -o ExitOnForwardFailure=yes -L "$TUNNEL_PORT:127.0.0.1:5432" "$TARGET"
trap 'ssh -S /tmp/stoperica-tunnel -O exit "$TARGET" 2>/dev/null || true' EXIT
(cd apps/api && DATABASE_URL="$TUNNEL_URL" pnpm exec prisma migrate deploy)

echo "==> Upload"
rsync -az --delete apps/web/dist/ "$TARGET:/srv/stoperica/web/"
rsync -az --delete apps/api/bundle/ "$TARGET:/srv/stoperica/api/"
ssh "$TARGET" 'chown -R stoperica:stoperica /srv/stoperica/web /srv/stoperica/api && systemctl restart stoperica-api
for _ in $(seq 20); do
  curl -fsS -o /dev/null http://127.0.0.1:3000/api/health 2>/dev/null && { echo "API healthy"; exit 0; }
  sleep 1
done
echo "API did not become healthy:"; journalctl -u stoperica-api -n 30 --no-pager -o cat; exit 1'

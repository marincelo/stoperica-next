#!/usr/bin/env bash
# One-time setup of a small (512 MB) Ubuntu droplet. Run as root:
#   scp -r deploy/droplet root@HOST:/tmp/stoperica-setup && ssh root@HOST bash /tmp/stoperica-setup/setup.sh
# Safe to re-run: existing swap, database and secrets are kept.
set -euo pipefail
cd "$(dirname "$0")"

PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-http://$(curl -fsS http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)}"

echo "==> Swap (1 GB)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
  sysctl -p /etc/sysctl.d/99-swappiness.conf
fi

echo "==> Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -yq ca-certificates curl gnupg nginx postgresql ufw rsync
if ! node --version 2>/dev/null | grep -q '^v24'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -yq nodejs
fi

echo "==> Postgres tuned for 512 MB"
PG_CONF_DIR=$(ls -d /etc/postgresql/*/main | tail -1)
cat > "$PG_CONF_DIR/conf.d/stoperica.conf" <<'EOF'
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 64MB
effective_cache_size = 192MB
work_mem = 4MB
maintenance_work_mem = 32MB
EOF
systemctl restart postgresql

echo "==> App user, directories, secrets"
id stoperica >/dev/null 2>&1 || useradd --system --home /srv/stoperica --shell /usr/sbin/nologin stoperica
mkdir -p /srv/stoperica/web /srv/stoperica/api /srv/stoperica/backups /etc/stoperica
chown -R stoperica:stoperica /srv/stoperica

if [ ! -f /etc/stoperica/api.env ]; then
  DB_PASSWORD=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE stoperica LOGIN PASSWORD '$DB_PASSWORD'"
  sudo -u postgres createdb -O stoperica stoperica
  cat > /etc/stoperica/api.env <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgresql://stoperica:$DB_PASSWORD@127.0.0.1:5432/stoperica
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
CORS_ORIGIN=$PUBLIC_ORIGIN
# Plain HTTP while testing on the IP address. Remove once HTTPS is set up.
COOKIE_SECURE=false
EOF
  chmod 600 /etc/stoperica/api.env
fi

echo "==> nginx"
cp nginx.conf /etc/nginx/sites-available/stoperica
ln -sf /etc/nginx/sites-available/stoperica /etc/nginx/sites-enabled/stoperica
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> API service"
cp stoperica-api.service /etc/systemd/system/stoperica-api.service
systemctl daemon-reload
systemctl enable stoperica-api

echo "==> Nightly database backup (kept 14 days)"
cat > /etc/cron.d/stoperica-backup <<'EOF'
15 3 * * * postgres pg_dump -Fc stoperica > /srv/stoperica/backups/stoperica-$(date +\%F).dump && find /srv/stoperica/backups -name '*.dump' -mtime +14 -delete
EOF
chown postgres:postgres /srv/stoperica/backups

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "Done. Origin: $PUBLIC_ORIGIN"

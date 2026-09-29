# Deploying Stoperica

Everything runs on one DigitalOcean droplet with Docker Compose:

```
Internet ──▶ caddy :80/:443   automatic HTTPS (Let's Encrypt)
               └─▶ web        nginx: built Vue app + /api proxy
                     └─▶ api  Fastify on :3000
                           └─▶ db  Postgres 17 (volume "pgdata")
migrate: one-off container that runs `prisma migrate deploy` before api starts
```

Only Caddy publishes ports. The database and API are reachable only inside the Compose network.

## 1. Droplet (once)

- Ubuntu 24.04, **2 GB RAM** or more (the frontend build needs it). Turn on **droplet backups**.
- Add a DigitalOcean Cloud Firewall allowing inbound 22, 80, 443 only. (Docker bypasses `ufw` for published ports, so the cloud firewall is the reliable one.)
- Point `novo.stoperica.live` (A record) at the droplet IP.

```sh
ssh root@DROPLET_IP
curl -fsSL https://get.docker.com | sh
adduser --disabled-password deploy && usermod -aG docker deploy
# copy your SSH key: mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/ && chown -R deploy /home/deploy/.ssh
```

As `deploy`:

```sh
git clone git@github.com:YOU/stoperica-next.git ~/stoperica && cd ~/stoperica
cp .env.example .env
# edit .env: DOMAIN, POSTGRES_PASSWORD (openssl rand -hex 24), JWT_SECRET (openssl rand -base64 48)
```

The droplet needs read access to the repo: add a [deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) or clone over HTTPS with a token.

## 2. Import the data from the Rails app (once)

On the old server:

```sh
pg_dump -Fc --no-owner --no-acl -d <rails_db_name> -f stoperica.dump
scp stoperica.dump deploy@DROPLET_IP:~/stoperica/
```

On the new droplet:

```sh
cd ~/stoperica
docker compose up -d db
docker compose exec -T db pg_restore --no-owner --no-acl -U stoperica -d stoperica < stoperica.dump
```

The Rails schema already exists, so tell Prisma the baseline migration is done. The later migrations then run normally:

```sh
docker compose run --rm migrate pnpm exec prisma migrate resolve --applied 0_init
```

Migration `2_racer_admin_and_registration_constraints` adds a unique index and two foreign keys. Check the data first; every query should return 0 rows / 0:

```sh
docker compose exec db psql -U stoperica -c "
  SELECT racer_id, race_id, count(*) FROM race_results GROUP BY 1, 2 HAVING count(*) > 1;"
docker compose exec db psql -U stoperica -c "
  SELECT count(*) FROM race_results r LEFT JOIN categories c ON c.id = r.category_id
  WHERE r.category_id IS NOT NULL AND c.id IS NULL;"
docker compose exec db psql -U stoperica -c "
  SELECT count(*) FROM race_results r LEFT JOIN start_numbers s ON s.id = r.start_number_id
  WHERE r.start_number_id IS NOT NULL AND s.id IS NULL;"
```

## 3. Start / deploy

```sh
cd ~/stoperica
git pull
docker compose up -d --build
docker compose ps          # migrate should be "exited (0)", the rest "running"
```

That is also the command for every later deploy. `migrate` applies any new migrations before `api` starts; if it fails, `api` is not restarted and the old containers keep running.

Useful commands:

```sh
docker compose logs -f api            # API logs
docker compose logs migrate           # why a migration failed
docker compose exec db psql -U stoperica
docker image prune -f                 # clean up old images after deploys
```

## 4. Backups

Nightly dump kept for 14 days (`crontab -e` as `deploy`):

```cron
0 3 * * * cd ~/stoperica && mkdir -p backups && docker compose exec -T db pg_dump -Fc -U stoperica stoperica > backups/stoperica-$(date +\%F).dump && find backups -name '*.dump' -mtime +14 -delete
```

Copy `backups/` off the droplet regularly (e.g. `s3cmd sync` to DigitalOcean Spaces) so a lost droplet doesn't take the backups with it.

Restore: `docker compose exec -T db pg_restore --clean --if-exists --no-owner -U stoperica -d stoperica < backups/stoperica-YYYY-MM-DD.dump`

## 5. Switching to stoperica.live

1. Stop the Rails app (or put it in maintenance) so no new registrations land in the old database.
2. Take a fresh dump and repeat step 2 on an empty database:
   `docker compose down && docker volume rm stoperica_pgdata`, then step 2 again.
3. Point `stoperica.live` (and `www` if used) at the droplet.
4. In `.env` set `DOMAIN=stoperica.live`; to serve both names put `stoperica.live, www.stoperica.live` in the Caddyfile site address.
5. `docker compose up -d --build`. Caddy fetches the new certificate on the first request.

## Notes

- Login cookies are `Secure` in production, so the app must be opened over HTTPS. For a local test run with `DOMAIN=localhost` Caddy uses its own local certificate (accept the browser warning).
- The API trusts `X-Forwarded-For` (`trustProxy` in production). That is safe here because only Caddy → nginx can reach it, and Caddy overwrites the header with the real client IP, which the login rate limit relies on.

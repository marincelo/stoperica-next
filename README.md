# Stoperica

Public timing site for Croatian cycling races: upcoming events, results, league standings, registration and a small admin. This repo is the Node rewrite of the Rails app at [stoperica.live](https://stoperica.live).

## Stack

pnpm workspace (`apps/*`, `packages/*`). Node 24 or newer.

| Package | Role | Libraries |
| --- | --- | --- |
| `apps/web` | Public UI and admin | Vue 3, Vite, Pinia, Vue Router, Naive UI |
| `apps/api` | HTTP API | Fastify 5, Prisma 7 (`pg` adapter), JWT in an httpOnly cookie, ExcelJS |
| `packages/shared` | Types shared by web and API | TypeScript only |

The web dev server proxies `/api` to the API so the session cookie is same-origin. Admin CRUD is generic: Prisma schema plus a custom generator (`apps/api/prisma/generators/admin-meta.mjs`) drive the `/admin` screens.

## Layout

```
apps/web/          Vue app (public pages + /admin)
apps/api/          Fastify + Prisma
  prisma/          Schema and migrations (baseline is the Rails schema)
  src/exports/     Admin Excel downloads
packages/shared/   Shared TypeScript types
deploy/droplet/    Scripts for the 512 MB DigitalOcean droplet
```

## Setup

You need [pnpm](https://pnpm.io) 10, Node 24+ and a local PostgreSQL database (the existing one is named `stoperica`).

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
# set DATABASE_URL and JWT_SECRET (openssl rand -base64 48)
```

Point `DATABASE_URL` at a copy of the production dump, or at an empty database and apply migrations:

```sh
# empty database: creates the Rails tables, then the extra constraints
cd apps/api && pnpm db:migrate

# existing dump that already has the Rails tables: mark the baseline, then deploy the rest
cd apps/api
pnpm exec prisma migrate resolve --applied 0_init
pnpm db:deploy
```

Migration `2_racer_admin_and_registration_constraints` adds a unique index and two foreign keys. On an imported dump, these three queries should all return `0` first:

```sql
SELECT count(*) FROM (
  SELECT 1 FROM race_results GROUP BY racer_id, race_id HAVING count(*) > 1
) d;
SELECT count(*) FROM race_results r
  LEFT JOIN categories c ON c.id = r.category_id
  WHERE r.category_id IS NOT NULL AND c.id IS NULL;
SELECT count(*) FROM race_results r
  LEFT JOIN start_numbers s ON s.id = r.start_number_id
  WHERE r.start_number_id IS NOT NULL AND s.id IS NULL;
```

Start both apps:

```sh
pnpm dev                 # API :3000 and web :5173
# or separately:
pnpm dev:api
pnpm dev:web -- --host 0.0.0.0   # reachable from a phone on the LAN
```

Open [http://localhost:5173](http://localhost:5173). Log in with email + phone. `/admin` is admin-only.

Useful scripts:

```sh
pnpm typecheck
pnpm build
cd apps/api && pnpm db:status
```

`apps/api/.env` is the only local env file. `JWT_SECRET` must be at least 32 characters in production. `CORS_ORIGIN` is unused in local dev because of the Vite proxy.

## Deployment

Production currently runs on a **512 MB DigitalOcean droplet**. The frontend and a single-file API bundle are built on a developer machine; the droplet only needs Node, nginx and Postgres.

**One-time server setup** (as root; safe to re-run):

```sh
scp -r deploy/droplet stoperica-next:/tmp/stoperica-setup
ssh stoperica-next bash /tmp/stoperica-setup/setup.sh
```

That installs Node 24, nginx, Postgres (tuned for 512 MB), 1 GB of swap, a `stoperica` system user, `/etc/stoperica/api.env`, a systemd unit, nightly `pg_dump` (14 days in `/srv/stoperica/backups`) and a firewall (SSH + HTTP/HTTPS).

Import a SQL dump before the first deploy, then mark the Prisma baseline if the dump already contains the Rails schema:

```sh
ssh stoperica-next 'set -a; . /etc/stoperica/api.env; set +a; psql "$DATABASE_URL" -f /root/dump.sql'
# from this repo, through an SSH tunnel (see deploy/droplet/deploy.sh):
#   prisma migrate resolve --applied 0_init
```

**Every later deploy**, from this repo, with SSH access as in `~/.ssh/config` (`Host stoperica-next`):

```sh
deploy/droplet/deploy.sh stoperica-next
```

That builds the Vue app, bundles the API with esbuild, runs `prisma migrate deploy` through an SSH tunnel, rsyncs to `/srv/stoperica/{web,api}` and restarts `stoperica-api`.

While the site is served over **plain HTTP**, `COOKIE_SECURE=false` must stay in `/etc/stoperica/api.env` or login cookies will not stick. After DNS and HTTPS (`certbot --nginx`):

1. Set `CORS_ORIGIN=https://your-domain`.
2. Remove `COOKIE_SECURE=false`.
3. `systemctl restart stoperica-api`.

Logs: `ssh stoperica-next journalctl -u stoperica-api -f`.

A **Docker Compose** layout (Caddy + nginx + API + Postgres) lives in `compose.yaml` and is documented in [`DEPLOY.md`](DEPLOY.md). It needs about 2 GB of RAM for the image build, so it is not what the current droplet uses.

Registration emails are still printed to the API log. They will need an SMTP/provider implementation in `apps/api/src/lib/mailer.ts` before cut-over.

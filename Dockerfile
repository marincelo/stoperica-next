# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.18.1
ENV CI=true
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
# prisma.config.ts requires DATABASE_URL even for `prisma generate`; nothing connects to it.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm install --offline --frozen-lockfile
RUN pnpm build

FROM build AS api
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]

FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

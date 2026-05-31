# syntax=docker/dockerfile:1
ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Install full dependencies (incl. dev) — used for building and migrations.
# Installing inside the image ensures musl-native binaries (Tailwind, etc.).
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the Next.js standalone output.
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Migration runner: drizzle-kit + schema + SQL migrations only.
# Run as a one-off (compose service / k8s Job) before the app starts.
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db ./src/db
CMD ["pnpm", "db:migrate"]

# Minimal production image for the app.
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Chromium for the Puppeteer scraping fallback.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
# Same command for every role: the APP_ROLE env var selects web / worker /
# hybrid (worker embedded in the web process). Defaults to hybrid when unset.
CMD ["node", "server.js"]

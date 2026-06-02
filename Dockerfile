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

# Build the Next.js standalone output, then bundle the one-off DB entrypoints
# (migrate + seed) into self-contained CJS so the slim runner can run them
# without drizzle-kit/tsx. See package.json "build:scripts".
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN pnpm build:scripts

# Minimal production image. One image, three roles via the command:
#   app      -> node server.js            (default; APP_ROLE selects web/worker)
#   migrate  -> node dist/scripts/migrate.cjs       (db-migrate initContainer)
#   seed     -> node dist/scripts/seed-admin.cjs <email>
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
# Bundled migrate/seed entrypoints + the SQL migrations (runtime migrator reads
# drizzle/meta/_journal.json).
COPY --from=builder --chown=nextjs:nodejs /app/dist/scripts ./dist/scripts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
USER nextjs
EXPOSE 3000
# Same command for every role: the APP_ROLE env var selects web / worker /
# hybrid (worker embedded in the web process). Defaults to hybrid when unset.
CMD ["node", "server.js"]

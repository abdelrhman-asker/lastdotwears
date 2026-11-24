# syntax=docker/dockerfile:1.7

FROM node:22.23.1-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    corepack pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
# The prebuild hook generates Prisma. Its config needs a URL even without a database.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:1/build \
    corepack pnpm --filter @commerce/api build

FROM builder AS production-dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    corepack pnpm --filter @commerce/api deploy --prod --legacy /production/api

FROM builder AS migrator
ENV NODE_ENV=production
WORKDIR /workspace/apps/api
USER node:node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
ENV NODE_OPTIONS=--max-old-space-size=320
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /production/api/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /production/api/node_modules ./node_modules
COPY --from=builder --chown=node:node /workspace/apps/api/dist ./dist
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node:node
RUN test -f dist/main.js && test -f dist/generated/prisma/client.js && test -w /app/uploads
EXPOSE 4000
CMD ["node", "dist/main.js"]

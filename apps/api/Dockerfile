# syntax=docker/dockerfile:1.7

FROM node:22.23.1-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    corepack pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN corepack pnpm --filter @commerce/api prisma:generate \
    && corepack pnpm --filter @commerce/api build

FROM builder AS production-dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    corepack pnpm --filter @commerce/api deploy --prod --legacy /production/api

FROM builder AS migrator
ENV NODE_ENV=production
WORKDIR /workspace/apps/api
USER node
CMD ["corepack", "pnpm", "prisma:migrate:deploy"]

FROM node:22.23.1-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /production/api/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /production/api/node_modules ./node_modules
COPY --from=builder --chown=node:node /workspace/apps/api/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]

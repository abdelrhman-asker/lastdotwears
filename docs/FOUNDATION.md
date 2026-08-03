# Foundation Module

## Scope

This review gate establishes runnable application boundaries and cross-cutting behavior.
It deliberately does not include customer authentication, catalog entities, business
tables, storefront pages, seeds, or deployment containers.

## Pinned foundation

| Boundary        | Version / approach                         |
| --------------- | ------------------------------------------ |
| Package manager | pnpm 11 with a committed lockfile          |
| Runtime         | Node.js 22.12+ (Node.js 24 also supported) |
| Web             | Next.js 15.5, React 19, Tailwind CSS 4     |
| API             | NestJS 11, Express adapter                 |
| Database access | Prisma 7 with `@prisma/adapter-pg`         |
| API tests       | Jest and Supertest                         |
| Web tests       | Vitest and Testing Library                 |

Prisma Client is generated into `apps/api/src/generated/prisma` and is intentionally
ignored by Git. It must be generated after installation and in production image builds.

## Environment

Copy each example file before starting an application:

- `apps/api/.env.example` to `apps/api/.env`
- `apps/web/.env.example` to `apps/web/.env.local`

The API refuses to start when its PostgreSQL URL, CORS origins, or cookie secret are
invalid. The web build refuses to start when its public or internal origins are missing or
invalid.

`NEXT_OUTPUT_MODE` defaults to `standalone`, which is the production Docker/VPS target.
Windows machines that do not allow symlink creation can set `NEXT_OUTPUT_MODE=server` for
local production-build verification. This changes packaging only, not application code.

## API behavior

| Endpoint                   | Purpose                       | Database required |
| -------------------------- | ----------------------------- | ----------------- |
| `GET /api/v1`              | API identity and version      | No                |
| `GET /api/v1/health/live`  | Process liveness              | No                |
| `GET /api/v1/health/ready` | PostgreSQL readiness          | Yes               |
| `GET /docs`                | Swagger UI when enabled       | No                |
| `GET /docs/openapi.json`   | OpenAPI document when enabled | No                |

Unhandled and HTTP errors use `application/problem+json`. Request IDs are generated or
accepted from a bounded safe header and returned as `x-request-id`. Logs redact
authorization, cookies, password fields, and token fields.

Liveness and readiness are separate by design: a process can remain available for
diagnostics while an orchestrator removes it from service because PostgreSQL is down.

## Commands

Run commands from the repository root using the pinned package manager:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @commerce/api prisma:generate
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

`DATABASE_URL` must be present for Prisma generation and the API build. All three web URL
variables must be present for the web build.

## Dependency script policy

pnpm 11 blocks unreviewed dependency install scripts. The workspace explicitly permits
only the scripts required by Prisma, Next.js image optimization, and the native resolver:

- `@prisma/engines`
- `prisma`
- `sharp`
- `unrs-resolver`

The optional `@scarf/scarf` telemetry script is explicitly denied. Newly introduced build
scripts will fail installation until reviewed and added to `pnpm-workspace.yaml`.

## Verification recorded for this gate

- Prettier check: passed.
- API ESLint and strict TypeScript: passed.
- Web ESLint and strict TypeScript: passed.
- API unit tests: 4 passed.
- API HTTP e2e tests: 2 passed.
- Web component tests: 1 passed.
- Prisma schema validation and client generation: passed.
- NestJS production build: passed.
- Compiled NestJS process and HTTP liveness smoke test: passed.
- Next.js production build and static generation: passed.

# Egypt Fashion Commerce

A production-oriented clothing e-commerce platform for the Egyptian market. The
repository is organized as a pnpm monorepo containing a Next.js storefront/admin
application and a NestJS REST API.

## Current stage

The architecture, foundation, authentication/users, catalog/inventory, public storefront catalog,
persistent cart/wishlist, transactional checkout/orders, customer account, operational admin
dashboard, store settings/communication, and production deployment stages are complete. Both
applications are executable, strictly typed, linted, tested, production-buildable, and packaged
for a health-gated Docker Compose deployment.

Completed foundation capabilities include:

- Next.js 15 App Router application with Tailwind CSS, shadcn/ui conventions, TanStack
  Query, validated environment variables, security headers, and health endpoint.
- NestJS 11 API with Prisma 7/PostgreSQL wiring, versioned routing, Swagger, validated
  environment variables, structured/redacted logging, throttling, Helmet, CORS, secure
  cookie parsing, problem-details errors, and health endpoints.
- ESLint, Prettier, strict TypeScript, Jest API tests, Supertest API e2e tests, and Vitest
  web tests.
- Reproducible `pnpm-lock.yaml` and an explicit dependency build-script allowlist.
- Customer and administrator authentication with Argon2id, rotating cookie sessions,
  CSRF protection, role enforcement, verification/reset flows, profiles, customer
  blocking, audit logs, migration, and environment-driven seed accounts.
- Responsive customer auth/account pages and secure admin login/customer management UI
  using React Hook Form, Zod, and TanStack Query.
- Scalable category, brand, product, variant, image, and inventory data models with public
  catalog reads and secure administrator CRUD APIs.
- Persistent server-side product uploads, effective EGP sale-price filtering/sorting,
  transactional inventory adjustments, sample catalog data, and complete admin catalog UI.
- Premium responsive storefront with home merchandising, categories, product listings and
  details, search/filter/sort, pagination, resilient server rendering, and required static pages.
- Canonical and dynamic metadata, Open Graph cards, product JSON-LD, an active catalog sitemap,
  environment-aware robots rules, and optimized responsive imagery.
- Persistent guest/customer carts and wishlists with hashed guest identifiers, secure cookies,
  automatic account merge, live price/stock reconciliation, header counters, and responsive pages.
- Server-authoritative coupons and Egyptian shipping, transactional COD/manual InstaPay checkout,
  local QR generation, immutable order/payment snapshots, audited status policy, and invoices.
- Owner-scoped saved Egyptian addresses with atomic default selection, a responsive account hub,
  checkout prefill, and filtered/paginated customer order history.
- Secure responsive admin operations with revenue and best-seller analytics, order/payment
  workflows, invoices, coupons, shipping, catalog, inventory, and customer access management.
- Database-managed store identity, announcements, checkout methods, InstaPay details, scheduled
  homepage banners, social links, contact inbox, and resilient transactional email workflows.
- Multi-stage non-root API/web images, private PostgreSQL networking, automatic migration gating,
  Nginx TLS termination, Let's Encrypt renewal, bounded logs, and repeatable backup/restore helpers.

See [docs/FOUNDATION.md](docs/FOUNDATION.md) for local setup and verification commands.
See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) for session behavior, endpoints,
database migration, and seed instructions.
See [docs/CATALOG.md](docs/CATALOG.md) for catalog invariants, endpoints, image storage setup,
inventory behavior, and sample data.
See [docs/STOREFRONT.md](docs/STOREFRONT.md) for public routes, rendering behavior, search
parameters, SEO, and storefront environment configuration.
See [docs/CART_AND_WISHLIST.md](docs/CART_AND_WISHLIST.md) for persistence, merge rules,
commerce endpoints, storefront behavior, and migration instructions.
See [docs/CHECKOUT_ORDERS.md](docs/CHECKOUT_ORDERS.md) for pricing, shipping, payment, transaction,
status, invoice, migration, and seed contracts.
See [docs/CUSTOMER_ACCOUNT.md](docs/CUSTOMER_ACCOUNT.md) for address invariants, customer account
routes, checkout prefill, order history, migration, and verification.
See [docs/ADMIN_DASHBOARD.md](docs/ADMIN_DASHBOARD.md) for analytics definitions, admin routes,
order operations, coupon/shipping management, and verification.
See [docs/STORE_SETTINGS_AND_CONTACT.md](docs/STORE_SETTINGS_AND_CONTACT.md) for website settings,
merchandising, contact, email, migration, seed, and verification behavior.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the production environment, one-command Compose
deployment, TLS, initial seed, monitoring, updates, backups, restores, and incident procedures.

## Repository boundaries

- `apps/web`: Next.js 15 customer storefront and secure admin user interface.
- `apps/api`: NestJS REST API, Prisma schema, background tasks, and Swagger setup.
- `packages/api-client`: generated, type-safe client derived from the Swagger document.
- `packages/shared`: small framework-neutral constants and value types shared by both apps.
- `infra`: Docker, Nginx, and deployment assets.
- `docs`: architecture, API, operations, and decision records.
- `scripts`: repeatable development and deployment utilities.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete design and delivery
sequence.

## Quick start

Requirements: Node.js 22.12+ and a PostgreSQL instance.

1. Enable Corepack and run `corepack pnpm install`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and set a strong cookie secret.
3. Copy `apps/web/.env.example` to `apps/web/.env.local`.
4. Run `corepack pnpm --filter @commerce/api prisma:migrate:deploy`.
5. Run `corepack pnpm --filter @commerce/api prisma:seed`.
6. Run `corepack pnpm dev`.

The web app listens on port `3000`; the API listens on port `4000` by default.

## Production start

On a Docker-enabled Ubuntu VPS with DNS already pointing to the server:

```sh
cp .env.production.example .env.production
# Replace every placeholder, then:
docker compose --env-file .env.production up -d --build --remove-orphans --wait
```

PostgreSQL, API, and web ports remain private; only Nginx publishes ports 80 and 443. Follow the
deployment runbook before exposing a real store or seeding its first administrator.

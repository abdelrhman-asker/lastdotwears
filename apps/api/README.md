# API application

NestJS 11 REST API using Prisma 7 and PostgreSQL.

## Local setup

1. Copy `.env.example` to `.env` and replace the cookie secret.
2. Make sure PostgreSQL is reachable at `DATABASE_URL`.
3. From the repository root, run `pnpm install`.
4. Run `pnpm --filter @commerce/api prisma:migrate:deploy`.
5. Set the four `SEED_*` variables and run `pnpm --filter @commerce/api prisma:seed`.
6. Run `pnpm --filter @commerce/api dev`.

The API defaults to `http://localhost:4000/api/v1`. Swagger is available at
`http://localhost:4000/docs` when `SWAGGER_ENABLED=true`.

## Health checks

- `GET /api/v1/health/live` confirms that the process can serve traffic.
- `GET /api/v1/health/ready` verifies that PostgreSQL is reachable.

The process may be alive while readiness is failing. This allows an orchestrator to keep
diagnostic access while removing an unhealthy instance from service.

## Authentication

Customer and administrator sessions use short-lived JWT access cookies, rotating opaque
refresh tokens, and double-submit CSRF protection. See
[`docs/AUTHENTICATION.md`](../../docs/AUTHENTICATION.md) for endpoints, security behavior,
mail configuration, migrations, and seed accounts.

## Catalog and inventory

The API provides public catalog reads plus administrator category, brand, product, variant,
image, and inventory operations. See [`docs/CATALOG.md`](../../docs/CATALOG.md) for endpoints,
business invariants, Cloudinary configuration, and sample catalog data.

## Cart and wishlist

The API persists separate guest/customer shopping bags and wishlists, reconciles live pricing and
stock, and atomically merges guest data after authentication. See
[`docs/CART_AND_WISHLIST.md`](../../docs/CART_AND_WISHLIST.md) for endpoints, cookie security,
business rules, migration, and verification.

## Checkout and orders

The API supports coupons, all Egyptian governorates, serializable COD/manual InstaPay checkout,
immutable orders, audited lifecycle changes, manual payment confirmation, and invoice snapshots.
See [`docs/CHECKOUT_ORDERS.md`](../../docs/CHECKOUT_ORDERS.md).

## Customer account

The API provides owner-scoped saved-address CRUD, atomic default-address management, and paginated
customer order history. See [`docs/CUSTOMER_ACCOUNT.md`](../../docs/CUSTOMER_ACCOUNT.md) for
invariants, endpoints, migration, seed behavior, and verification.

## Admin operations

The API exposes an administrator analytics read model alongside secure order, coupon, shipping,
catalog, inventory, and customer management. See
[`docs/ADMIN_DASHBOARD.md`](../../docs/ADMIN_DASHBOARD.md) for metric definitions and workflows.

## Store settings and communication

The API provides public store configuration, secure settings/social/banner administration, a
rate-limited persisted contact inbox, dynamic InstaPay details, and account/contact/order email
delivery. See [`docs/STORE_SETTINGS_AND_CONTACT.md`](../../docs/STORE_SETTINGS_AND_CONTACT.md).

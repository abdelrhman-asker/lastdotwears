# Application Architecture

## 1. Goals

The system is designed for an Egyptian fashion retailer with EGP pricing, configurable
domestic shipping fees, cash on delivery, and manually verified InstaPay payments. It
uses one repository while keeping the web app, API, database, image storage, and reverse
proxy as independently deployable boundaries.

The first release is a modular monolith. This is simpler to operate on a VPS than a set
of microservices, while feature boundaries and repository abstractions allow a heavily
used module to be extracted later without redesigning the product.

## 2. Deployment topology

```text
Browser
   |
   v
Nginx (TLS termination, compression, security headers, request limits)
   |----------------------------|
   v                            v
Next.js web container       NestJS API container
                                |          |
                                v          v
                         PostgreSQL   Upload volume
```

Only Nginx publishes HTTP/HTTPS ports. PostgreSQL remains on the private Docker network.
The API exposes health endpoints for container orchestration. Persistent database data and
uploaded media use separate named Docker volumes.

## 3. Repository structure

```text
.
|-- apps/
|   |-- api/
|   |   |-- prisma/
|   |   |   |-- migrations/
|   |   |   |-- schema.prisma
|   |   |   `-- seed.ts
|   |   |-- src/
|   |   |   |-- common/
|   |   |   |   |-- constants/
|   |   |   |   |-- decorators/
|   |   |   |   |-- filters/
|   |   |   |   |-- guards/
|   |   |   |   |-- interceptors/
|   |   |   |   |-- pipes/
|   |   |   |   |-- types/
|   |   |   |   `-- utils/
|   |   |   |-- config/
|   |   |   |-- database/
|   |   |   |   `-- prisma/
|   |   |   |-- modules/
|   |   |   |   |-- addresses/
|   |   |   |   |-- analytics/
|   |   |   |   |-- auth/
|   |   |   |   |-- brands/
|   |   |   |   |-- cart/
|   |   |   |   |-- categories/
|   |   |   |   |-- contact/
|   |   |   |   |-- coupons/
|   |   |   |   |-- health/
|   |   |   |   |-- inventory/
|   |   |   |   |-- mail/
|   |   |   |   |-- orders/
|   |   |   |   |-- payments/
|   |   |   |   |-- products/
|   |   |   |   |-- settings/
|   |   |   |   |-- shipping/
|   |   |   |   |-- uploads/
|   |   |   |   |-- users/
|   |   |   |   `-- wishlist/
|   |   |   |-- app.module.ts
|   |   |   `-- main.ts
|   |   `-- test/
|   `-- web/
|       |-- public/
|       |-- src/
|       |   |-- app/
|       |   |   |-- (account)/
|       |   |   |-- (auth)/
|       |   |   |-- (shop)/
|       |   |   `-- admin/
|       |   |-- components/
|       |   |   |-- admin/
|       |   |   |-- commerce/
|       |   |   |-- layout/
|       |   |   |-- shared/
|       |   |   `-- ui/
|       |   |-- features/
|       |   |-- hooks/
|       |   |-- lib/
|       |   |-- providers/
|       |   |-- styles/
|       |   `-- types/
|       `-- tests/
|-- packages/
|   |-- api-client/
|   `-- shared/
|-- docs/
|-- infra/
|   |-- docker/
|   `-- nginx/
|-- scripts/
|-- package.json
|-- pnpm-workspace.yaml
`-- tsconfig.base.json
```

Feature-specific directories are populated only when their module is implemented. This
avoids placeholder code being mistaken for a completed capability.

## 4. Backend design

### Module anatomy

Every business module follows the same internal layout when applicable:

```text
modules/products/
|-- controllers/       # HTTP transport only; public and admin controllers are separate
|-- dto/               # validated request/response shapes
|-- entities/          # domain models and invariants
|-- interfaces/        # ports used across boundaries
|-- repositories/      # repository contract and Prisma adapter
|-- services/          # application use cases and transactions
`-- products.module.ts # explicit NestJS wiring
```

Controllers never call Prisma directly. They validate and authorize a request, invoke a
service use case, and serialize its response. Services depend on repository contracts.
Prisma-backed implementations remain replaceable and transactions are owned by the
application service that defines the business operation.

### Module responsibilities

| Module                  | Responsibility                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `auth`                  | Registration, login, refresh-token rotation, logout, verification, password reset, and admin login.       |
| `users`                 | Customer/admin identities, profiles, roles, blocking, and customer administration.                        |
| `addresses`             | Egyptian delivery addresses owned by customers.                                                           |
| `products`              | Product content, variants, visibility, search inputs, sorting, and catalog reads.                         |
| `inventory`             | Variant stock, reservations, adjustments, and auditable inventory movements.                              |
| `categories` / `brands` | Catalog taxonomy and administration.                                                                      |
| `cart` / `wishlist`     | Guest-to-customer cart merge, persistent carts, quantities, and saved products.                           |
| `coupons`               | Coupon eligibility, validity windows, usage limits, and discount calculation.                             |
| `shipping`              | Configurable fees and shipping calculation by Egyptian governorate/zone.                                  |
| `checkout`              | Validates a cart and coordinates pricing, stock reservation, address, payment choice, and order creation. |
| `orders`                | Immutable order snapshots, lifecycle transitions, history, and invoices.                                  |
| `payments`              | COD records and manual InstaPay proof/confirmation workflow. No gateway is included.                      |
| `uploads`               | Validated local image persistence, serving, deletion, and product media metadata.                         |
| `settings`              | Store identity, InstaPay details, social links, banners, and operational settings.                        |
| `analytics`             | Admin revenue, order/customer counts, and best-seller read models.                                        |
| `contact` / `mail`      | Contact submissions and transactional email delivery.                                                     |
| `health`                | Liveness and dependency-readiness probes.                                                                 |

Public endpoints and admin endpoints use separate controllers even when they share a
service. Admin routes are under `/api/v1/admin` and require both authentication and an
allowed role.

### API conventions

- Base path: `/api/v1`.
- JSON request and response bodies; consistent success pagination and RFC 9457-style
  problem responses for errors.
- Cursor or page-based pagination is chosen per resource and capped server-side.
- Idempotency keys protect checkout/order creation from duplicate submission.
- Swagger is generated from DTOs and served only according to environment policy.
- Dates are ISO 8601 UTC. Money is stored as integer Egyptian piasters, never floating
  point values.

## 5. Frontend design

Next.js App Router route groups isolate shop, authentication, account, and admin layouts
without changing public URLs. Server Components render catalog and SEO-critical content.
Client Components are limited to interactive surfaces such as filters, cart controls,
forms, and admin tables.

Each feature uses this shape when applicable:

```text
features/products/
|-- api/          # calls through the generated API client
|-- components/   # feature-owned presentation
|-- hooks/        # TanStack Query hooks and mutations
|-- schemas/      # Zod form/search schemas
|-- types/        # frontend-only view types
`-- utils/        # feature-local pure helpers
```

`components/ui` contains shadcn/ui primitives. Business behavior never lives in those
primitives. React Hook Form and Zod handle interactive form state and validation.
TanStack Query owns client-side server state; Next.js caching owns server-rendered catalog
reads. Query keys are centralized and mutations invalidate the narrowest affected scope.

Guest cart and wishlist identifiers use secure, same-site cookies. Auth tokens are never
stored in `localStorage`. The API issues a short-lived access token and a rotating refresh
token through secure, HTTP-only cookies; state-changing requests include CSRF protection.

## 6. Core domain decisions

### Product and inventory model

A product owns descriptive content and one or more variants. Each variant represents an
actual sellable size/color combination and owns its SKU, price override if needed, and
stock quantity. Available sizes/colors are derived from active variants. This prevents an
invalid cart combination such as a color and size that is not actually stocked.

Product prices and order totals use integer piasters. Product media stores server-file
identifiers, public URLs, dimensions, alternative text, sort order, and a primary flag.
Deleting a product is soft by default so historical order lines and analytics remain
valid.

### Order snapshot

An order stores immutable snapshots of customer contact details, delivery address,
product names, SKUs, variants, prices, discounts, shipping, and totals. Later edits to a
product or address cannot change a placed order.

Allowed status transitions are enforced by one domain policy:

```text
COD:      Pending -> Processing -> Shipped -> Delivered
InstaPay: Waiting for Payment -> Paid -> Processing -> Shipped -> Delivered

Pending / Waiting for Payment / Paid / Processing -> Cancelled
Paid / Processing / Shipped / Delivered          -> Refunded (admin policy applies)
```

Payment status is recorded separately from fulfillment status even though the public
order status exposes the requested states. Manual InstaPay confirmation records the admin,
timestamp, reference/note, and previous state in an audit event.

### Checkout transaction

The API, not the browser, recalculates all prices. In one controlled transaction it:

1. loads current active variants and locks/checks stock;
2. validates the coupon and shipping rule;
3. creates immutable order and order-item snapshots;
4. reserves/decrements stock using the configured inventory policy;
5. creates the COD or InstaPay payment record;
6. clears the cart only after order creation succeeds.

Emails and other non-critical side effects are dispatched after the database transaction.

## 7. Security baseline

- Argon2id password hashing with a configurable work factor.
- Short-lived JWT access tokens, rotated refresh tokens stored as hashes, session
  revocation, and role/permission guards.
- HTTP-only, `Secure`, `SameSite` cookies plus CSRF protection for cookie-authenticated
  mutations.
- Global DTO validation with unknown-field rejection and transformed input types.
- Helmet, strict origin-based CORS, endpoint-specific throttling, body-size limits, and
  decoded image type/size validation.
- Generic authentication/reset responses to reduce account enumeration.
- One-time, expiring hashes for email verification and password reset tokens.
- Customer block checks on every authenticated session refresh and checkout.
- Structured audit events for admin authentication, order changes, refunds, inventory,
  settings, and payment confirmation.
- Secrets are injected through environment variables and never baked into images.

## 8. SEO and performance

- Dynamic product/category metadata, canonical URLs, Open Graph images, sitemap, and
  robots rules are generated by Next.js metadata APIs.
- Product structured data uses schema.org JSON-LD.
- Catalog pages render on the server with bounded revalidation; inventory and cart data
  remain uncached or user-scoped.
- Next/Image serves responsive server-hosted assets with explicit dimensions.
- Search/filter state stays in the URL for shareable and crawl-safe listing pages.
- Database indexes cover slugs, active/featured flags, category/brand relations, order
  ownership/status/created time, variant SKU, and common catalog sort fields.
- Expensive admin summaries use optimized aggregate queries and can move to cached read
  models when traffic justifies it.

## 9. Configuration boundaries

Environment variables are split by ownership:

- Web: public site/API origins and server-only API origin.
- API: database, JWT/cookie, CORS, email, upload root, Swagger, and bootstrap seed values.
- Infrastructure: ports, image tags, database credentials, domains, and TLS paths.

Each application validates its environment at startup with Zod (web) or Nest-compatible
schema validation (API). Example files will contain safe placeholders only.

## 10. Testing strategy

- Unit tests cover domain policies, pricing, coupons, shipping, status transitions, and
  services with repository doubles.
- API integration tests run against PostgreSQL and verify authorization, transactions,
  repository behavior, and validation.
- End-to-end browser tests cover registration/login, browsing, cart, both checkout paths,
  account orders, and core admin operations.
- Production builds, linting, type checking, Prisma migration checks, and tests form the
  CI quality gate.

## 11. Incremental delivery sequence

Modules will be implemented and reviewed in dependency order:

1. Foundation: workspace applications, configuration, PostgreSQL/Prisma, health, error
   handling, logging, Swagger, and test harness.
2. Authentication and users, including roles, secure sessions, verification/reset, and
   seed accounts.
3. Catalog: categories, brands, products, variants, inventory, local image uploads, and
   sample product seed data.
4. Storefront catalog: home, listings, details, search/filter/sort, metadata, and static
   content pages.
5. Wishlist and cart.
6. Coupons, shipping, checkout, payments, orders, and invoices.
7. Customer profile, addresses, and order history.
8. Admin dashboard and management interfaces.
9. Contact, settings, banners, social/store information, and email completion.
10. Docker images, Compose, Nginx, production hardening, deployment documentation, and
    final end-to-end verification.

Each numbered item is a review gate. No later business module should bypass the public
contracts established by an earlier approved module.

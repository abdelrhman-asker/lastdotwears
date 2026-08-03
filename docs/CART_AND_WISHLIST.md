# Cart and wishlist module

Module 5 implements persistent guest and customer shopping bags, saved products, automatic
guest-to-account merging, and the matching responsive storefront interfaces.

## Ownership and persistence

`Cart` and `Wishlist` each belong to exactly one authenticated user or one guest token. Database
check constraints enforce that exclusive ownership rule, while unique indexes prevent a customer
or guest from acquiring duplicate containers. Cart items are unique by variant; wishlist items are
unique by product.

Guests receive separate `guest_cart` and `guest_wishlist` cookies only when the first item is
created. Each cookie contains 256 bits of random entropy, is HTTP-only, `SameSite=Lax`, scoped to
the site root, and is `Secure` in production. Only the SHA-256 digest is stored in PostgreSQL.
Guest records expire after `GUEST_SESSION_TTL_DAYS` (90 by default).

After customer login or registration, the next cart or wishlist read merges any guest collection
into the customer's collection in a serializable transaction. Duplicate cart quantities are
combined and capped at 99; duplicate wishlist products are de-duplicated. The guest row and cookie
are removed only after a successful merge. Customer logout clears user-scoped commerce data from
the TanStack Query cache before another browser user can see it.

## Cart rules

- A cart contains actual product variants, so every line has a valid size/color/SKU combination.
- Quantities are integers from 1 through 99 and cannot exceed the current variant stock when an
  item is added or changed.
- Cart reads always calculate the live effective unit price: variant override, then product sale
  price, then regular price.
- Products and variants that become inactive, out of stock, or lower in stock remain visible with
  an issue code so the customer can correct the bag.
- Adding to a cart does not reserve inventory. Checkout validates and decrements stock atomically
  when an order is placed, as documented in `CHECKOUT_ORDERS.md`.
- Coupons, shipping, payment, and order creation are owned by the checkout module. The bag exposes
  its live merchandise subtotal and links into that authenticated flow.

## REST API

All paths are relative to `/api/v1` and are documented in Swagger at `/docs` when enabled.

Cart endpoints:

- `GET /cart`
- `POST /cart/items` with `{ "variantId": "uuid", "quantity": 1 }`
- `PATCH /cart/items/:variantId` with `{ "quantity": 2 }`
- `DELETE /cart/items/:variantId`
- `DELETE /cart/items`

Wishlist endpoints:

- `GET /wishlist`
- `POST /wishlist/items` with `{ "productId": "uuid" }`
- `DELETE /wishlist/items/:productId`

The endpoints accept either a valid customer access session or the matching guest cookie. An
expired or malformed access token receives `401`, allowing the web API client to perform its normal
refresh flow instead of silently treating the request as a guest. Cookie-authenticated mutations
retain the application's double-submit CSRF protection.

## Storefront behavior

- Header counters expose the live bag quantity and wishlist product count.
- Product cards and product details can save or remove wishlist products.
- The product detail purchase panel requires a live color/size variant, disables zero-stock
  options, bounds quantity by current stock, and adds the selection to the bag.
- `/cart` supports quantity changes, item removal, clearing, live pricing, unavailable-item
  warnings, and an order summary.
- `/wishlist` shows saved products, live prices and availability, removal, and links back to product
  options.
- Both personal routes use `noindex` metadata and all mutations update only the relevant TanStack
  Query cache.

## Migration and configuration

Apply the included `20260802183500_cart_wishlist` migration from the repository root:

```powershell
corepack pnpm --filter @commerce/api prisma:migrate:deploy
```

Configure the retention window in `apps/api/.env`:

```dotenv
GUEST_SESSION_TTL_DAYS=90
```

Production operations should periodically remove expired guest cart and wishlist rows. Foreign-key
cascades remove their item rows automatically.

## Verification

The API test suite covers pricing precedence, stock validation, stale-line reporting, merging,
wishlist availability, identity-cookie security, validation, and anonymous empty states. Web tests
cover product merchandising, selection requirements, zero-stock blocking, validation, and catalog
query behavior. Module acceptance also includes Prisma formatting/validation/generation, strict
TypeScript, ESLint, production builds, and live anonymous route/Swagger smoke checks.

Database-backed mutation smoke tests require the configured project PostgreSQL role and database;
run them in the deployment environment after applying migrations and seed data.

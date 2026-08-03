# Checkout, payments, and orders module

Module 6 implements server-authoritative checkout pricing, Egyptian governorate shipping,
coupons, COD and manual InstaPay payments, immutable orders, audited status transitions,
inventory changes, and printable customer invoices.

## Checkout boundaries

Checkout requires an active, email-verified customer session. A guest cart cookie is merged into
the authenticated cart before quoting or placement, so signing in does not lose the customer's
selection. The API never trusts totals sent by the browser.

`POST /api/v1/checkout/quote` recalculates:

1. current active variants and effective prices;
2. requested quantities against current stock;
3. coupon state, dates, minimum, global usage, and per-customer usage;
4. the active shipping rate for the Egyptian governorate;
5. subtotal, discount, shipping, and total in integer piasters.

`POST /api/v1/checkout/orders` repeats every check inside a serializable PostgreSQL transaction.
It creates the order snapshots and payment, atomically decrements stock, appends inventory SALE
movements, records coupon redemption, and clears the cart only after success.

The required UUID `idempotencyKey` is unique per customer. Repeating a completed request returns
the original order even after its cart has been cleared. Serializable transaction conflicts are
retried up to three times; unresolved stock or pricing races return a conflict for customer review.

## Money and snapshots

All amounts use integer Egyptian piasters. Effective item price precedence is variant override,
product sale price, then regular product price. Percentage discounts round down to a whole piaster,
respect their configured maximum, and can never exceed the merchandise subtotal.

Orders snapshot customer contact, delivery address, governorate/rate, coupon code, product name and
slug, SKU, size, color, image URL, unit price, quantity, every total, and the payment method. Later
catalog, address, coupon, or shipping edits cannot change an existing order or invoice.

Database constraints enforce non-negative amounts, quantity limits, total arithmetic, coupon
value/date/usage rules, shipping delivery ranges, and unique order/invoice/idempotency identifiers.

## Payment methods

### Cash on delivery

COD orders start at `PENDING` with a `PENDING` payment. Delivery marks the payment `PAID`. No card
or gateway integration is present.

### Manual InstaPay

InstaPay orders start at `WAITING_FOR_PAYMENT`. The order response displays the exact total,
InstaPay ID, instructions, order-number reference, and a locally generated PNG QR data URL. The QR
encodes the configured InstaPay value; no third-party QR service receives order information.

Only an authenticated administrator can call the confirmation endpoint. Confirmation records the
administrator, timestamp, optional transfer reference/note, updates payment to `PAID`, and moves the
order to `PAID` in the same transaction.

Configure:

```dotenv
ORDER_NUMBER_PREFIX=LDW
INSTAPAY_ID=lastdotwears@instapay
INSTAPAY_QR_VALUE=
INSTAPAY_INSTRUCTIONS=Transfer the exact order total, include your order number, then wait for confirmation.
```

`INSTAPAY_QR_VALUE` defaults to `INSTAPAY_ID` when omitted. Replace the sample ID before accepting
real customer payments.

## Status policy

The API enforces these transitions centrally:

```text
COD:      Pending -> Processing -> Shipped -> Delivered
InstaPay: Waiting for Payment -> Paid -> Processing -> Shipped -> Delivered

Pending / Waiting for Payment / Paid / Processing -> Cancelled
Paid / Processing / Shipped / Delivered          -> Refunded
```

Cancellation restores inventory exactly once and appends RELEASE movements. Refunds can optionally
restock items and append RETURN movements. A paid cancellation records the payment as refunded; a
delivered COD order records it as paid. Every transition stores the actor, previous/new status,
note, and timestamp. Optimistic status guards prevent concurrent administrators from applying the
same transition twice.

## REST API

Customer endpoints:

- `GET /shipping/rates`
- `POST /checkout/quote`
- `POST /checkout/orders`
- `GET /orders/:orderNumber`
- `GET /orders/:orderNumber/invoice`

Administrator endpoints:

- `/admin/coupons`: list, read, create, update, and delete unused coupons
- `/admin/shipping/rates`: list, create, update, and delete unused rates
- `GET /admin/orders` and `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status`
- `POST /admin/orders/:id/confirm-instapay`

Used coupons and shipping rates must be deactivated instead of deleted to preserve order history.
All admin mutations require role authorization and the existing double-submit CSRF token.

## Storefront routes

- `/checkout` — contact, Egyptian delivery address, coupon, live summary, and payment selection
- `/orders/:orderNumber` — status, payment instructions, items, totals, and delivery snapshot
- `/orders/:orderNumber/invoice` — authenticated printable invoice

These personal routes are `noindex`. Customer order lists, saved addresses, and checkout address
prefill are documented in [`CUSTOMER_ACCOUNT.md`](CUSTOMER_ACCOUNT.md). Administrator order,
payment, coupon, shipping, invoice, and analytics interfaces are documented in
[`ADMIN_DASHBOARD.md`](ADMIN_DASHBOARD.md).

## Migration and seed

Apply migration `20260802203903_checkout_orders` and rerun the idempotent seed:

```powershell
corepack pnpm --filter @commerce/api prisma:migrate:deploy
corepack pnpm --filter @commerce/api prisma:seed
```

The seed supplies all 27 Egyptian governorates with development shipping rates and the active
`WELCOME10` coupon (10%, EGP 1,000 minimum, EGP 500 maximum, once per customer). Existing coupon
usage and product stock are never reset by later seed runs.

## Verification

Automated coverage includes price precedence, percentage rounding/caps, fixed-discount bounds,
email verification, unavailable-cart blocking, idempotent replay, transition policy, protected
routes, and frontend checkout validation. Acceptance also includes Prisma schema/migration checks,
strict TypeScript, ESLint, optimized builds, Swagger inspection, and a database-backed lifecycle
test through guest merge, quote, InstaPay QR, idempotency, confirmation, cancellation, and stock
restoration.

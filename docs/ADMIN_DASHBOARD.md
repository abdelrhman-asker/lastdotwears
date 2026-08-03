# Admin dashboard and management interfaces

Module 8 completes the operational administrator experience over the secure APIs delivered by the
earlier catalog, inventory, customer, checkout, and order modules.

## Security boundary

Every route under `/api/v1/admin` requires an authenticated `ADMIN` session and CSRF proof for
unsafe methods. The web dashboard checks the current session and role before rendering its content,
clears all cached data on sign-out, and redirects invalid sessions to `/admin/login`.

The responsive admin shell groups navigation into overview, commerce, catalog, and people. Module 9
adds website settings and communication tools as a separate review gate.

## Analytics

`GET /api/v1/admin/analytics/dashboard?days=30` accepts reporting periods of 7, 30, 90, or 365
days and returns:

- paid revenue in integer piasters;
- order count and status distribution for the selected period;
- total customers and new customers in the period;
- five best-selling product snapshots by quantity; and
- six recent orders for operational follow-up.

Revenue counts only orders whose current payment state is `PAID`. Best sellers include fulfilled or
actively fulfilling sales (`PAID`, `PROCESSING`, `SHIPPED`, and `DELIVERED`) and exclude cancelled
or refunded orders. Product names and images come from immutable order-line snapshots, so deleted
catalog records do not erase historical reporting.

## Admin routes

- `/admin` - revenue, orders, customers, attention queue, best sellers, and recent orders
- `/admin/orders` - search plus order/payment status filters and pagination
- `/admin/orders/:id` - complete snapshot, status timeline, payment confirmation, audited
  transitions, optional refund restocking, and print invoice
- `/admin/coupons` - create, edit, filter, activate/deactivate, and delete unused coupons
- `/admin/shipping` - create, edit, activate/deactivate, and delete unused governorate rates
- `/admin/catalog/products` - existing product, variant, image, and visibility management
- `/admin/catalog/categories` and `/admin/catalog/brands` - existing taxonomy CRUD
- `/admin/inventory` - existing stock search, low-stock filtering, and audited adjustments
- `/admin/customers` - existing customer search, blocking, and unblocking

The order detail screen exposes only transitions allowed by the same policy enforced by the API.
Waiting InstaPay orders cannot enter processing until an administrator confirms payment. Cancelling
restores inventory automatically; refunds can optionally return items to stock.

Used coupons and shipping rates remain protected by the API and must be deactivated instead of
deleted. All prices are displayed as EGP while API writes continue to use integer piasters.

## Database migration

Migration `20260803020000_admin_analytics_indexes` adds the order creation-time index used by
period summaries and recent-order reads. Deploy it before starting the API:

```bash
corepack pnpm --filter @commerce/api prisma:migrate:deploy
```

## Verification

Module coverage includes analytics window calculation, protected dashboard access, mirrored order
transition presentation, all previous transactional order tests, strict TypeScript, zero-warning
ESLint, Prettier, Jest, Supertest, and Vitest suites, optimized builds, Swagger inspection, and
database-backed administrator dashboard reads.

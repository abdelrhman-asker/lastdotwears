# Web application

Next.js 15 App Router application for the storefront, customer account, and admin panel.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. From the repository root, run `pnpm install`.
3. Run `pnpm --filter @commerce/web dev`.

The application defaults to `http://localhost:3000`. The route `/health` provides a
lightweight process health response for Docker and Nginx checks.

The application includes the customer authentication/account surfaces, secure catalog admin,
public storefront catalog, and persistent cart/wishlist experiences. See
[`docs/STOREFRONT.md`](../../docs/STOREFRONT.md) for public routes, rendering strategy, and SEO,
and [`docs/CART_AND_WISHLIST.md`](../../docs/CART_AND_WISHLIST.md) for commerce state and UI
behavior.

The customer checkout, COD/InstaPay confirmation, and printable invoice routes are documented in
[`docs/CHECKOUT_ORDERS.md`](../../docs/CHECKOUT_ORDERS.md).

The shared customer account shell, saved-address manager, checkout prefill, and complete order
history are documented in [`docs/CUSTOMER_ACCOUNT.md`](../../docs/CUSTOMER_ACCOUNT.md).

The responsive administrator dashboard, order/payment operations, printable invoices, coupons,
shipping, and unified navigation are documented in
[`docs/ADMIN_DASHBOARD.md`](../../docs/ADMIN_DASHBOARD.md).

Database-managed announcements, contact details, social links, payment availability, homepage
banners, the contact form/inbox, and the settings workspace are documented in
[`docs/STORE_SETTINGS_AND_CONTACT.md`](../../docs/STORE_SETTINGS_AND_CONTACT.md).

# PostHog Cloud analytics

The storefront uses `posthog-js` for consent-gated product analytics and optional session replay.
It does not add a database, backend SDK, or in-site analytics dashboard. PostHog is dynamically
loaded only in production, only when all required public environment variables exist, and only
after the visitor accepts optional analytics. Administration routes are excluded.

The production analytics destination is EU Cloud project `340109`. The numeric project ID is used
only in the PostHog administration interface; the browser SDK reads its public project token from
the production environment.

## Create the free PostHog Cloud project

1. Create an account at <https://posthog.com/signup> and choose the free Cloud plan.
2. Select the EU or US region appropriate for the store's privacy requirements. Keep the ingestion
   host shown during setup (`https://eu.i.posthog.com` or `https://us.i.posthog.com`).
3. Create a Web/Next.js project for `https://www.last-dot.com`.
4. Copy the public project token (normally beginning with `phc_`). Never use a PostHog personal API
   key in the website.
5. In Session Replay settings, enable replay for the project and add `https://www.last-dot.com` as
   an authorized domain if that setting is present. The application still starts replay only after
   the visitor separately opts in.

## Environment

The web build requires these public values:

```dotenv
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_POSTHOG_KEY=phc_your_public_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Set `NEXT_PUBLIC_ANALYTICS_ENABLED=false` for an immediate deployment-wide kill switch. Analytics
is also disabled outside production. These are public build-time values, not secrets.

## Data and privacy behavior

- `$pageview` is sent once per App Router URL change. It contains the pathname, page title, a
  query-free referrer, and only the five standard `utm_*` campaign parameters from the URL.
- PostHog supplies its normal browser/device, session, and anonymous distinct identifiers after
  consent. A customer is identified with only the stable internal user ID. Logout calls `reset()`.
- A delegated `link_clicked` event records a safe destination (origin/path only), a short element
  label, internal/external status, and current pathname. Consent-gated button autocapture and
  heatmap collection run only on public storefront routes. Sensitive routes and custom-tracked
  controls are excluded to avoid leaking customer data or duplicating semantic events.
- Typed commerce events are sent only after their corresponding API mutation succeeds. Prices are
  converted from integer piasters to EGP by dividing by 100.
- Session replay is a separate, initially unchecked choice. All text and inputs are masked, URL
  query strings are removed, and replay is stopped for authentication, checkout, account, order,
  and admin routes. Upload contents and network bodies are not captured.
- The `Privacy choices` button remains available after a decision. Rejecting or withdrawing consent
  stops replay and opts the browser out of PostHog persistence and capture.

No email, name, phone, address, form value, payment information, receipt content, password, token,
or session cookie is included in custom analytics properties.

## Dashboard setup

In PostHog, create a dashboard named **Last Dot Wears — Storefront** and add these insights:

| Tile                  | Suggested insight                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Total page views      | Trends: `$pageview`, total count                                                                                                   |
| Unique visitors       | Trends: `$pageview`, unique users                                                                                                  |
| Most visited pages    | Data table: `$pageview`, breakdown by `$pathname`                                                                                  |
| Most viewed products  | Data table: `product_viewed`, breakdown by `product_name`                                                                          |
| Product click-through | Funnel: `product_clicked` → `product_viewed`, breakdown by `product_name`                                                          |
| Add to cart           | Trends: `add_to_cart`, total and unique users                                                                                      |
| Wishlist              | Trends: `add_to_wishlist` and `remove_from_wishlist`                                                                               |
| Checkout starts       | Trends: `checkout_started`, unique users                                                                                           |
| Completed purchases   | Trends: `purchase_completed`; sum `total_egp` for observed revenue                                                                 |
| Conversion funnel     | Funnel: `$pageview` (product path) → `product_viewed` → `add_to_cart` → `checkout_started` → `order_placed` → `purchase_completed` |
| Traffic sources       | `$pageview` broken down by `$referring_domain`, `utm_source`, or `utm_campaign`                                                    |
| New vs returning      | Retention or lifecycle insight based on `$pageview`                                                                                |
| Top clicked links     | Data table: `link_clicked`, breakdown by `link_id` or `destination`                                                                |

Open **Session Replay** to view recordings from visitors who opted in. Filter out paths if project
settings add broader rules in the future. To inspect a journey, open **People**, search for the
anonymous PostHog distinct ID or the authenticated internal user ID, and open that person's activity
or a related event. An anonymous ID identifies a browser profile, not a known real person.

In **Data management → Heatmaps**, enable heatmap capture and select up to three free-plan URLs.
Recommended initial entries are `https://www.last-dot.com/`,
`https://www.last-dot.com/products/*`, and `https://www.last-dot.com/categories/*`. The application
CSP permits PostHog's EU CDN/ingestion endpoints, replay workers, and `https://eu.posthog.com` as a
frame ancestor so the hosted heatmap viewer can display the production storefront. Admin and
sensitive customer routes remain excluded in application code.

## Verification checklist

Use a production build or a staging deployment with production mode. In a clean browser profile:

1. Before choosing, confirm the Network panel contains no requests to the configured PostHog host
   and no PostHog cookie/local-storage key. Reject, reload, and confirm there are still no events.
2. Accept analytics without replay. In PostHog Live Events, confirm one `$pageview` on load and one
   for each client-side navigation, with no event from link prefetching.
3. Open product cards and product detail pages; confirm `product_clicked` then `product_viewed` with
   the expected product ID and EGP price. Submit search and visit a category.
4. Add/remove cart and wishlist items. Confirm events appear only after successful API responses.
5. Open checkout and place a test order. Confirm one `checkout_started` and one `order_placed`.
   Confirm `purchase_completed` only after the returned order payment status is `PAID`.
6. Sign in and confirm subsequent events use the internal user ID. Sign out, then confirm a new
   anonymous distinct ID is used and the previous account identity does not leak.
7. Enable replay in Privacy choices. Confirm a public storefront recording begins, all text/inputs
   are masked, and recording stops when navigating to checkout, account, orders, auth, or admin.
8. Withdraw consent and confirm event requests and replay stop. Reopen Privacy choices to opt in
   again if needed.

PostHog Live Events can be delayed briefly. Browser tracking blockers may intentionally block the
vendor; analytics failure is swallowed and never blocks rendering or commerce operations.

## Production deployment

The repository does not currently contain the `deploy.js` mentioned in the hosting brief; its
checked-in production path is `compose.yaml` plus `scripts/deploy.sh`. Both the Docker build and
runtime wiring now accept the three variables above. Do not run the Prisma seed for this change.

For the current HidenCloud deployment, add the variables to HidenCloud's production environment
configuration (or the existing uncommitted `.env.production`, without replacing the file). Because
`NEXT_PUBLIC_*` values are embedded by Next.js, rebuild the web image/application rather than only
restarting it:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @commerce/web build
```

If HidenCloud invokes an external `deploy.js`, keep its existing process and ensure it forwards the
three variables during the Next.js build. If the checked-in Compose flow is the deployed process,
use the existing reviewed deployment command:

```sh
./scripts/deploy.sh
```

No Cloudflare Tunnel, Neon, Prisma schema, API, upload, or database changes are required. After the
health checks pass, perform the consent and Live Events smoke checks above on
`https://www.last-dot.com`.

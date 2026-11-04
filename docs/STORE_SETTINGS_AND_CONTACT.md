# Store settings, communication, and merchandising

Module 9 replaces deployment-time storefront copy with administrator-managed store configuration
and completes customer-care and transactional email workflows.

## Persisted configuration

`website_settings` is a singleton record containing store identity, contact details, business
hours, announcement content, enabled checkout methods, and manual InstaPay instructions. The API
uses validated environment values as a read-only fallback if the seed has not run; public GET
requests never create database records.

At least one of cash on delivery or InstaPay must remain enabled. Checkout enforces the same rule
server-side, and waiting InstaPay orders resolve the current ID, QR payload, and instructions from
the database. Existing order totals and payment-method snapshots remain immutable.

Social links are ordered, independently enabled records. Homepage banners contain accessible image
text, CTA content, an ordering position, and optional UTC start/end times. Public reads return only
active banners inside their schedule. Server uploads use the same signature, size, and content
validation as product imagery; root-relative bundled images remain supported for the seeded hero.

## Contact workflow

`POST /api/v1/contact` accepts a name, email, optional phone/order number, subject, and message. It
is public, globally validated, and additionally limited to five requests per hour by the API rate
limiter. The message is committed before email is attempted, so an SMTP failure cannot discard a
customer request.

Customer care receives a notification with a safe reply-to address, while the customer receives an
acknowledgement. Administrators use `/admin/messages` to search and paginate the inbox, record an
internal note, and move messages through `NEW`, `IN_PROGRESS`, `RESOLVED`, or `SPAM`. The first
resolution stores a timestamp.

Order placement and administrator status transitions now send transactional emails. Idempotent
checkout replays never send a duplicate placement email. Mail delivery errors are redacted and
logged after the database transaction instead of changing a valid commerce result.

## API routes

Public:

- `GET /api/v1/settings`
- `POST /api/v1/contact`

Administrator:

- `GET|PATCH /api/v1/admin/settings`
- `GET|POST /api/v1/admin/settings/social-links`
- `PATCH|DELETE /api/v1/admin/settings/social-links/:id`
- `GET|POST /api/v1/admin/settings/banners`
- `PATCH|DELETE /api/v1/admin/settings/banners/:id`
- `POST /api/v1/admin/settings/banner-images`
- `GET /api/v1/admin/contact-messages`
- `GET|PATCH /api/v1/admin/contact-messages/:id`

All administrator mutations require an authenticated `ADMIN` cookie session and double-submit CSRF
proof. Sensitive settings, social-link, and banner changes also emit actor-linked audit events
without recording payment values. Swagger documents request validation and responses.

## Storefront and admin behavior

The shared announcement, contact page, footer identity/social links, checkout payment choices, and
home hero read the public settings projection. Next.js retains a safe local fallback and revalidates
server reads every five minutes, keeping builds useful during temporary API outages.

The admin panel adds `/admin/settings` for store/payment, social, banner, schedule, and image
management, plus `/admin/messages` for customer-care triage. Admin routes remain `noindex,nofollow`.

## Migration and seed

Apply migration `20260803030000_store_settings_and_contact`, then run the idempotent seed:

```bash
corepack pnpm --filter @commerce/api prisma:migrate:deploy
corepack pnpm --filter @commerce/api prisma:seed
```

The seed creates settings, three placeholder social profiles, and the bundled editorial hero only
when they do not already exist. Re-running it preserves administrator edits.

## Production email

Local development may use `MAIL_TRANSPORT=log`. Production environment validation requires
`MAIL_TRANSPORT=smtp`, `SMTP_HOST`, a valid sender, and paired SMTP credentials when authentication
is used. Module 10 supplies the final VPS environment and secret-management checklist.

## Verification

Coverage includes payment-method invariants, banner schedule validation, persisted contact behavior
during SMTP failure, resolution timestamps, contact-form validation, protected administration
routes, invalid public submissions, strict formatting/types/lint, optimized builds, Swagger, and
database-backed live acceptance.

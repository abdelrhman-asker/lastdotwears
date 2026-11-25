# Production deployment runbook

## Northflank Developer Sandbox

Create both combined services from the same repository and branch. Use BuildKit, build context
`/`, target `runner`, one instance, 512 MB RAM, and 0.2 vCPU per service.

| Service       | Dockerfile             | HTTP port | Custom domain      |
| ------------- | ---------------------- | --------- | ------------------ |
| `lastdot-api` | `/apps/api/Dockerfile` | 4000      | `api.last-dot.com` |
| `lastdot-web` | `/apps/web/Dockerfile` | 3000      | `www.last-dot.com` |

Use `https://www.last-dot.com` as the canonical storefront. Configure the apex-to-WWW
redirect in Cloudflare, preserving the request path and query string.

Use [the API runtime template](../apps/api/.env.northflank.example) to configure the API. Keep the
existing cookie, JWT, and pepper secrets to preserve existing sessions and tokens.
Use the Neon pooled URL for the runner. Leave API build arguments empty. Use the shared SMTP host
shown in the Zoho account settings. Port 465 pairs with `SMTP_SECURE=true`. Port 587 pairs with
`SMTP_SECURE=false` and requires STARTTLS.
When `SMTP_SECURE` is unset or blank, the API selects implicit TLS on port 465 and STARTTLS on
other ports. The structured `mail.transport.initialized` event reports the selected mode.

Configure both mailbox logins on the API service before deployment.

| Variables | Value |
| --- | --- |
| `MAIL_TRANSPORT` | `smtp` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Existing Zoho host, port, and TLS mode |
| `SMTP_USER`, `SMTP_PASSWORD` | `orders@last-dot.com` and that mailbox's app password |
| `ORDER_NOTIFICATION_EMAIL` | `orders@last-dot.com` |
| `SUPPORT_SMTP_USER`, `SUPPORT_SMTP_PASSWORD` | `support@last-dot.com` and that mailbox's app password |
| `SUPPORT_MAIL_FROM_EMAIL`, `SUPPORT_NOTIFICATION_EMAIL` | `support@last-dot.com` for both |

Store both passwords as Northflank runtime secrets. Verify each mailbox's delivery independently.
An unusable mailbox is logged by channel while the other transport stays available.

Set these API runtime variables for the storefront:

```env
WEB_APP_URL=https://www.last-dot.com
CORS_ORIGINS=https://www.last-dot.com,https://last-dot.com
```

Set these build arguments on the web service:

```env
NEXT_PUBLIC_SITE_URL=https://www.last-dot.com
NEXT_PUBLIC_API_URL=https://api.last-dot.com/api/v1
NEXT_PUBLIC_CONTACT_EMAIL=support@last-dot.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<same-cloud-name-as-the-API>
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
INTERNAL_API_URL=http://lastdot-api:4000/api/v1
```

Set this runtime variable on the web service:

```env
INTERNAL_API_URL=http://lastdot-api:4000/api/v1
```

Set `CATALOG_REVALIDATION_SECRET` to the same server-only runtime secret on the API and web
services. Generate 32 random bytes encoded as 64 hexadecimal characters. Keep the API's
`WEB_APP_URL` set to the canonical storefront. The API calls
`POST /api/internal/catalog/revalidate` there after successful admin catalog writes. Allow that
server-to-server POST to reach Next.js through the storefront ingress. The endpoint accepts an
authenticated request for the catalog cache only.

The catalog keeps a five-minute revalidation interval as a fallback if the webhook is
unavailable. The default Northflank configuration uses one web instance. Use a shared Next.js
cache and tag invalidation across replicas before scaling the storefront horizontally.

The web image supplies `PORT=3000`, `HOSTNAME=0.0.0.0`, and `NODE_ENV=production`. The browser
calls the storefront's own `/api/v1` route. Next.js generates the rewrite at build time and
reads the runtime variable separately for server-rendered data. Rebuild when changing the
rewrite destination or public build arguments. Verify the internal address from the web service
before cutover. Compose continues to supply `http://api:4000/api/v1`.

Use `/api/v1/health/live` for API liveness, `/api/v1/health/ready` for API readiness, and
`/health` for web liveness and readiness. Check that the public storefront also returns
HTTP 200 on `/api/v1/health/live` to test the rewrite. Add the generated web origin to
`CORS_ORIGINS` only if browser smoke tests use it. Keep authenticated API traffic uncached.

### One-time administrator setup

The API defaults to `ADMIN_SETUP_ENABLED=false` with no `ADMIN_SETUP_SECRET`. To open setup
temporarily, set `ADMIN_SETUP_ENABLED=true` and set `ADMIN_SETUP_SECRET` to 64 hexadecimal
characters generated from 32 random bytes, for example with `openssl rand -hex 32`. Store
the value in Northflank's API runtime secrets. Include the storefront origin in `CORS_ORIGINS`.

Deploy the updated API and web services, then open `https://www.last-dot.com/admin/setup`.
Use `lastdotwears@gmail.com` after confirming you control that mailbox. A different existing
administrator is fine. An existing account with the intended email blocks setup. A successful
submission redirects to `/admin/login`. Verify you can sign in, set `ADMIN_SETUP_ENABLED=false`,
and remove `ADMIN_SETUP_SECRET` from the API runtime.

The account and its completion audit event are committed together. Preserve the
`ADMIN_SETUP_COMPLETED` audit row in backups and audit retention. It keeps the setup closed
across replicas and restarts, even if the account is later removed.

### Cloudinary media

Set these **API runtime** variables in Northflank. Set the same cloud name in the web build
arguments above and rebuild the web image before starting Cloudinary-backed uploads. The cloud
name is public. Keep the API key and secret in the API service runtime secrets.

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
UPLOAD_ROOT=/app/uploads
PRODUCT_IMAGE_MAX_BYTES=8000000
```

`STORAGE_PROVIDER=local` remains the default for local development and Compose. Cloudinary
mode writes new files to Cloudinary and can still read restored legacy files under `UPLOAD_ROOT`.
Use a Cloudinary product environment with dynamic folders and reserve the `lastdot/` namespaces
for this app. Keep public image delivery and on-demand transformations enabled for catalog media.

Public assets use `lastdot/products/<product-id>` and `lastdot/banners`. The app stores HTTPS
delivery URLs with one width limit per media kind (1200 px for products, 1600 px for banners),
`q_auto`, and `f_auto`. The browser requests these optimized URLs directly so Next.js does
not generate a second set of variants. Sizes around 100–200 KB are a target and vary by image
and browser. Use appropriately sized source images and monitor actual delivery size and quota.

Receipts use the authenticated delivery type under `lastdot/payment-proofs`. The API fetches
short-lived signed downloads server-side after its existing owner or admin checks. Receipt
responses use `private, no-store` and no Cloudinary URL is sent to the browser. Email attaches
the same bytes as a stream. Keep all receipt assets on authenticated delivery.
Keep the Cloudinary provider enabled once remote receipts exist so the API can continue to read them.

Cloudinary Free shares 25 credits across storage, transformation generation, and bandwidth.
One credit covers 1 GB of storage, 1 GB of image bandwidth, or 1,000 transformations. As a rough
example, 1 GB stored, 500 generated variants, and 10,000 image views at 150 KB would use about
3 credits. Browser format negotiation can create several cached formats per image. Originals,
derived assets, retained versions, and receipts can add to usage. Review the dashboard before
bulk recovery. See [Cloudinary billing and plans](https://cloudinary.com/documentation/billing_and_plans).

### Recover older media

1. Inventory broken rows from a database copy or approved read-only access. Keep product, banner,
   and payment records intact. A database backup contains metadata, while the image bytes must
   come from HidenCloud volume backups or available source files.
2. To restore a legacy URL unchanged, mount a volume at `/app/uploads` and restore the original
   directory tree, filenames, and permissions. Keep any legacy receipts off public paths.
3. To move public images to Cloudinary, re-upload the originals in the existing product editor.
   Set the replacement as primary and verify it before removing the broken image entry. For
   banners, choose a replacement image and save the banner. Check old order snapshots separately,
   since they can retain older URLs.
4. If the original files are missing, leave the existing records in place until a replacement is
   available. Review failed-cleanup logs and reconcile candidate orphan assets against the
   database before deleting anything in Cloudinary. The legacy standalone banner upload endpoint
   remains available for local storage. Cloudinary-backed banners upload as part of the save
   request so cancelled drafts never create remote assets.

After deploying, test a product and banner upload/replacement, then verify a receipt returns
only through the authorized API route. An unsigned Cloudinary URL for the receipt should fail.

For an approved migration, build a manual job from the same release using the API Dockerfile,
context `/`, and target `migrator`. Inject the direct Neon URL as the job's `DATABASE_URL`.
Review migration history and test against a disposable database before scheduling a production
run. Gate any schema-dependent release on successful migration. The API runner starts the app
without running migrations or seeding.

The VPS Compose setup below uses `DOMAIN`, `LETSENCRYPT_EMAIL`, and `POSTGRES_*`. Leave those
out of Northflank environments. The `SEED_*` variables belong to the separate seed operation.

## Docker Compose topology and prerequisites

The stack targets an Ubuntu VPS with at least 2 vCPU, 4 GiB RAM, 20 GiB free SSD space, and a
public IPv4 address. Install the current Docker Engine and Compose plugin using
[Docker's official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/). Add only
trusted operators to the `docker` group because it grants root-level control of the host. Compose
2.20 or newer is required for health-gated startup.

Before deployment:

1. Point the canonical hostname's DNS `A` record to the VPS. Add `AAAA` only when IPv6 is correctly
   routed to that server. The hostname must resolve publicly before Certbot starts.
2. Allow inbound TCP 22, 80, and 443 in the provider firewall and UFW. Restrict SSH to trusted
   addresses where practical. Do not open ports 3000, 4000, or 5432.
3. Clone the repository into a non-world-writable application directory.
4. Enable automatic OS security updates and key-only SSH authentication.

## Environment

From the repository root:

```sh
cp .env.production.example .env.production
chmod 600 .env.production
chmod 750 scripts/*.sh
```

Edit every placeholder. Set `DOMAIN=www.last-dot.com` for production. Compose uses this hostname
to derive `WEB_APP_URL` and `NEXT_PUBLIC_SITE_URL`. Enter the hostname without a scheme, path,
or port.

Generate independent secrets:

```sh
openssl rand -hex 32   # POSTGRES_PASSWORD and COOKIE_SECRET
openssl rand -hex 64   # each JWT/pepper secret; run separately three times
```

`POSTGRES_PASSWORD` is intentionally restricted to at least 32 URL-safe characters because it is
embedded in the internal connection URL. A hexadecimal value satisfies this rule. In Compose env
files, surround SMTP or seed passwords containing `$` or `#` with single quotes.

Production startup requires SMTP mode and a shared host. Configure and verify both mailbox logins
using the variables above. The support sender should be the authenticated support mailbox or a
verified alias for it. `MAIL_FROM_EMAIL` remains the fallback public contact address. Keep
`SWAGGER_ENABLED=false` on the public service. Product and banner images persist in the
`product_uploads` Docker volume.

## First deployment

Run preflight first:

```sh
./scripts/preflight.sh
```

The entire application, database, migrations, reverse proxy, and certificate service then start
with one Docker Compose command:

```sh
docker compose --env-file .env.production up -d --build --remove-orphans --wait
```

Alternatively, `./scripts/deploy.sh` runs preflight and the same deployment. Check first-time
certificate issuance; Nginx initially uses a two-day bootstrap certificate and reloads the trusted
certificate automatically:

```sh
docker compose --env-file .env.production logs -f --tail=100 certbot nginx
```

After successful TLS issuance, seed sample catalog data and the initial accounts exactly once:

```sh
SEED_CONFIRM=commerce ./scripts/seed-production.sh
```

Sign in to `/admin/login`, use the verified-email password-reset flow to rotate the administrator
password, and block the sample customer before accepting real orders. Rerunning the seed resets
both configured seed account passwords.

## Health, logs, and updates

```sh
docker compose --env-file .env.production ps
curl --fail https://shop.example.com/health
curl --fail https://shop.example.com/api/v1/health/ready
docker compose --env-file .env.production logs -f --tail=200 api web nginx
```

Replace the example hostname in the curl commands. `/health` checks Next.js; the API readiness
endpoint also checks PostgreSQL. Configure an external uptime monitor for both endpoints and alert
on certificate expiry, disk pressure, memory, and failed backups.

To deploy an reviewed revision, take a backup, update the checked-out Git revision, then run:

```sh
./scripts/backup.sh
./scripts/deploy.sh
```

The migration gate completes before API traffic resumes. Database migrations must remain
backward-compatible during rollback windows; rolling application code back does not reverse a
schema migration.

## Backups and restoration

Create a custom-format dump:

```sh
BACKUP_DIRECTORY=/srv/backups/last-dot ./scripts/backup.sh
```

Copy each `.dump` and `.sha256` file to encrypted offsite storage. For a stricter recovery-point
objective, supplement logical dumps with tested volume snapshots or PostgreSQL WAL archiving/PITR.
Back up the `product_uploads` volume with the database dump; database image records are not useful
without their corresponding files. Test restoring both together.
A typical root cron entry for a 02:15 Cairo-time daily backup is:

```cron
15 2 * * * cd /srv/last-dot-wears && BACKUP_DIRECTORY=/srv/backups/last-dot ./scripts/backup.sh >> /var/log/last-dot-backup.log 2>&1
```

Test restoration on a separate server regularly. Restoration is destructive and briefly makes the
store unavailable:

```sh
RESTORE_CONFIRM=commerce ./scripts/restore.sh /srv/backups/last-dot/commerce_TIMESTAMP.dump
```

The helper checks the SHA-256 sidecar when present, stops API/web access, restores PostgreSQL,
reapplies outstanding migrations, restarts the stack, and waits for health checks.

## Incident commands

```sh
# Stop public application traffic without deleting volumes
docker compose --env-file .env.production stop nginx api web

# Restart application services
docker compose --env-file .env.production up -d --wait api web nginx

# Inspect a failed migration
docker compose --env-file .env.production logs --tail=200 migrate
```

Never use `docker compose down --volumes` in production: it deletes PostgreSQL, uploaded images,
and certificate volumes. Rotate exposed SMTP, cookie, JWT, and pepper secrets, then rebuild/restart
the affected services. Changing token peppers invalidates outstanding refresh and one-time tokens.

# Production deployment runbook

## Topology and prerequisites

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

Edit every placeholder. Use the hostname only for `DOMAIN`, for example `shop.example.com`—do not
include `https://`, a path, a port, or `www` unless `www` is the actual canonical hostname.

Generate independent secrets:

```sh
openssl rand -hex 32   # POSTGRES_PASSWORD and COOKIE_SECRET
openssl rand -hex 64   # each JWT/pepper secret; run separately three times
```

`POSTGRES_PASSWORD` is intentionally restricted to at least 32 URL-safe characters because it is
embedded in the internal connection URL. A hexadecimal value satisfies this rule. In Compose env
files, surround SMTP or seed passwords containing `$` or `#` with single quotes.

Production startup requires working SMTP and Cloudinary credentials. `MAIL_FROM_EMAIL` should use
a domain with SPF, DKIM, and DMARC configured. Keep `SWAGGER_ENABLED=false` on the public service.

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

Never use `docker compose down --volumes` in production: it deletes the PostgreSQL and certificate
volumes. Rotate exposed SMTP, Cloudinary, cookie, JWT, and pepper secrets, then rebuild/restart the
affected services. Changing token peppers invalidates outstanding refresh and one-time tokens.

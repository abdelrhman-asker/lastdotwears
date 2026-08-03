# Production infrastructure

The production topology is defined by the root `compose.yaml`:

- `db`: private PostgreSQL 18 service with persistent storage and health checks.
- `migrate`: one-shot Prisma migration gate that must succeed before the API starts.
- `api`: non-root, production-only NestJS runtime on the private Compose networks.
- `web`: non-root Next.js standalone runtime.
- `nginx`: the only public service, terminating TLS and proxying web/API traffic.
- `certbot`: initial Let's Encrypt issuance plus twice-daily renewal checks.

The database, API, and web ports are never published to the host. Nginx creates a short-lived
self-signed certificate only so it can start before the first ACME certificate exists. Certbot
then atomically installs the trusted certificate and signals Nginx to reload it.

Container logs use bounded JSON files. PostgreSQL, Let's Encrypt state, ACME challenges, and the
active Nginx certificate are named volumes. See [the deployment runbook](../docs/DEPLOYMENT.md)
before starting a public server.

# Authentication and Users Module

## Scope

This review gate implements customer and administrator identity, secure browser sessions,
email verification, password recovery, profile updates, customer administration, the
initial user migration, and environment-driven seed accounts. Catalog and order data are
intentionally deferred to later gates.

## Security model

- Passwords use Argon2id with explicitly configured memory, time, and parallelism costs.
- Short-lived JWT access tokens are stored in `HttpOnly` cookies and are also accepted as
  bearer tokens for non-browser API clients.
- Opaque refresh tokens are stored only as HMAC-SHA-256 hashes. Every refresh rotates the
  session token; detected reuse revokes the entire token family.
- A readable random CSRF cookie and matching `x-csrf-token` header protect unsafe
  cookie-authenticated requests. Existing browser tabs can fall back to strict `Origin` plus
  `Sec-Fetch-Site` validation when both identify a configured same-site storefront origin.
- Blocking a customer and resetting a password revoke all active refresh sessions.
- Verification and reset tokens are random, hashed at rest, single-use, and expire.
- Login, registration, verification, password reset, and administrative status changes
  create audit records. Logs never include passwords, cookies, or tokens.
- Authentication endpoints have tighter rate limits than the application-wide default.
- Forgot-password and resend-verification responses do not disclose account existence.

Cookie security uses `SameSite=Lax`; production adds `Secure`. Access and refresh cookies
are `HttpOnly`, while the CSRF value must remain readable by the browser client. TLS is a
deployment requirement and will be terminated by Nginx in the deployment module.

## API endpoints

| Method  | Endpoint                           | Access         | Purpose                         |
| ------- | ---------------------------------- | -------------- | ------------------------------- |
| `POST`  | `/api/v1/auth/register`            | Public         | Register a customer             |
| `GET`   | `/api/v1/auth/csrf`                | Public         | Restore browser CSRF cookie     |
| `POST`  | `/api/v1/auth/login`               | Public         | Customer login                  |
| `POST`  | `/api/v1/admin/auth/login`         | Public         | Verified administrator login    |
| `POST`  | `/api/v1/auth/refresh`             | Refresh cookie | Rotate the browser session      |
| `POST`  | `/api/v1/auth/logout`              | Session        | Revoke the current session      |
| `GET`   | `/api/v1/auth/me`                  | Authenticated  | Return the current identity     |
| `POST`  | `/api/v1/auth/verify-email`        | Public         | Consume a verification token    |
| `POST`  | `/api/v1/auth/resend-verification` | Public         | Request a new verification link |
| `POST`  | `/api/v1/auth/forgot-password`     | Public         | Request a password-reset link   |
| `POST`  | `/api/v1/auth/reset-password`      | Public         | Consume a reset token           |
| `GET`   | `/api/v1/users/me`                 | Authenticated  | Read a profile                  |
| `PATCH` | `/api/v1/users/me`                 | Authenticated  | Update a profile                |
| `GET`   | `/api/v1/admin/users`              | Admin          | Search and paginate customers   |
| `GET`   | `/api/v1/admin/users/:id`          | Admin          | Read a customer                 |
| `PATCH` | `/api/v1/admin/users/:id/status`   | Admin          | Block or unblock a customer     |

Swagger documents request/response DTOs at `/docs` and `/docs/openapi.json` when enabled.
API errors use `application/problem+json`.

## Web routes

- Customer: `/register`, `/login`, `/forgot-password`, `/reset-password`,
  `/verify-email`, `/resend-verification`, and `/account/profile`.
- Administrator: `/admin/login` and `/admin/customers`.

The browser client sends credentials, mirrors the CSRF token on unsafe methods, performs
one coordinated refresh after a 401, and retries the original request once. Authorization
is always enforced by the API; hiding or redirecting a page is not treated as a security
boundary.

## Database setup and seed

Set all values in `apps/api/.env`, then run from the repository root:

```sh
corepack pnpm --filter @commerce/api prisma:migrate:deploy
corepack pnpm --filter @commerce/api prisma:seed
```

The seed requires `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_EMAIL`, and
`SEED_CUSTOMER_PASSWORD`. It is idempotent, hashes both passwords using the production
Argon2id settings, verifies both seed emails, and never logs credentials. Replace all
example secrets and passwords before use.

Development may use `MAIL_TRANSPORT=log`, which logs generated action URLs for local
testing. Production configuration refuses to start unless SMTP delivery is selected and
configured.

## Verification recorded for this gate

- API ESLint and strict TypeScript: passed.
- Web ESLint and strict TypeScript: passed.
- API unit tests: 13 passed.
- API HTTP/e2e tests: 6 passed.
- Web unit tests: 4 passed.
- Prisma validation and client generation: passed.
- NestJS production build: passed.
- Next.js production build and all 13 generated routes: passed.
- Live smoke test: eight auth/account/admin pages returned 200; API liveness and Swagger
  returned 200; protected access returned problem-details 401; CORS and security headers
  were verified.

The database-backed happy path was not run against the machine's existing PostgreSQL
service because no project credentials were available. No roles, databases, or data were
created without explicit authorization.

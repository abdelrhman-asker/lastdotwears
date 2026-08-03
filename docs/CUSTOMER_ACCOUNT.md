# Customer account, addresses, and order history

Module 7 completes the signed-in customer account experience. It adds an owner-scoped Egyptian
delivery address book, paginated order history, a shared account shell, and saved-address checkout
prefill without changing immutable order snapshots.

## Address invariants

- Addresses are available only to authenticated customers and every query includes the current
  customer ID. An address owned by another customer is returned as not found.
- A customer can save at most ten addresses.
- The first address is always made the default, regardless of the submitted flag.
- A partial PostgreSQL unique index permits at most one default address per customer.
- Setting a default unsets the previous default in the same serializable transaction.
- Deleting the default promotes the most recently updated remaining address in the same
  transaction.
- New addresses and governorate changes require a currently active shipping rate. Existing
  addresses remain visible if an administrator later disables that governorate.
- Address edits never alter orders. Checkout copies the chosen recipient and delivery fields into
  the order's immutable snapshot.

The repository retries PostgreSQL serialization conflicts up to three times. Optional blank
address fields are stored as `NULL`, and database checks backstop application validation for
labels, recipient data, governorate codes, cities, street addresses, postal codes, and notes.

## Customer API

All endpoints require a valid customer JWT cookie. Unsafe methods also require the double-submit
CSRF token.

| Method   | Endpoint                              | Purpose                                      |
| -------- | ------------------------------------- | -------------------------------------------- |
| `GET`    | `/api/v1/addresses`                   | List owned addresses, default first          |
| `POST`   | `/api/v1/addresses`                   | Save an address                              |
| `PATCH`  | `/api/v1/addresses/:id`               | Update an owned address                      |
| `PATCH`  | `/api/v1/addresses/:id/default`       | Atomically make an address the default       |
| `DELETE` | `/api/v1/addresses/:id`               | Delete an address and promote when necessary |
| `GET`    | `/api/v1/orders`                      | List paginated customer order summaries      |
| `GET`    | `/api/v1/orders/:orderNumber`         | Read a complete owned order snapshot         |
| `GET`    | `/api/v1/orders/:orderNumber/invoice` | Read its printable invoice snapshot          |

Order history accepts `page`, `limit` (maximum 50), and an optional `status`. Summary queries load
only the data needed for the account cards and calculate item quantity counts without generating
InstaPay QR codes for every row. Full payment instructions remain on the individual order route.

## Customer interface

- `/account/profile` — contact details, verification state, and membership date
- `/account/addresses` — create, edit, delete, and select a default address
- `/account/orders` — status filtering, pagination, product previews, totals, detail links, and
  invoice links
- `/checkout` — prefills the default active saved address and lets the customer switch between
  saved addresses

The shared account layout handles authentication, account navigation, sign-out, and responsive
presentation. All account routes are marked `noindex, nofollow`.

## Migration and seed

Apply migration `20260803010000_customer_accounts`:

```powershell
corepack pnpm --filter @commerce/api prisma:migrate:deploy
corepack pnpm --filter @commerce/api prisma:seed
```

The idempotent seed adds a deterministic default `Home` address to the sample customer only when
that record is absent. It does not replace a default address the customer has already chosen.

## Verification

Module coverage includes address service ownership/error mapping, address limits, default updates,
customer order pagination, protected API routes, and Egyptian address validation. The final gate
also runs strict TypeScript, zero-warning ESLint, Prettier, Prisma validation/status, all Jest,
Supertest, and Vitest suites, optimized builds, Swagger inspection, and a database-backed CRUD and
default-promotion lifecycle.

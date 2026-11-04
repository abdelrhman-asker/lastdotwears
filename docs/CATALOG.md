# Catalog and inventory module

Module 3 implements the catalog write model, public catalog API, server-backed image
storage, inventory ledger, seed catalog, and the matching administrator interface.

## Data model

- `Category` supports ordered parent/child navigation. Parent changes reject self-links and
  cycles. A category that still contains products or child categories cannot be deleted.
- `Brand` owns descriptive content and an optional website URL. A brand that is still used by
  a product cannot be deleted.
- `Product` owns merchandising content, regular/sale prices, lifecycle status, featured and
  new-arrival flags, variants, and images. Products use soft deletion.
- `ProductVariant` is the sellable SKU. Its normalized size/color combination is unique within
  a product, SKU is globally unique, and stock cannot be negative. Variant deletion is soft.
- `ProductImage` stores server-file identifiers and immutable upload metadata. Exactly one image
  is kept primary when a product has images; deleting or demoting the primary image promotes
  the next image.
- `InventoryMovement` is an append-only stock ledger containing the signed change, resulting
  quantity, reason, optional business reference, and administrator actor.

All money is stored as integer Egyptian piasters. For example, EGP 1,499.00 is `149900`.
`sortPricePiasters` is maintained as the effective sale-or-regular price and protected by a
database check constraint, so sale products sort correctly without floating-point arithmetic
or an unindexed expression.

Product statuses are `DRAFT`, `ACTIVE`, and `ARCHIVED`. A product cannot be activated without
an active variant. Public queries return only active products, active taxonomy records, and
active variants. Admin queries include operational states but never soft-deleted records.

## REST API

All paths below are relative to `/api/v1`. Swagger describes every request and response at
`/docs` when `SWAGGER_ENABLED=true`.

Public endpoints:

- `GET /categories` and `GET /categories/:slug`
- `GET /brands` and `GET /brands/:slug`
- `GET /products` and `GET /products/:slug`

The product list accepts `page`, `limit`, `search`, `category`, `brand`, `size`, `color`,
`featured`, `newArrival`, `minPrice`, `maxPrice`, and `sort`. Sort values are `newest`,
`oldest`, `price-asc`, `price-desc`, and `name-asc`. Price filters use effective sale prices.
Pagination is bounded to 60 products per page.

Administrator endpoints require an authenticated `ADMIN` session. Every mutation also requires
the existing double-submit CSRF token:

- `/admin/categories`: paginated list, read, create, update, and soft delete
- `/admin/brands`: paginated list, read, create, update, and soft delete
- `/admin/products`: paginated list, read, create, update, and soft delete
- `/admin/products/:id/variants`: create a variant
- `/admin/products/:id/variants/:variantId`: update or soft delete a variant
- `/admin/products/:id/images`: multipart image upload
- `/admin/products/:id/images/:imageId`: update metadata/primary position or delete
- `GET /admin/inventory`: paginated inventory with search and low-stock filtering
- `GET /admin/inventory/:variantId/movements`: stock audit history
- `POST /admin/inventory/:variantId/adjustments`: audited restock, return, or adjustment

Inventory adjustments run in a serializable transaction and use a compare-and-update guard.
Concurrent updates cannot silently overwrite one another, and a change that would result in
negative stock is rejected.

## Product images

Set these API environment variables:

```dotenv
UPLOAD_ROOT=./uploads
PRODUCT_IMAGE_MAX_BYTES=8000000
```

`UPLOAD_ROOT` is resolved from the API process working directory. Compose overrides it with
`/app/uploads` and mounts the persistent `product_uploads` volume at that path.

Uploads are server-side and accept a single JPEG, PNG, WebP, or AVIF file. Validation checks both
the declared MIME type, file signature, and encoded image dimensions; the configured size limit
is capped at 20 MB. A failed database write after a successful upload triggers a compensating file
deletion. Stored files are served from immutable `/api/v1/uploads/...` URLs, and deleting an image
removes its server file.

## Administrator routes

- `/admin/catalog/categories`
- `/admin/catalog/brands`
- `/admin/catalog/products`
- `/admin/catalog/products/new`
- `/admin/catalog/products/:id`
- `/admin/inventory`

The UI uses React Hook Form and Zod for product/taxonomy validation, TanStack Query for server
state, and the authenticated API client for cookie and CSRF handling. The product editor covers
details, variants, image upload/ordering, and primary image selection.

## Migration and seed

Apply migrations and seed the environment from the repository root:

```powershell
corepack pnpm --filter @commerce/api prisma:migrate:deploy
corepack pnpm --filter @commerce/api prisma:seed
```

The idempotent seed creates three categories, two brands, five active sample products, eighteen
variants, and their initial inventory ledger entries in addition to the Module 2 accounts. It
intentionally does not reset stock on later runs, which preserves real inventory changes. Sample
images are not seeded so each operator can upload deployment-specific catalog photography.

## Verification

The module is covered by normalization, product invariant, image signature, and transactional
inventory unit tests; protected-route and validation e2e tests; and frontend catalog validation
tests. Prisma schema validation, strict TypeScript, ESLint, formatting, production builds, and
live route/Swagger smoke tests are part of the module acceptance check.

Live database-backed catalog reads and migration deployment require a configured project
`DATABASE_URL`; they should be included in the deployment-environment smoke test.

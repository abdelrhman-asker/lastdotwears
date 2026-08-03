# Storefront catalog module

Module 4 delivers the public, crawlable customer catalog on top of the approved Module 3
REST API. It intentionally stops before wishlist and shopping-bag state, which belong to
Module 5.

## Public routes

- `/`: editorial home page with category, featured-product, and new-arrival sections
- `/categories`: active category directory
- `/categories/:slug`: category product listing
- `/products`: complete product listing
- `/products/:slug`: product content, media, pricing, variants, availability, and related items
- `/search`: dedicated product search and result refinement
- `/about`, `/contact`, `/privacy`, and `/terms`: static information pages
- `/robots.txt` and `/sitemap.xml`: environment-aware crawler directives and dynamic discovery

The shared storefront layout provides the delivery/payment announcement, responsive navigation,
keyboard skip link, mobile search/menu, customer account entry point, and full information footer.
Administrator and authentication route groups keep their existing independent layouts.

## Catalog discovery

Listing state is URL-driven so filtered pages remain refreshable, shareable, and compatible with
server rendering. Supported user-facing parameters are:

- `q`: product, description, SKU, or brand search
- `category` and `brand`: normalized slugs
- `size` and `color`: variant filters
- `min` and `max`: whole EGP values, converted to integer piasters at the API boundary
- `featured` and `newArrival`: merchandising flags
- `sort`: `newest`, `oldest`, `price-asc`, `price-desc`, or `name-asc`
- `page`: one-based pagination

Zod normalizes and bounds query input before any value is passed to the API. Malformed optional
filters are discarded and malformed pagination/sort values use safe defaults. Public API DTOs
remain the second validation boundary.

## Rendering and resilience

- Public catalog requests run on the server through `INTERNAL_API_URL`; the browser does not need
  to fetch initial product data.
- Next.js data caching revalidates catalog reads every five minutes and tags category, brand, and
  product data separately for future on-demand invalidation.
- The home and category-directory pages retain a useful branded shell if the API is temporarily
  unavailable. Dynamic listing/detail routes use the route error boundary instead of exposing raw
  errors.
- Product media uses `next/image`, responsive `sizes`, AVIF/WebP negotiation, lazy loading below
  the fold, and Cloudinary-only remote image rules. The primary hero is priority-loaded.
- Product cards and detail galleries use an explicit neutral missing-image state. They never emit
  a broken image URL when a newly seeded product has not received deployment-specific Cloudinary
  images yet.

## SEO

- Root metadata defines the site identity, locale, Open Graph defaults, Twitter card, and a
  deployment-aware indexing policy.
- Every public page supplies a canonical URL and focused title/description.
- Product and category pages generate metadata from the API. Product images become their Open
  Graph images when available.
- Product pages emit escaped Schema.org `Product` and `Offer` JSON-LD with EGP pricing and live
  stock availability.
- Search results are `noindex,follow`; filtered product URLs canonicalize to the base listing.
- The sitemap includes static pages plus active categories and up to 6,000 paginated active
  products. It still returns static entries when the catalog API is unavailable.
- Development robots disallow crawling. Production robots allow public routes while excluding
  `/admin/` and `/account/`.

## Editorial asset

The home hero is an original, logo-free editorial image generated for this project and stored at
`apps/web/public/images/editorial-hero.png`. The source is 1792 × 887 pixels. Next.js performs
format conversion and responsive resizing at delivery time, so the original remains a single
high-quality source asset.

## Environment

Module 4 adds one public deployment value:

```dotenv
NEXT_PUBLIC_CONTACT_EMAIL=care@cairoedit.com
```

Replace the example with the store's monitored customer-care address. It remains the resilient
build-time fallback; Module 9 reads the primary store identity and contact details from the public
settings API.

## Verification

The review gate includes:

- query normalization, EGP conversion, canonical-link, and product-card component tests
- strict TypeScript, ESLint, Prettier, and a Next.js production build
- live built-process checks for home, search, About, Contact, Privacy, Terms, robots, and sitemap
- API liveness, public product validation, and Swagger JSON checks

Database-backed product/category rendering must also be smoke-tested after migrations and the seed
are applied to the deployment database. The local verification environment did not contain project
PostgreSQL credentials, so it was not modified.

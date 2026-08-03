import Link from 'next/link';

import { listingHref, type ProductListingQuery } from '@/lib/validation/storefront-query';

export function Pagination({
  pathname,
  query,
  totalPages,
}: {
  pathname: string;
  query: ProductListingQuery;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - query.page) <= 1,
  );

  return (
    <nav aria-label="Product pages" className="mt-16 flex items-center justify-center gap-1">
      <PageLink
        href={listingHref(pathname, { ...query, page: Math.max(1, query.page - 1) })}
        disabled={query.page <= 1}
      >
        Previous
      </PageLink>
      {pages.map((page, index) => {
        const previous = pages[index - 1];
        return (
          <span key={page} className="flex items-center">
            {previous !== undefined && page - previous > 1 ? (
              <span className="px-2 text-stone-400">…</span>
            ) : null}
            <Link
              href={listingHref(pathname, { ...query, page })}
              aria-current={page === query.page ? 'page' : undefined}
              className={`grid size-10 place-items-center text-sm ${
                page === query.page ? 'bg-stone-950 text-white' : 'hover:bg-stone-200'
              }`}
            >
              {page}
            </Link>
          </span>
        );
      })}
      <PageLink
        href={listingHref(pathname, { ...query, page: Math.min(totalPages, query.page + 1) })}
        disabled={query.page >= totalPages}
      >
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: string;
}) {
  if (disabled) return <span className="px-4 py-3 text-sm text-stone-400">{children}</span>;
  return (
    <Link href={href} className="px-4 py-3 text-sm hover:bg-stone-200">
      {children}
    </Link>
  );
}

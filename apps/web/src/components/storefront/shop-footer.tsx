import Link from 'next/link';

import { getPublicWebsiteSettings } from '@/lib/api/storefront';

const shopLinks = [
  { href: '/products', label: 'All products' },
  { href: '/products?newArrival=true', label: 'New arrivals' },
  { href: '/categories', label: 'Categories' },
  { href: '/search', label: 'Search' },
];

const informationLinks = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms & conditions' },
];

export async function ShopFooter() {
  const settings = await getPublicWebsiteSettings();
  return (
    <footer className="bg-stone-950 text-stone-200 print:hidden">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-6 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-12 lg:py-20">
        <div className="max-w-md">
          <p className="text-xs font-semibold tracking-[0.28em] uppercase">{settings.storeName}</p>
          <p className="mt-6 font-serif text-3xl leading-tight text-white">{settings.tagline}</p>
          <a
            href={`mailto:${settings.contactEmail}`}
            className="mt-8 inline-block border-b border-stone-500 pb-1 text-sm transition-colors hover:border-white hover:text-white"
          >
            {settings.contactEmail}
          </a>
        </div>
        <FooterColumn title="Shop" links={shopLinks} />
        <FooterColumn title="Information" links={informationLinks} />
        <div>
          <h2 className="text-[11px] tracking-[0.2em] text-stone-500 uppercase">Follow</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {settings.socialLinks.map((link) => (
              <li key={link.id}>
                <a
                  className="transition-colors hover:text-white"
                  href={link.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 border-t border-white/15 px-6 py-6 text-[11px] tracking-[0.12em] text-stone-400 uppercase sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span>
          © {new Date().getFullYear()} {settings.storeName}
        </span>
        <span>Prices include applicable taxes · Egypt</span>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h2 className="text-[11px] tracking-[0.2em] text-stone-500 uppercase">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

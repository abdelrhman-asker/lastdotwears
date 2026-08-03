import type { Metadata } from 'next';

import { ContactForm } from '@/components/storefront/contact-form';
import { getPublicWebsiteSettings } from '@/lib/api/storefront';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Last-Dot Wears customer care for product, delivery, payment, or order help.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const settings = await getPublicWebsiteSettings();

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <header className="grid gap-10 border-b border-stone-300 pb-16 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">Customer care</p>
          <h1 className="mt-5 font-serif text-6xl tracking-[-0.05em] sm:text-7xl">Let’s talk.</h1>
        </div>
        <p className="max-w-lg text-sm leading-7 text-stone-600 lg:justify-self-end">
          Questions about a piece, delivery, payment, or an existing order? Send a secure message to
          customer care and include your order number when applicable.
        </p>
      </header>

      <div className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-3">
        <ContactBlock title="Email us">
          <a
            href={`mailto:${settings.contactEmail}`}
            className="border-b border-stone-900 pb-1 text-lg"
          >
            {settings.contactEmail}
          </a>
          <p className="mt-4 text-sm leading-6 text-stone-500">
            We aim to reply within two business days.
          </p>
        </ContactBlock>
        <ContactBlock title="Customer care hours">
          <p className="max-w-xs text-lg leading-7">{settings.businessHours}</p>
        </ContactBlock>
        <ContactBlock title="When writing">
          <p className="text-sm leading-6 text-stone-600">
            Include the product name or order number, your preferred contact details, and a short
            description of how we can help.
          </p>
        </ContactBlock>
      </div>

      <div className="grid gap-10 border-t border-stone-300 py-16 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Customer care</p>
          <h2 className="mt-4 font-serif text-4xl tracking-tight">Write to the team.</h2>
          {settings.contactPhone ? <p className="mt-6 text-sm">{settings.contactPhone}</p> : null}
          {settings.storeAddress ? (
            <p className="mt-3 max-w-sm text-sm leading-6 text-stone-500">
              {settings.storeAddress}
            </p>
          ) : null}
        </div>
        <ContactForm />
      </div>

      <section className="bg-[#e9e4da] p-8 sm:p-12 lg:p-16">
        <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">A quick note</p>
        <h2 className="mt-5 max-w-2xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
          Never send card details, account passwords, or verification codes by email.
        </h2>
      </section>
    </div>
  );
}

function ContactBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-6 text-[10px] tracking-[0.18em] text-stone-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}

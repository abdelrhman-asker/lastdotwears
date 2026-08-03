import type { Metadata } from 'next';

import { clientEnvironment } from '@/lib/env/client';

export const metadata: Metadata = {
  title: 'Terms & conditions',
  description: 'Terms governing use of the Last-Dot Wears website and purchases in Egypt.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <header className="border-b border-stone-300 pb-12">
        <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Legal</p>
        <h1 className="mt-5 font-serif text-6xl tracking-[-0.05em] sm:text-7xl">
          Terms & conditions
        </h1>
        <p className="mt-6 text-xs text-stone-500">Last updated: 2 August 2026</p>
      </header>
      <div className="max-w-3xl py-12">
        <Term title="1. Using this website">
          You may use this website for lawful personal shopping. You are responsible for accurate
          account information, keeping credentials confidential, and activity performed through your
          account. Automated abuse, interference, scraping that harms service availability, and
          fraudulent activity are prohibited.
        </Term>
        <Term title="2. Products and availability">
          We aim to describe products, colors, measurements, and availability accurately. Display
          settings can affect how colors appear. Adding an item to a bag does not reserve stock;
          availability is confirmed when an order is accepted.
        </Term>
        <Term title="3. Prices and orders">
          Prices are shown in Egyptian pounds and include applicable taxes unless stated otherwise.
          Shipping fees are presented before order placement. We may reject or cancel an order for
          unavailable stock, incorrect pricing, suspected misuse, or an undeliverable address, and
          will explain the outcome where practical.
        </Term>
        <Term title="4. Payment">
          Supported methods are cash on delivery and manual InstaPay. InstaPay orders remain waiting
          for payment until an administrator verifies the transfer. Never send credentials or
          verification codes. An order is not marked paid solely because a transfer screenshot was
          submitted.
        </Term>
        <Term title="5. Delivery, cancellation, and returns">
          Delivery estimates are not guarantees and may be affected by address verification, courier
          conditions, or events outside reasonable control. Cancellation, refusal, return, and
          refund eligibility remains subject to the policy presented during checkout and any
          mandatory rights under Egyptian law.
        </Term>
        <Term title="6. Liability">
          Nothing in these terms excludes rights or liability that cannot legally be excluded. To
          the extent permitted by law, we are not responsible for indirect loss or failure caused by
          events outside reasonable control.
        </Term>
        <Term title="7. Governing law and contact">
          These terms are governed by the laws of the Arab Republic of Egypt. Questions can be sent
          to{' '}
          <a
            className="border-b border-stone-900"
            href={`mailto:${clientEnvironment.NEXT_PUBLIC_CONTACT_EMAIL}`}
          >
            {clientEnvironment.NEXT_PUBLIC_CONTACT_EMAIL}
          </a>
          .
        </Term>
      </div>
    </div>
  );
}

function Term({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-stone-600">{children}</p>
    </section>
  );
}

import type { Metadata } from 'next';

import { clientEnvironment } from '@/lib/env/client';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How Last-Dot Wears collects, uses, and protects customer information.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="8 November 2026">
      <LegalSection title="1. Information we collect">
        We collect information you provide when creating an account, placing an order, contacting
        customer care, or updating your profile. This can include your name, email address, phone
        number, delivery address, order history, and payment method selection. We do not ask you to
        send banking credentials or verification codes.
      </LegalSection>
      <LegalSection title="2. How we use information">
        We use personal information to operate accounts, process and deliver orders, verify manual
        payments, prevent misuse, provide support, comply with legal obligations, and improve store
        performance. We only use information for marketing where the required permission has been
        provided.
      </LegalSection>
      <LegalSection title="3. Cookies and security">
        Essential cookies keep authenticated sessions secure and protect requests against forgery.
        We apply access controls, password hashing, encryption in transit, rate limits, and audit
        records. Optional PostHog analytics is not loaded until you accept it. You can reject it or
        change your choice at any time using the Privacy choices control. No internet service can
        guarantee absolute security, so credentials should always be kept private.
      </LegalSection>
      <LegalSection title="4. Optional analytics">
        If you consent, we use PostHog Cloud to understand page visits, traffic sources, product and
        category interest, link interactions, cart and wishlist activity, checkout progress, and
        completed purchases. Anonymous visitors receive a browser identifier; signed-in customers
        are associated only with their internal account ID, not their name or email. Session
        recording requires a separate choice, masks all text and form inputs, and is disabled on
        authentication, account, checkout, order, and administration pages. We do not send form
        values, addresses, phone numbers, payment details, uploaded receipts, passwords, or
        authentication tokens to PostHog.
      </LegalSection>
      <LegalSection title="5. Service providers">
        We may share the minimum information needed with hosting, database, image-storage, email,
        delivery, analytics, and operational service providers. These providers process information
        for the store and may not use it for unrelated purposes.
      </LegalSection>
      <LegalSection title="6. Retention and your choices">
        We retain information for as long as needed to provide the service, maintain financial and
        security records, resolve disputes, and meet applicable legal requirements. You may request
        access, correction, or deletion where legally available by contacting customer care.
      </LegalSection>
      <LegalSection title="7. Contact">
        Privacy questions and requests can be sent to{' '}
        <a
          className="border-b border-stone-900"
          href={`mailto:${clientEnvironment.NEXT_PUBLIC_CONTACT_EMAIL}`}
        >
          {clientEnvironment.NEXT_PUBLIC_CONTACT_EMAIL}
        </a>
        . We may need to verify your identity before completing a request.
      </LegalSection>
    </LegalPage>
  );
}

function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <header className="border-b border-stone-300 pb-12">
        <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Legal</p>
        <h1 className="mt-5 font-serif text-6xl tracking-[-0.05em] sm:text-7xl">{title}</h1>
        <p className="mt-6 text-xs text-stone-500">Last updated: {updated}</p>
      </header>
      <div className="max-w-3xl py-12">{children}</div>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-stone-600">{children}</p>
    </section>
  );
}

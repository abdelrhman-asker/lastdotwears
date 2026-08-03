import type { Metadata } from 'next';

import { ContactInboxPanel } from '@/components/admin/contact-inbox-panel';

export const metadata: Metadata = { title: 'Contact inbox' };

export default function AdminContactInboxPage() {
  return <ContactInboxPanel />;
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AdminSetupForm } from '@/components/auth/admin-setup-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { getServerEnvironment } from '@/lib/env/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administrator setup',
  robots: { index: false, follow: false },
};

export default async function AdminSetupPage() {
  const available = await fetch(
    `${getServerEnvironment().INTERNAL_API_URL.replace(/\/$/u, '')}/admin/setup/status`,
    {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    },
  )
    .then((response) => response.status === 204)
    .catch(() => false);

  if (!available) notFound();

  return (
    <AuthShell
      eyebrow="Secure administration"
      title="Create an administrator"
      description="Enter the setup secret supplied by the store operator."
    >
      <AdminSetupForm />
    </AuthShell>
  );
}

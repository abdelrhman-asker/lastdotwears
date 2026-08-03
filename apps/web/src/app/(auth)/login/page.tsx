import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requested = (await searchParams).next;
  const redirectTo =
    requested?.startsWith('/') && !requested.startsWith('//') ? requested : undefined;
  return (
    <AuthShell
      description="Access your profile, saved pieces, and order history."
      title="Welcome back"
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}

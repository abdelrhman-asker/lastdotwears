import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmailResult } from '@/components/auth/verify-email-result';

export const metadata: Metadata = { title: 'Email verification' };

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token = '' } = await searchParams;
  return (
    <AuthShell
      description="We’re confirming this email address for your account."
      title="Email verification"
    >
      <VerifyEmailResult token={token} />
    </AuthShell>
  );
}

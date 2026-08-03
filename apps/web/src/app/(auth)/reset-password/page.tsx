import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Choose new password' };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token = '' } = await searchParams;
  return (
    <AuthShell
      description="Choose a strong, unique password for your account."
      title="Choose a new password"
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}

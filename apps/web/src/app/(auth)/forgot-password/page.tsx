import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { EmailRequestForm } from '@/components/auth/email-request-form';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="Enter the email used for your account. If it matches, we’ll send a secure reset link."
      title="Reset your password"
    >
      <EmailRequestForm purpose="password" />
    </AuthShell>
  );
}

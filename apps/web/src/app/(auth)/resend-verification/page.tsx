import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { EmailRequestForm } from '@/components/auth/email-request-form';

export const metadata: Metadata = { title: 'Verify email' };

export default function ResendVerificationPage() {
  return (
    <AuthShell
      description="We’ll send a new verification link if your account still needs one."
      title="Verify your email"
    >
      <EmailRequestForm purpose="verification" />
    </AuthShell>
  );
}

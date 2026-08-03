import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Administrator sign in',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <AuthShell
      description="This area is restricted to authorized store administrators."
      eyebrow="Secure administration"
      title="Administrator sign in"
    >
      <LoginForm admin />
    </AuthShell>
  );
}

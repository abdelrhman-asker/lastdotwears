'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { StatusMessage } from '@/components/ui/status-message';
import { useCurrentUser } from '@/hooks/use-current-user';
import { logout } from '@/lib/api/auth';
import { ApiError, errorMessage } from '@/lib/api/http-client';
import { cn } from '@/lib/utils/cn';

const accountLinks = [
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/wishlist', label: 'Wishlist' },
] as const;

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });

  if (user.isPending) {
    return <AccountGate message="Loading your account…" />;
  }
  if (user.isError) {
    const expired = user.error instanceof ApiError && user.error.problem.status === 401;
    return (
      <AccountGate
        message={expired ? 'Your session has ended.' : errorMessage(user.error)}
        showLogin
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-stone-950">
      <header className="border-b border-stone-300 bg-white">
        <div className="mx-auto flex h-18 max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link className="text-sm tracking-[0.22em] uppercase" href="/">
            Last-Dot Wears
          </Link>
          <div className="flex items-center gap-5">
            <Link className="text-xs tracking-[0.14em] uppercase hover:underline" href="/cart">
              Shopping bag
            </Link>
            <Button
              className="min-h-9 px-4 text-xs"
              disabled={signOut.isPending}
              onClick={() => signOut.mutate()}
              variant="secondary"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-12 lg:py-16">
        <aside>
          <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">My account</p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight">
            {user.data.firstName} {user.data.lastName}
          </h1>
          <p className="mt-1 truncate text-xs text-stone-500">{user.data.email}</p>
          <nav className="mt-8 border-y border-stone-300" aria-label="Account navigation">
            {accountLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center justify-between border-b border-stone-300 px-1 text-xs tracking-[0.14em] uppercase last:border-b-0',
                    active ? 'font-medium text-stone-950' : 'text-stone-500 hover:text-stone-950',
                  )}
                  href={link.href}
                >
                  {link.label}
                  <span aria-hidden="true">{active ? '●' : '→'}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function AccountGate({ message, showLogin = false }: { message: string; showLogin?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-6">
      <div className="w-full max-w-md">
        <StatusMessage tone={showLogin ? 'error' : 'neutral'}>
          {message}{' '}
          {showLogin ? (
            <Link className="font-medium underline" href="/login?next=/account/profile">
              Sign in
            </Link>
          ) : null}
        </StatusMessage>
      </div>
    </main>
  );
}

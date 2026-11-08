'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { StatusMessage } from '@/components/ui/status-message';
import { useCurrentUser } from '@/hooks/use-current-user';
import { resetAnalyticsIdentity } from '@/lib/analytics/client';
import { logout } from '@/lib/api/auth';
import { cn } from '@/lib/utils/cn';

const navigation: Array<{
  label: string;
  links: Array<{ href: string; label: string }>;
}> = [
  { label: 'Overview', links: [{ href: '/admin', label: 'Dashboard' }] },
  {
    label: 'Commerce',
    links: [
      { href: '/admin/orders', label: 'Orders' },
      { href: '/admin/coupons', label: 'Coupons' },
      { href: '/admin/shipping', label: 'Shipping' },
    ],
  },
  {
    label: 'Catalog',
    links: [
      { href: '/admin/catalog/products', label: 'Products' },
      { href: '/admin/catalog/categories', label: 'Categories' },
      { href: '/admin/catalog/brands', label: 'Brands' },
      { href: '/admin/inventory', label: 'Inventory' },
    ],
  },
  { label: 'People', links: [{ href: '/admin/customers', label: 'Customers' }] },
  {
    label: 'Website',
    links: [
      { href: '/admin/messages', label: 'Contact inbox' },
      { href: '/admin/settings', label: 'Settings' },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      resetAnalyticsIdentity();
      queryClient.clear();
      router.replace('/admin/login');
    },
  });

  useEffect(() => {
    if (user.isError || (user.data && user.data.role !== 'ADMIN')) {
      router.replace('/admin/login');
    }
  }, [router, user.data, user.isError]);

  if (user.isPending) {
    return <AdminGate message="Loading administration…" />;
  }
  if (user.isError || user.data.role !== 'ADMIN') {
    return <AdminGate message="Administrator authentication is required." />;
  }

  return (
    <div className="min-h-screen bg-stone-50 print:block lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden border-r border-stone-800 bg-stone-950 px-6 py-8 text-white print:hidden lg:block">
        <Link className="text-sm tracking-[0.22em] uppercase" href="/admin">
          Administration
        </Link>
        <nav className="mt-12 space-y-7" aria-label="Administration navigation">
          {navigation.map((section) => (
            <div key={section.label}>
              <p className="px-4 pb-2 text-[10px] tracking-[0.2em] text-stone-500 uppercase">
                {section.label}
              </p>
              {section.links.map((link) => {
                const active =
                  link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    className={cn(
                      'block border-l-2 px-4 py-2.5 text-sm transition',
                      active
                        ? 'border-white bg-white/10 text-white'
                        : 'border-transparent text-stone-400 hover:text-white',
                    )}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-stone-200 bg-white px-5 py-4 print:hidden sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] text-stone-500 uppercase">Administration</p>
              <p className="mt-1 text-xs text-stone-400">{user.data.email}</p>
            </div>
            <Button disabled={signOut.isPending} onClick={() => signOut.mutate()} variant="ghost">
              Sign out
            </Button>
          </div>
          <nav className="mt-4 flex gap-5 overflow-x-auto pb-1 text-xs lg:hidden">
            {navigation
              .flatMap((section) => section.links)
              .map((link) => (
                <Link className="shrink-0" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
          </nav>
        </header>
        <main className="p-5 print:p-0 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}

function AdminGate({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-6">
      <div className="w-full max-w-md">
        <StatusMessage>{message}</StatusMessage>
      </div>
    </main>
  );
}

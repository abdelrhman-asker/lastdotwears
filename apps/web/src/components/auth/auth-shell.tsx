import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthShellProps {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
}

export function AuthShell({ children, eyebrow = 'Account', title, description }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-stone-50 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.72fr)]">
      <section className="relative hidden overflow-hidden bg-stone-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link className="text-sm tracking-[0.24em] uppercase" href="/">
          Last-Dot Wears
        </Link>
        <div className="max-w-xl">
          <p className="mb-5 text-xs tracking-[0.3em] text-stone-400 uppercase">
            Modern essentials
          </p>
          <p className="text-5xl leading-[1.08] font-light tracking-tight">
            Considered clothing for everyday life in Egypt.
          </p>
        </div>
        <p className="text-xs text-stone-400">Cairo · Alexandria · Nationwide delivery</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <Link
            className="mb-12 inline-block text-sm tracking-[0.2em] uppercase lg:hidden"
            href="/"
          >
            Last-Dot Wears
          </Link>
          <p className="mb-3 text-xs font-medium tracking-[0.22em] text-stone-500 uppercase">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-light tracking-tight text-stone-950 sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-stone-600">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}

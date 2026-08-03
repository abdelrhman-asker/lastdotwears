import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface StatusMessageProps {
  children: ReactNode;
  tone?: 'error' | 'success' | 'neutral';
}

export function StatusMessage({ children, tone = 'neutral' }: StatusMessageProps) {
  return (
    <div
      className={cn(
        'border px-4 py-3 text-sm leading-6',
        tone === 'error' && 'border-red-200 bg-red-50 text-red-800',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        tone === 'neutral' && 'border-stone-200 bg-stone-50 text-stone-700',
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

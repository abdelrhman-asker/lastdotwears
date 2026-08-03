import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = 'button', variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-none px-5 text-sm font-medium tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-stone-950 text-white hover:bg-stone-800',
        variant === 'secondary' &&
          'border border-stone-300 bg-white text-stone-950 hover:bg-stone-100',
        variant === 'ghost' && 'text-stone-700 hover:bg-stone-100',
        variant === 'danger' && 'bg-red-700 text-white hover:bg-red-800',
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';

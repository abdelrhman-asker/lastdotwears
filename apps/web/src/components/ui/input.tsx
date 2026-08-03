import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-none border border-stone-300 bg-white px-3 text-base text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-950 focus:ring-1 focus:ring-stone-950 disabled:bg-stone-100',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

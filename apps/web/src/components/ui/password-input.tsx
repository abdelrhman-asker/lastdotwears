'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn('pr-16', className)}
          disabled={disabled}
          type={isVisible ? 'text' : 'password'}
          {...props}
        />
        <button
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-stone-600 transition hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
          disabled={disabled}
          onClick={() => setIsVisible((visible) => !visible)}
          type="button"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

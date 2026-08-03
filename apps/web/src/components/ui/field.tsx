import type { ReactNode } from 'react';

interface FieldProps {
  children: ReactNode;
  error?: string;
  hint?: string;
  htmlFor: string;
  label: string;
}

export function Field({ children, error, hint, htmlFor, label }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-800" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-5 text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

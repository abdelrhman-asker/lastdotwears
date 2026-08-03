'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';

import { StatusMessage } from '@/components/ui/status-message';
import { verifyEmail } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/http-client';

interface VerifyEmailResultProps {
  token: string;
}

export function VerifyEmailResult({ token }: VerifyEmailResultProps) {
  const mutation = useMutation({ mutationFn: verifyEmail });

  useEffect(() => {
    if (token && mutation.isIdle) {
      mutation.mutate(token);
    }
  }, [mutation, token]);

  if (!token) {
    return <StatusMessage tone="error">This verification link is incomplete.</StatusMessage>;
  }

  if (mutation.isPending || mutation.isIdle) {
    return <StatusMessage>Confirming your email address…</StatusMessage>;
  }

  return (
    <div className="space-y-5">
      {mutation.isError ? (
        <StatusMessage tone="error">{errorMessage(mutation.error)}</StatusMessage>
      ) : (
        <StatusMessage tone="success">Your email address has been verified.</StatusMessage>
      )}
      <Link
        className="block bg-stone-950 px-5 py-3 text-center text-sm font-medium text-white"
        href="/login"
      >
        Continue to sign in
      </Link>
    </div>
  );
}

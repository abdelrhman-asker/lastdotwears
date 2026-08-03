'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { currentUserQueryKey, useCurrentUser } from '@/hooks/use-current-user';
import { ApiError, errorMessage } from '@/lib/api/http-client';
import { updateProfile } from '@/lib/api/users';
import { profileSchema, type ProfileInput } from '@/lib/validation/profile';
import type { User } from '@/types/user';

interface ProfilePanelProps {
  justRegistered: boolean;
}

function ProfileForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const form = useForm<ProfileInput>({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
    },
    resolver: zodResolver(profileSchema),
  });
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(currentUserQueryKey, updatedUser);
      form.reset({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone ?? '',
      });
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <form
      className="mt-8 space-y-5"
      noValidate
      onSubmit={form.handleSubmit((input) => {
        setRequestError(null);
        mutation.mutate(input);
      })}
    >
      {requestError ? <StatusMessage tone="error">{requestError}</StatusMessage> : null}
      {mutation.isSuccess ? (
        <StatusMessage tone="success">Your profile has been updated.</StatusMessage>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          error={form.formState.errors.firstName?.message}
          htmlFor="firstName"
          label="First name"
        >
          <Input autoComplete="given-name" id="firstName" {...form.register('firstName')} />
        </Field>
        <Field error={form.formState.errors.lastName?.message} htmlFor="lastName" label="Last name">
          <Input autoComplete="family-name" id="lastName" {...form.register('lastName')} />
        </Field>
      </div>
      <Field error={form.formState.errors.phone?.message} htmlFor="phone" label="Mobile number">
        <Input autoComplete="tel" id="phone" inputMode="tel" {...form.register('phone')} />
      </Field>
      <Field htmlFor="email" label="Email address">
        <Input disabled id="email" value={user.email} />
      </Field>
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}

export function ProfilePanel({ justRegistered }: ProfilePanelProps) {
  const userQuery = useCurrentUser();

  if (userQuery.isPending) {
    return <StatusMessage>Loading your account…</StatusMessage>;
  }

  if (userQuery.isError) {
    const expired = userQuery.error instanceof ApiError && userQuery.error.problem.status === 401;
    return (
      <StatusMessage tone="error">
        {expired ? 'Your session has ended.' : errorMessage(userQuery.error)}{' '}
        <Link className="font-medium underline" href="/login">
          Sign in
        </Link>
      </StatusMessage>
    );
  }

  const user = userQuery.data;
  return (
    <div>
      {justRegistered ? (
        <div className="mb-6">
          <StatusMessage tone="success">
            Your account is ready. Check your inbox to verify your email address.
          </StatusMessage>
        </div>
      ) : null}
      {!user.isEmailVerified ? (
        <div className="mb-6">
          <StatusMessage>
            Your email is not verified yet.{' '}
            <Link className="font-medium underline" href="/resend-verification">
              Send another verification link
            </Link>
          </StatusMessage>
        </div>
      ) : null}
      <div className="border-b border-stone-300 pb-7">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Profile</p>
          <h2 className="mt-3 font-serif text-5xl tracking-[-0.04em]">Personal details</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-500">
            Keep your contact information current for faster checkout and delivery updates.
          </p>
        </div>
      </div>
      <dl className="mt-7 grid gap-px bg-stone-300 sm:grid-cols-2">
        <div className="bg-white p-5">
          <dt className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Email status</dt>
          <dd className="mt-2 text-sm">
            {user.isEmailVerified ? 'Verified' : 'Verification needed'}
          </dd>
        </div>
        <div className="bg-white p-5">
          <dt className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Customer since</dt>
          <dd className="mt-2 text-sm">
            {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium' }).format(
              new Date(user.createdAt),
            )}
          </dd>
        </div>
      </dl>
      <ProfileForm user={user} />
    </div>
  );
}

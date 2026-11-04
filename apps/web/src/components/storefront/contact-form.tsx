'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { errorMessage } from '@/lib/api/http-client';
import { submitContactMessage } from '@/lib/api/settings';
import { contactSchema, type ContactInput } from '@/lib/validation/contact';

export function ContactForm() {
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', orderNumber: '', subject: '', message: '' },
  });
  const submission = useMutation({
    mutationFn: submitContactMessage,
    onSuccess: () => form.reset(),
  });

  return (
    <form
      className="border border-stone-300 bg-white p-6 sm:p-10"
      id="contact-form"
      onSubmit={form.handleSubmit((input) => submission.mutate(input))}
    >
      <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Send a message</p>
      <h2 className="mt-3 font-serif text-3xl tracking-tight">How can we help?</h2>
      {submission.isSuccess ? (
        <div className="mt-6">
          <StatusMessage tone="success">
            Thank you. Your message has been received and customer care will reply by email.
          </StatusMessage>
        </div>
      ) : null}
      {submission.isError ? (
        <div className="mt-6">
          <StatusMessage tone="error">{errorMessage(submission.error)}</StatusMessage>
        </div>
      ) : null}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field error={form.formState.errors.name?.message} htmlFor="contact-name" label="Name">
          <Input autoComplete="name" id="contact-name" {...form.register('name')} />
        </Field>
        <Field error={form.formState.errors.email?.message} htmlFor="contact-email" label="Email">
          <Input autoComplete="email" id="contact-email" type="email" {...form.register('email')} />
        </Field>
        <Field
          error={form.formState.errors.phone?.message}
          htmlFor="contact-phone"
          label="Phone (optional)"
        >
          <Input autoComplete="tel" id="contact-phone" {...form.register('phone')} />
        </Field>
        <Field
          error={form.formState.errors.orderNumber?.message}
          htmlFor="contact-order"
          label="Order number (optional)"
        >
          <Input id="contact-order" {...form.register('orderNumber')} />
        </Field>
        <div className="sm:col-span-2">
          <Field
            error={form.formState.errors.subject?.message}
            htmlFor="contact-subject"
            label="Subject"
          >
            <Input id="contact-subject" {...form.register('subject')} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            error={form.formState.errors.message?.message}
            htmlFor="contact-message"
            label="Message"
          >
            <textarea
              className="min-h-40 w-full resize-y border border-stone-300 bg-white p-3 text-base outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              id="contact-message"
              {...form.register('message')}
            />
          </Field>
        </div>
      </div>
      <Button className="mt-7" disabled={!isHydrated || submission.isPending} type="submit">
        {submission.isPending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}

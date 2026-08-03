'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
} from '@/hooks/use-addresses';
import { useShippingRates } from '@/hooks/use-checkout';
import { errorMessage } from '@/lib/api/http-client';
import { addressSchema, type AddressFormInput } from '@/lib/validation/address';
import type { Address } from '@/types/address';
import type { User } from '@/types/user';

export function AddressBookPanel({ user }: { user: User }) {
  const addresses = useAddresses();
  const shipping = useShippingRates();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const remove = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const [editor, setEditor] = useState<'create' | Address | null>(null);

  const addressList = addresses.data ?? [];
  const busy = create.isPending || update.isPending;
  const mutationError = create.error ?? update.error;

  const save = (input: AddressFormInput) => {
    if (editor === 'create') {
      create.mutate(input, { onSuccess: () => setEditor(null) });
    } else if (editor) {
      update.mutate({ id: editor.id, input }, { onSuccess: () => setEditor(null) });
    }
  };

  return (
    <section>
      <div className="flex flex-col justify-between gap-6 border-b border-stone-300 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Address book</p>
          <h2 className="mt-3 font-serif text-5xl tracking-[-0.04em]">Delivery addresses</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Save up to ten Egyptian delivery addresses and choose one as your checkout default.
          </p>
        </div>
        <Button
          disabled={addressList.length >= 10 || editor === 'create'}
          onClick={() => setEditor('create')}
        >
          Add address
        </Button>
      </div>

      {editor ? (
        <div className="mt-8 border border-stone-300 bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-serif text-3xl">
              {editor === 'create' ? 'New address' : `Edit ${editor.label}`}
            </h3>
            <button
              className="text-xs tracking-[0.12em] text-stone-500 uppercase hover:text-stone-950"
              onClick={() => setEditor(null)}
              type="button"
            >
              Close
            </button>
          </div>
          {mutationError ? (
            <div className="mt-5">
              <StatusMessage tone="error">{errorMessage(mutationError)}</StatusMessage>
            </div>
          ) : null}
          <AddressForm
            key={editor === 'create' ? 'create' : editor.id}
            address={editor === 'create' ? null : editor}
            busy={busy}
            onSubmit={save}
            rates={shipping.data ?? []}
            user={user}
          />
        </div>
      ) : null}

      {addresses.isPending || shipping.isPending ? (
        <div className="mt-8">
          <StatusMessage>Loading saved addresses…</StatusMessage>
        </div>
      ) : null}
      {addresses.isError || shipping.isError ? (
        <div className="mt-8">
          <StatusMessage tone="error">
            {errorMessage(addresses.error ?? shipping.error)}
          </StatusMessage>
        </div>
      ) : null}

      {!addresses.isPending && !addresses.isError && addressList.length === 0 ? (
        <div className="mt-8 border border-dashed border-stone-300 bg-white p-10 text-center">
          <h3 className="font-serif text-3xl">No saved addresses</h3>
          <p className="mt-3 text-sm text-stone-500">
            Add a delivery address to make your next checkout quicker.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {addressList.map((address) => (
          <article
            key={address.id}
            className={`border bg-white p-6 ${address.isDefault ? 'border-stone-950' : 'border-stone-300'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-serif text-2xl">{address.label}</h3>
                  {address.isDefault ? (
                    <span className="bg-stone-950 px-2 py-1 text-[9px] tracking-[0.14em] text-white uppercase">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm font-medium">
                  {address.recipientFirstName} {address.recipientLastName}
                </p>
                <address className="mt-2 text-sm leading-6 text-stone-500 not-italic">
                  {address.addressLine1}
                  {address.addressLine2 ? (
                    <>
                      <br />
                      {address.addressLine2}
                    </>
                  ) : null}
                  <br />
                  {address.city}, {address.governorateName}
                  {address.postalCode ? ` ${address.postalCode}` : ''}
                  <br />
                  {address.phone}
                </address>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-200 pt-5">
              <Button onClick={() => setEditor(address)} variant="secondary">
                Edit
              </Button>
              {!address.isDefault ? (
                <Button
                  disabled={setDefault.isPending}
                  onClick={() => setDefault.mutate(address.id)}
                  variant="ghost"
                >
                  Make default
                </Button>
              ) : null}
              <Button
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Delete the ${address.label} address?`)) {
                    remove.mutate(address.id, {
                      onSuccess: () => {
                        if (editor !== 'create' && editor?.id === address.id) setEditor(null);
                      },
                    });
                  }
                }}
                variant="ghost"
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      {setDefault.error || remove.error ? (
        <div className="mt-5">
          <StatusMessage tone="error">
            {errorMessage(setDefault.error ?? remove.error)}
          </StatusMessage>
        </div>
      ) : null}
    </section>
  );
}

function AddressForm({
  address,
  busy,
  onSubmit,
  rates,
  user,
}: {
  address: Address | null;
  busy: boolean;
  onSubmit: (input: AddressFormInput) => void;
  rates: Array<{ id: string; governorateCode: string; governorateName: string }>;
  user: User;
}) {
  const form = useForm<AddressFormInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: address?.label ?? '',
      recipientFirstName: address?.recipientFirstName ?? user.firstName,
      recipientLastName: address?.recipientLastName ?? user.lastName,
      phone: address?.phone ?? user.phone ?? '',
      governorateCode: address?.governorateCode ?? '',
      city: address?.city ?? '',
      addressLine1: address?.addressLine1 ?? '',
      addressLine2: address?.addressLine2 ?? '',
      postalCode: address?.postalCode ?? '',
      deliveryNotes: address?.deliveryNotes ?? '',
      isDefault: address?.isDefault ?? false,
    },
  });

  return (
    <form className="mt-7 space-y-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={form.formState.errors.label?.message} htmlFor="addressLabel" label="Label">
          <Input id="addressLabel" placeholder="Home" {...form.register('label')} />
        </Field>
        <Field
          error={form.formState.errors.phone?.message}
          htmlFor="addressPhone"
          label="Egyptian mobile number"
        >
          <Input autoComplete="tel" id="addressPhone" inputMode="tel" {...form.register('phone')} />
        </Field>
        <Field
          error={form.formState.errors.recipientFirstName?.message}
          htmlFor="recipientFirstName"
          label="Recipient first name"
        >
          <Input id="recipientFirstName" {...form.register('recipientFirstName')} />
        </Field>
        <Field
          error={form.formState.errors.recipientLastName?.message}
          htmlFor="recipientLastName"
          label="Recipient last name"
        >
          <Input id="recipientLastName" {...form.register('recipientLastName')} />
        </Field>
        <Field
          error={form.formState.errors.governorateCode?.message}
          htmlFor="addressGovernorate"
          label="Governorate"
        >
          <select
            className="h-12 w-full border border-stone-300 bg-white px-3 text-base"
            id="addressGovernorate"
            {...form.register('governorateCode')}
          >
            <option value="">Choose a governorate</option>
            {rates.map((rate) => (
              <option key={rate.id} value={rate.governorateCode}>
                {rate.governorateName}
              </option>
            ))}
          </select>
        </Field>
        <Field
          error={form.formState.errors.city?.message}
          htmlFor="addressCity"
          label="City / district"
        >
          <Input autoComplete="address-level2" id="addressCity" {...form.register('city')} />
        </Field>
        <div className="sm:col-span-2">
          <Field
            error={form.formState.errors.addressLine1?.message}
            htmlFor="addressLine1"
            label="Street address"
          >
            <Input
              autoComplete="address-line1"
              id="addressLine1"
              {...form.register('addressLine1')}
            />
          </Field>
        </div>
        <Field
          error={form.formState.errors.addressLine2?.message}
          htmlFor="addressLine2"
          label="Apartment, floor, landmark (optional)"
        >
          <Input
            autoComplete="address-line2"
            id="addressLine2"
            {...form.register('addressLine2')}
          />
        </Field>
        <Field
          error={form.formState.errors.postalCode?.message}
          htmlFor="addressPostalCode"
          label="Postal code (optional)"
        >
          <Input
            autoComplete="postal-code"
            id="addressPostalCode"
            {...form.register('postalCode')}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            error={form.formState.errors.deliveryNotes?.message}
            htmlFor="addressNotes"
            label="Delivery notes (optional)"
          >
            <textarea
              className="min-h-24 w-full border border-stone-300 bg-white p-3 text-base"
              id="addressNotes"
              {...form.register('deliveryNotes')}
            />
          </Field>
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          className="size-4 accent-stone-950"
          type="checkbox"
          {...form.register('isDefault')}
        />
        Use as my default delivery address
      </label>
      <Button disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Save address'}
      </Button>
    </form>
  );
}

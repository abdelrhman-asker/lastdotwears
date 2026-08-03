'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import {
  createShippingRate,
  deleteShippingRate,
  listAdminShippingRates,
  updateShippingRate,
} from '@/lib/api/admin';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import type { ShippingRate, ShippingRateWriteInput } from '@/types/admin';
const root = ['admin', 'shipping'] as const;
export function ShippingPanel() {
  const qc = useQueryClient();
  const rates = useQuery({ queryKey: root, queryFn: listAdminShippingRates, retry: false });
  const [editor, setEditor] = useState<'create' | ShippingRate | null>(null);
  const create = useMutation({
    mutationFn: createShippingRate,
    onSuccess: () => {
      setEditor(null);
      void qc.invalidateQueries({ queryKey: root });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ShippingRateWriteInput }) =>
      updateShippingRate(id, input),
    onSuccess: () => {
      setEditor(null);
      void qc.invalidateQueries({ queryKey: root });
    },
  });
  const remove = useMutation({
    mutationFn: deleteShippingRate,
    onSuccess: () => qc.invalidateQueries({ queryKey: root }),
  });
  return (
    <div>
      <div className="flex justify-between gap-5">
        <div>
          <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Commerce</p>
          <h1 className="mt-2 font-serif text-4xl">Shipping rates</h1>
          <p className="mt-3 text-sm text-stone-600">
            Manage fees and delivery estimates for Egyptian governorates.
          </p>
        </div>
        <Button onClick={() => setEditor('create')}>New rate</Button>
      </div>
      {editor ? (
        <ShippingEditor
          error={create.error ?? update.error}
          pending={create.isPending || update.isPending}
          rate={editor === 'create' ? null : editor}
          onCancel={() => setEditor(null)}
          onSave={(input) =>
            editor === 'create' ? create.mutate(input) : update.mutate({ id: editor.id, input })
          }
        />
      ) : null}
      {remove.error ? (
        <div className="mt-6">
          <StatusMessage tone="error">{errorMessage(remove.error)}</StatusMessage>
        </div>
      ) : null}
      {rates.isPending ? (
        <div className="mt-8">
          <StatusMessage>Loading shipping rates…</StatusMessage>
        </div>
      ) : null}
      {rates.isError ? (
        <div className="mt-8">
          <StatusMessage tone="error">{errorMessage(rates.error)}</StatusMessage>
        </div>
      ) : null}
      {rates.data ? (
        <div className="mt-8 overflow-hidden border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-stone-50 text-[10px] tracking-wider text-stone-500 uppercase">
                <tr>
                  <th className="px-5 py-4">Governorate</th>
                  <th className="px-5 py-4">Fee</th>
                  <th className="px-5 py-4">Estimate</th>
                  <th className="px-5 py-4">State</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rates.data.map((rate) => (
                  <tr key={rate.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{rate.governorateName}</p>
                      <p className="text-xs text-stone-500">{rate.governorateCode}</p>
                    </td>
                    <td className="px-5 py-4">{formatEgp(rate.feePiasters)}</td>
                    <td className="px-5 py-4">
                      {rate.estimatedMinDays}–{rate.estimatedMaxDays} days
                    </td>
                    <td className="px-5 py-4">{rate.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="mr-4 underline" onClick={() => setEditor(rate)}>
                        Edit
                      </button>
                      <button
                        className="underline"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete ${rate.governorateName}? Used rates must be deactivated instead.`,
                            )
                          )
                            remove.mutate(rate.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
function ShippingEditor({
  rate,
  error,
  pending,
  onCancel,
  onSave,
}: {
  rate: ShippingRate | null;
  error: unknown;
  pending: boolean;
  onCancel: () => void;
  onSave: (input: ShippingRateWriteInput) => void;
}) {
  const [code, setCode] = useState(rate?.governorateCode ?? '');
  const [name, setName] = useState(rate?.governorateName ?? '');
  const [fee, setFee] = useState(rate ? String(rate.feePiasters / 100) : '60');
  const [min, setMin] = useState(String(rate?.estimatedMinDays ?? 1));
  const [max, setMax] = useState(String(rate?.estimatedMaxDays ?? 3));
  const [active, setActive] = useState(rate?.isActive ?? true);
  const [localError, setLocalError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(fee),
      minDays = Number(min),
      maxDays = Number(max);
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code) ||
      !name.trim() ||
      amount < 0 ||
      minDays < 1 ||
      maxDays < minDays
    ) {
      setLocalError('Enter a valid code, name, fee, and delivery range.');
      return;
    }
    setLocalError(null);
    onSave({
      governorateCode: code,
      governorateName: name.trim(),
      feePiasters: Math.round(amount * 100),
      estimatedMinDays: minDays,
      estimatedMaxDays: maxDays,
      isActive: active,
    });
  };
  return (
    <form className="mt-7 border border-stone-300 bg-white p-6" onSubmit={submit}>
      <div className="flex justify-between">
        <h2 className="font-serif text-2xl">{rate ? 'Edit shipping rate' : 'New shipping rate'}</h2>
        <button className="text-xs underline" onClick={onCancel} type="button">
          Close
        </button>
      </div>
      {localError || error ? (
        <div className="mt-4">
          <StatusMessage tone="error">{localError ?? errorMessage(error)}</StatusMessage>
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Label text="Governorate code">
          <Input
            disabled={Boolean(rate)}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            value={code}
          />
        </Label>
        <Label text="Governorate name">
          <Input onChange={(e) => setName(e.target.value)} value={name} />
        </Label>
        <Label text="Fee EGP">
          <Input inputMode="decimal" onChange={(e) => setFee(e.target.value)} value={fee} />
        </Label>
        <Label text="Minimum days">
          <Input min="1" onChange={(e) => setMin(e.target.value)} type="number" value={min} />
        </Label>
        <Label text="Maximum days">
          <Input min="1" onChange={(e) => setMax(e.target.value)} type="number" value={max} />
        </Label>
      </div>
      <label className="mt-5 flex gap-2 text-sm">
        <input checked={active} onChange={(e) => setActive(e.target.checked)} type="checkbox" />
        Rate is active
      </label>
      <Button className="mt-6" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Save rate'}
      </Button>
    </form>
  );
}
function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="text-[10px] tracking-[0.12em] text-stone-500 uppercase">
      {text}
      <div className="mt-2 normal-case tracking-normal">{children}</div>
    </label>
  );
}

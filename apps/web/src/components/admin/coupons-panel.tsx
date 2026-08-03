'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '@/lib/api/admin';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import type { Coupon, CouponWriteInput } from '@/types/admin';

const couponRoot = ['admin', 'coupons'] as const;
export function CouponsPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const [editor, setEditor] = useState<'create' | Coupon | null>(null);
  const coupons = useQuery({
    queryKey: [...couponRoot, { page, search, active }],
    queryFn: () =>
      listCoupons({
        page,
        ...(search ? { search } : {}),
        ...(active ? { isActive: active === 'true' } : {}),
      }),
    retry: false,
  });
  const create = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      setEditor(null);
      void queryClient.invalidateQueries({ queryKey: couponRoot });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CouponWriteInput }) => updateCoupon(id, input),
    onSuccess: () => {
      setEditor(null);
      void queryClient.invalidateQueries({ queryKey: couponRoot });
    },
  });
  const remove = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponRoot }),
  });
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };
  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Commerce</p>
          <h1 className="mt-2 font-serif text-4xl">Coupons</h1>
          <p className="mt-3 text-sm text-stone-600">
            Control discount value, eligibility, validity windows, and usage limits.
          </p>
        </div>
        <Button onClick={() => setEditor('create')}>New coupon</Button>
      </div>
      {editor ? (
        <CouponEditor
          coupon={editor === 'create' ? null : editor}
          error={create.error ?? update.error}
          pending={create.isPending || update.isPending}
          onCancel={() => setEditor(null)}
          onSave={(input) =>
            editor === 'create' ? create.mutate(input) : update.mutate({ id: editor.id, input })
          }
        />
      ) : null}
      <form className="my-7 flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
        <Input
          className="max-w-md"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search coupon code"
          value={searchInput}
        />
        <select
          className="h-12 border border-stone-300 bg-white px-3 text-sm"
          onChange={(e) => {
            setPage(1);
            setActive(e.target.value as typeof active);
          }}
          value={active}
        >
          <option value="">All coupons</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <Button type="submit">Search</Button>
      </form>
      {remove.error ? (
        <div className="mb-5">
          <StatusMessage tone="error">{errorMessage(remove.error)}</StatusMessage>
        </div>
      ) : null}
      {coupons.isPending ? <StatusMessage>Loading coupons…</StatusMessage> : null}
      {coupons.isError ? (
        <StatusMessage tone="error">{errorMessage(coupons.error)}</StatusMessage>
      ) : null}
      {coupons.data ? (
        <>
          <div className="overflow-hidden border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-stone-50 text-[10px] tracking-wider text-stone-500 uppercase">
                  <tr>
                    <th className="px-5 py-4">Code</th>
                    <th className="px-5 py-4">Discount</th>
                    <th className="px-5 py-4">Eligibility</th>
                    <th className="px-5 py-4">Usage</th>
                    <th className="px-5 py-4">State</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {coupons.data.items.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="px-5 py-4">
                        <p className="font-medium">{coupon.code}</p>
                        <p className="mt-1 max-w-xs truncate text-xs text-stone-500">
                          {coupon.description ?? '—'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {coupon.discountType === 'PERCENTAGE'
                          ? `${coupon.value}%`
                          : formatEgp(coupon.value)}
                      </td>
                      <td className="px-5 py-4">
                        Min {formatEgp(coupon.minimumSubtotalPiasters)}
                        <p className="mt-1 text-xs text-stone-500">
                          {coupon.perCustomerLimit}/customer
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {coupon.timesUsed}
                        {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                      </td>
                      <td className="px-5 py-4">{coupon.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="px-5 py-4 text-right">
                        <button className="mr-4 underline" onClick={() => setEditor(coupon)}>
                          Edit
                        </button>
                        <button
                          className="underline"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete ${coupon.code}? Used coupons must be deactivated instead.`,
                              )
                            )
                              remove.mutate(coupon.id);
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
          <div className="mt-6 flex justify-between">
            <Button disabled={page <= 1} onClick={() => setPage((v) => v - 1)} variant="secondary">
              Previous
            </Button>
            <span className="text-xs text-stone-500">
              Page {coupons.data.page} of {Math.max(1, coupons.data.totalPages)}
            </span>
            <Button
              disabled={page >= coupons.data.totalPages}
              onClick={() => setPage((v) => v + 1)}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
function CouponEditor({
  coupon,
  error,
  pending,
  onCancel,
  onSave,
}: {
  coupon: Coupon | null;
  error: unknown;
  pending: boolean;
  onCancel: () => void;
  onSave: (input: CouponWriteInput) => void;
}) {
  const [code, setCode] = useState(coupon?.code ?? '');
  const [description, setDescription] = useState(coupon?.description ?? '');
  const [type, setType] = useState<Coupon['discountType']>(coupon?.discountType ?? 'PERCENTAGE');
  const [value, setValue] = useState(
    coupon ? String(type === 'PERCENTAGE' ? coupon.value : coupon.value / 100) : '10',
  );
  const [minimum, setMinimum] = useState(
    coupon ? String(coupon.minimumSubtotalPiasters / 100) : '0',
  );
  const [maximum, setMaximum] = useState(
    coupon?.maximumDiscountPiasters ? String(coupon.maximumDiscountPiasters / 100) : '',
  );
  const [starts, setStarts] = useState(toLocal(coupon?.startsAt));
  const [ends, setEnds] = useState(toLocal(coupon?.endsAt));
  const [usage, setUsage] = useState(coupon?.usageLimit ? String(coupon.usageLimit) : '');
  const [perCustomer, setPerCustomer] = useState(String(coupon?.perCustomerLimit ?? 1));
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [localError, setLocalError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const numericValue = Number(value),
      min = Number(minimum),
      max = maximum ? Number(maximum) : null;
    if (
      !code.trim() ||
      !Number.isFinite(numericValue) ||
      numericValue <= 0 ||
      !Number.isFinite(min) ||
      min < 0
    ) {
      setLocalError('Enter a code and valid positive discount values.');
      return;
    }
    if (type === 'PERCENTAGE' && (!Number.isInteger(numericValue) || numericValue > 100)) {
      setLocalError('Percentage must be a whole number from 1 to 100.');
      return;
    }
    if (starts && ends && new Date(ends) <= new Date(starts)) {
      setLocalError('End date must be after the start date.');
      return;
    }
    setLocalError(null);
    onSave({
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      discountType: type,
      value: type === 'PERCENTAGE' ? numericValue : Math.round(numericValue * 100),
      minimumSubtotalPiasters: Math.round(min * 100),
      maximumDiscountPiasters: max === null ? null : Math.round(max * 100),
      startsAt: starts ? new Date(starts).toISOString() : null,
      endsAt: ends ? new Date(ends).toISOString() : null,
      usageLimit: usage ? Number(usage) : null,
      perCustomerLimit: Number(perCustomer),
      isActive,
    });
  };
  return (
    <form className="mt-7 border border-stone-300 bg-white p-6" onSubmit={submit}>
      <div className="flex justify-between">
        <h2 className="font-serif text-2xl">{coupon ? 'Edit coupon' : 'New coupon'}</h2>
        <button className="text-xs underline" onClick={onCancel} type="button">
          Close
        </button>
      </div>
      {localError || error ? (
        <div className="mt-4">
          <StatusMessage tone="error">{localError ?? errorMessage(error)}</StatusMessage>
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <L label="Code">
          <Input onChange={(e) => setCode(e.target.value.toUpperCase())} value={code} />
        </L>
        <L label="Discount type">
          <select
            className="h-12 w-full border border-stone-300 bg-white px-3"
            onChange={(e) => {
              const next = e.target.value as Coupon['discountType'];
              setType(next);
              setValue(next === 'PERCENTAGE' ? '10' : '100');
            }}
            value={type}
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed EGP amount</option>
          </select>
        </L>
        <L label={type === 'PERCENTAGE' ? 'Percent' : 'Discount EGP'}>
          <Input inputMode="decimal" onChange={(e) => setValue(e.target.value)} value={value} />
        </L>
        <L label="Minimum subtotal EGP">
          <Input inputMode="decimal" onChange={(e) => setMinimum(e.target.value)} value={minimum} />
        </L>
        <L label="Maximum discount EGP (optional)">
          <Input inputMode="decimal" onChange={(e) => setMaximum(e.target.value)} value={maximum} />
        </L>
        <L label="Uses per customer">
          <Input
            inputMode="numeric"
            min="1"
            onChange={(e) => setPerCustomer(e.target.value)}
            type="number"
            value={perCustomer}
          />
        </L>
        <L label="Start (optional)">
          <Input onChange={(e) => setStarts(e.target.value)} type="datetime-local" value={starts} />
        </L>
        <L label="End (optional)">
          <Input onChange={(e) => setEnds(e.target.value)} type="datetime-local" value={ends} />
        </L>
        <L label="Total usage limit (optional)">
          <Input
            inputMode="numeric"
            min="1"
            onChange={(e) => setUsage(e.target.value)}
            type="number"
            value={usage}
          />
        </L>
        <div className="sm:col-span-2 lg:col-span-3">
          <L label="Description">
            <Input onChange={(e) => setDescription(e.target.value)} value={description} />
          </L>
        </div>
      </div>
      <label className="mt-5 flex gap-2 text-sm">
        <input checked={isActive} onChange={(e) => setIsActive(e.target.checked)} type="checkbox" />
        Coupon is active
      </label>
      <Button className="mt-6" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Save coupon'}
      </Button>
    </form>
  );
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] tracking-[0.12em] text-stone-500 uppercase">
      {label}
      <div className="mt-2 normal-case tracking-normal">{children}</div>
    </label>
  );
}
function toLocal(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

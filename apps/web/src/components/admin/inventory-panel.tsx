'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { adjustInventory, listInventory } from '@/lib/api/catalog';
import { errorMessage } from '@/lib/api/http-client';
import type { InventoryItem } from '@/types/catalog';

const inventoryRoot = ['admin', 'inventory'] as const;

export function InventoryPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const inventory = useQuery({
    queryKey: [...inventoryRoot, { search, lowStock }],
    queryFn: () => listInventory({ search, lowStock }),
    retry: false,
  });
  const adjust = useMutation({
    mutationFn: ({
      variantId,
      quantityDelta,
      reason: adjustmentReason,
    }: {
      variantId: string;
      quantityDelta: number;
      reason: string;
    }) =>
      adjustInventory(variantId, {
        quantityDelta,
        type: quantityDelta > 0 ? 'RESTOCK' : 'ADJUSTMENT',
        reason: adjustmentReason,
      }),
    onSuccess: async () => {
      setSelected(null);
      setDelta('');
      setReason('');
      await queryClient.invalidateQueries({ queryKey: inventoryRoot });
    },
  });

  function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantityDelta = Number(delta);
    if (
      !selected ||
      !Number.isInteger(quantityDelta) ||
      quantityDelta === 0 ||
      reason.trim().length < 3
    )
      return;
    adjust.mutate({ variantId: selected.variantId, quantityDelta, reason: reason.trim() });
  }

  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Catalog</p>
      <h1 className="mt-2 text-3xl font-light tracking-tight">Inventory</h1>
      <p className="mt-3 text-sm text-stone-600">
        Every adjustment is atomic and recorded in the inventory ledger.
      </p>
      <div className="my-7 flex flex-col gap-3 sm:flex-row">
        <Input
          className="max-w-md"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search product, SKU, or color"
          value={search}
        />
        <label className="flex min-h-12 items-center gap-3 border border-stone-300 bg-white px-4 text-sm">
          <input
            checked={lowStock}
            onChange={(event) => setLowStock(event.target.checked)}
            type="checkbox"
          />{' '}
          Low stock only
        </label>
      </div>
      {adjust.isError ? (
        <div className="mb-5">
          <StatusMessage tone="error">{errorMessage(adjust.error)}</StatusMessage>
        </div>
      ) : null}
      {selected ? (
        <form
          className="mb-7 grid gap-4 border border-stone-300 bg-white p-5 sm:grid-cols-[1fr_180px_1.5fr_auto] sm:items-end"
          onSubmit={submitAdjustment}
        >
          <div>
            <p className="text-xs text-stone-500 uppercase">Adjusting</p>
            <p className="mt-2 font-medium">{selected.productName}</p>
            <p className="text-sm text-stone-500">
              {selected.sku} · Current {selected.stockQuantity}
            </p>
          </div>
          <Field htmlFor="quantityDelta" label="Signed change">
            <Input
              id="quantityDelta"
              onChange={(event) => setDelta(event.target.value)}
              placeholder="+10 or -2"
              value={delta}
            />
          </Field>
          <Field htmlFor="reason" label="Reason">
            <Input
              id="reason"
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </Field>
          <div className="flex gap-2">
            <Button disabled={adjust.isPending} type="submit">
              Apply
            </Button>
            <Button onClick={() => setSelected(null)} variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      {inventory.isPending ? <StatusMessage>Loading inventory…</StatusMessage> : null}
      {inventory.isError ? (
        <StatusMessage tone="error">{errorMessage(inventory.error)}</StatusMessage>
      ) : null}
      {inventory.data ? (
        <div className="overflow-hidden border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-stone-50 text-xs tracking-wider text-stone-500 uppercase">
                <tr>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">Variant</th>
                  <th className="px-5 py-4">SKU</th>
                  <th className="px-5 py-4">Stock</th>
                  <th className="px-5 py-4">Threshold</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {inventory.data.items.map((item) => {
                  const low = item.stockQuantity <= item.lowStockThreshold;
                  return (
                    <tr key={item.variantId}>
                      <td className="px-5 py-4 font-medium">{item.productName}</td>
                      <td className="px-5 py-4">
                        {item.size} / {item.colorName}
                      </td>
                      <td className="px-5 py-4 text-stone-600">{item.sku}</td>
                      <td className={low ? 'px-5 py-4 font-medium text-red-700' : 'px-5 py-4'}>
                        {item.stockQuantity}
                      </td>
                      <td className="px-5 py-4">{item.lowStockThreshold}</td>
                      <td className="px-5 py-4 text-right">
                        <Button onClick={() => setSelected(item)} variant="secondary">
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import {
  confirmAdminInstaPay,
  getAdminOrder,
  getAdminPaymentProof,
  updateAdminOrderStatus,
} from '@/lib/api/admin';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import { nextOrderStatuses } from '@/lib/admin/order-transitions';
import type { OrderStatus } from '@/types/orders';

export function OrderDetailPanel({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: () => getAdminOrder(id),
    retry: false,
  });
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(false);
  const [reference, setReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const refresh = (updated: Awaited<ReturnType<typeof getAdminOrder>>) => {
    queryClient.setQueryData(['admin', 'orders', id], updated);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };
  const transition = useMutation({
    mutationFn: () =>
      updateAdminOrderStatus(id, {
        status: nextStatus as OrderStatus,
        note: note || null,
        ...(nextStatus === 'REFUNDED' ? { restockItems: restock } : {}),
      }),
    onSuccess: (updated) => {
      refresh(updated);
      setNextStatus('');
      setNote('');
      setRestock(false);
    },
  });
  const confirm = useMutation({
    mutationFn: () =>
      confirmAdminInstaPay(id, { reference: reference || null, note: paymentNote || null }),
    onSuccess: (updated) => {
      refresh(updated);
      setReference('');
      setPaymentNote('');
    },
  });
  if (order.isPending) return <StatusMessage>Loading order…</StatusMessage>;
  if (order.isError) return <StatusMessage tone="error">{errorMessage(order.error)}</StatusMessage>;
  const data = order.data;
  const available = nextOrderStatuses(data.status);
  return (
    <div className="print:bg-white">
      <div className="print:hidden">
        <Link className="text-xs underline" href="/admin/orders">
          ← Back to orders
        </Link>
      </div>
      <div className="mt-5 flex flex-col justify-between gap-5 border-b border-stone-300 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs tracking-[0.18em] text-stone-500 uppercase">
            Order {data.orderNumber}
          </p>
          <h1 className="mt-2 font-serif text-4xl">Order detail</h1>
          <p className="mt-2 text-sm text-stone-500">
            Invoice {data.invoiceNumber} ·{' '}
            {new Intl.DateTimeFormat('en-EG', { dateStyle: 'long', timeStyle: 'short' }).format(
              new Date(data.placedAt),
            )}
          </p>
        </div>
        <Button className="print:hidden" onClick={() => window.print()} variant="secondary">
          Print invoice
        </Button>
      </div>
      <div className="mt-8 grid gap-8 print:block xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <section className="border border-stone-200 bg-white p-6">
            <h2 className="font-serif text-2xl">Items</h2>
            <div className="mt-5 divide-y divide-stone-100">
              {data.items.map((item) => (
                <div className="flex justify-between gap-5 py-4" key={item.id}>
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {item.sku} · {item.colorName} · {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                  <span>{formatEgp(item.lineTotalPiasters)}</span>
                </div>
              ))}
            </div>
            <dl className="ml-auto mt-5 max-w-sm space-y-2 border-t border-stone-200 pt-5 text-sm">
              <Row label="Subtotal" value={formatEgp(data.subtotalPiasters)} />
              <Row label="Discount" value={`−${formatEgp(data.discountPiasters)}`} />
              <Row label="Shipping" value={formatEgp(data.shippingPiasters)} />
              <Row label="Total" value={formatEgp(data.totalPiasters)} strong />
            </dl>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="border border-stone-200 bg-white p-6">
              <h2 className="font-serif text-2xl">Customer</h2>
              <p className="mt-4 text-sm">
                {data.customerFirstName} {data.customerLastName}
              </p>
              <p className="mt-2 text-sm text-stone-500">
                {data.customerEmail}
                <br />
                {data.customerPhone}
              </p>
            </div>
            <div className="border border-stone-200 bg-white p-6">
              <h2 className="font-serif text-2xl">Delivery</h2>
              <address className="mt-4 text-sm leading-6 text-stone-500 not-italic">
                {data.shippingAddressLine1}
                {data.shippingAddressLine2 ? (
                  <>
                    <br />
                    {data.shippingAddressLine2}
                  </>
                ) : null}
                <br />
                {data.shippingCity}, {data.shippingGovernorateName}
                {data.shippingPostalCode ? ` ${data.shippingPostalCode}` : ''}
              </address>
              {data.deliveryNotes ? (
                <p className="mt-3 text-xs text-stone-500">{data.deliveryNotes}</p>
              ) : null}
            </div>
          </section>
        </div>
        <aside className="space-y-5 print:hidden">
          <section className="border border-stone-200 bg-white p-6">
            <h2 className="font-serif text-2xl">Status</h2>
            <p className="mt-4 text-sm">
              Order: <strong>{data.status.replaceAll('_', ' ')}</strong>
            </p>
            <p className="mt-2 text-sm">
              Payment: <strong>{data.paymentStatus.replaceAll('_', ' ')}</strong>
            </p>
            <p className="mt-2 text-xs text-stone-500">{data.paymentMethod.replaceAll('_', ' ')}</p>
          </section>
          {data.paymentMethod === 'INSTAPAY' && data.status === 'WAITING_FOR_PAYMENT' ? (
            data.payment.proofSubmittedAt ? (
              <section className="border border-amber-300 bg-amber-50 p-6">
                <h2 className="font-serif text-2xl">Review InstaPay receipt</h2>
                <p className="mt-2 text-xs text-stone-600">
                  Submitted{' '}
                  {new Intl.DateTimeFormat('en-EG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(data.payment.proofSubmittedAt))}
                </p>
                <AdminPaymentProofImage id={data.id} orderNumber={data.orderNumber} />
                <Input
                  className="mt-5"
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Transfer reference"
                  value={reference}
                />
                <textarea
                  className="mt-3 min-h-20 w-full border border-stone-300 bg-white p-3 text-sm"
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Confirmation note"
                  value={paymentNote}
                />
                {confirm.error ? (
                  <p className="mt-3 text-xs text-red-700">{errorMessage(confirm.error)}</p>
                ) : null}
                <Button
                  className="mt-4 w-full"
                  disabled={confirm.isPending}
                  onClick={() => confirm.mutate()}
                >
                  Confirm payment
                </Button>
              </section>
            ) : (
              <section className="border border-stone-300 bg-white p-6">
                <h2 className="font-serif text-2xl">Waiting for receipt</h2>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  The customer has not submitted an InstaPay transfer image yet. Payment cannot be
                  confirmed until the receipt is uploaded.
                </p>
              </section>
            )
          ) : null}
          {available.length ? (
            <section className="border border-stone-200 bg-white p-6">
              <h2 className="font-serif text-2xl">Update order</h2>
              <select
                className="mt-5 h-12 w-full border border-stone-300 bg-white px-3 text-sm"
                onChange={(e) => setNextStatus(e.target.value as OrderStatus | '')}
                value={nextStatus}
              >
                <option value="">Choose next status</option>
                {available.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
              <textarea
                className="mt-3 min-h-20 w-full border border-stone-300 p-3 text-sm"
                onChange={(e) => setNote(e.target.value)}
                placeholder="Audit note (optional)"
                value={note}
              />
              {nextStatus === 'REFUNDED' ? (
                <label className="mt-3 flex gap-2 text-xs">
                  <input
                    checked={restock}
                    onChange={(e) => setRestock(e.target.checked)}
                    type="checkbox"
                  />
                  Return items to inventory
                </label>
              ) : null}
              {transition.error ? (
                <p className="mt-3 text-xs text-red-700">{errorMessage(transition.error)}</p>
              ) : null}
              <Button
                className="mt-4 w-full"
                disabled={!nextStatus || transition.isPending}
                onClick={() => transition.mutate()}
              >
                Apply status
              </Button>
            </section>
          ) : null}
          <section className="border border-stone-200 bg-white p-6">
            <h2 className="font-serif text-2xl">Timeline</h2>
            <ol className="mt-5 space-y-4">
              {data.statusEvents.map((event) => (
                <li className="border-l border-stone-300 pl-4" key={event.id}>
                  <p className="text-xs font-medium">{event.toStatus.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-[10px] text-stone-500">
                    {new Intl.DateTimeFormat('en-EG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(event.createdAt))}
                  </p>
                  {event.note ? <p className="mt-1 text-xs text-stone-500">{event.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AdminPaymentProofImage({ id, orderNumber }: { id: string; orderNumber: string }) {
  const proof = useQuery({
    queryKey: ['admin', 'orders', id, 'payment-proof'],
    queryFn: () => getAdminPaymentProof(id),
    retry: 1,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!proof.data) return;
    const url = URL.createObjectURL(proof.data);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [proof.data]);

  if (proof.isError) {
    return (
      <div className="mt-5">
        <StatusMessage tone="error">{errorMessage(proof.error)}</StatusMessage>
      </div>
    );
  }
  if (proof.isPending || !imageUrl) {
    return (
      <div
        aria-label="Loading transfer receipt"
        className="mt-5 h-48 w-full animate-pulse bg-amber-100"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`Transfer receipt for order ${orderNumber}`}
      className="mt-5 max-h-[520px] w-full border border-amber-200 bg-white object-contain"
      src={imageUrl}
    />
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between ${strong ? 'border-t border-stone-300 pt-3 font-medium' : ''}`}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

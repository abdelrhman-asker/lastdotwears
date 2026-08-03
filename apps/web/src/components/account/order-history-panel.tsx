'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { StatusMessage } from '@/components/ui/status-message';
import { useOrderHistory } from '@/hooks/use-checkout';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import type { OrderStatus } from '@/types/orders';

const statuses: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'All orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'WAITING_FOR_PAYMENT', label: 'Waiting for payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export function OrderHistoryPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const orders = useOrderHistory(page, status || undefined);

  return (
    <section>
      <div className="flex flex-col justify-between gap-6 border-b border-stone-300 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Order history</p>
          <h2 className="mt-3 font-serif text-5xl tracking-[-0.04em]">Your orders</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Review delivery progress, payment state, order details, and printable invoices.
          </p>
        </div>
        <label className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">
          Status
          <select
            className="mt-2 block h-11 min-w-52 border border-stone-300 bg-white px-3 text-sm normal-case tracking-normal"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as '' | OrderStatus);
              setPage(1);
            }}
          >
            {statuses.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {orders.isPending ? (
        <div className="mt-8">
          <StatusMessage>Loading orders…</StatusMessage>
        </div>
      ) : null}
      {orders.isError ? (
        <div className="mt-8">
          <StatusMessage tone="error">{errorMessage(orders.error)}</StatusMessage>
        </div>
      ) : null}

      {orders.data && orders.data.items.length === 0 ? (
        <div className="mt-8 border border-dashed border-stone-300 bg-white p-10 text-center">
          <h3 className="font-serif text-3xl">No orders found</h3>
          <p className="mt-3 text-sm text-stone-500">
            {status ? 'No orders match this status.' : 'Your completed checkouts will appear here.'}
          </p>
          {!status ? (
            <Link
              className="mt-6 inline-block text-xs tracking-[0.14em] uppercase underline"
              href="/products"
            >
              Explore the collection
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {orders.data?.items.map((order) => (
          <article key={order.id} className="border border-stone-300 bg-white p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <p className="text-[10px] tracking-[0.15em] text-stone-500 uppercase">
                  {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium' }).format(
                    new Date(order.placedAt),
                  )}
                </p>
                <h3 className="mt-2 font-serif text-2xl">{order.orderNumber}</h3>
                <p className="mt-2 text-xs text-stone-500">
                  {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
                  {formatEgp(order.totalPiasters)}
                </p>
              </div>
              <div className="sm:text-right">
                <OrderStatusBadge status={order.status} />
                <p className="mt-2 text-[10px] tracking-[0.12em] text-stone-500 uppercase">
                  Payment: {order.paymentStatus.replaceAll('_', ' ').toLowerCase()}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-y border-stone-200 py-5">
              {order.previewItems.map((item, index) => (
                <div
                  className="flex min-w-0 items-center gap-3"
                  key={`${item.productSlug}-${index}`}
                >
                  <div className="relative size-14 shrink-0 overflow-hidden bg-stone-100">
                    {item.imageUrl ? (
                      <Image
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                        src={item.imageUrl}
                      />
                    ) : null}
                  </div>
                  <div className="max-w-40">
                    <p className="truncate text-xs">{item.productName}</p>
                    <p className="mt-1 text-[10px] text-stone-500">Qty {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center bg-stone-950 px-5 text-xs tracking-wide text-white"
                href={`/orders/${order.orderNumber}`}
              >
                View order
              </Link>
              <Link
                className="inline-flex min-h-11 items-center border border-stone-300 px-5 text-xs tracking-wide"
                href={`/orders/${order.orderNumber}/invoice`}
              >
                Invoice
              </Link>
            </div>
          </article>
        ))}
      </div>

      {orders.data && orders.data.totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-between border-t border-stone-300 pt-6">
          <Button
            disabled={page <= 1 || orders.isFetching}
            onClick={() => setPage((value) => value - 1)}
            variant="secondary"
          >
            Previous
          </Button>
          <span className="text-xs text-stone-500">
            Page {orders.data.page} of {orders.data.totalPages}
          </span>
          <Button
            disabled={page >= orders.data.totalPages || orders.isFetching}
            onClick={() => setPage((value) => value + 1)}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const attention = status === 'WAITING_FOR_PAYMENT' || status === 'PENDING';
  const complete = status === 'DELIVERED' || status === 'PAID';
  const closed = status === 'CANCELLED' || status === 'REFUNDED';
  return (
    <span
      className={`inline-block px-3 py-1.5 text-[9px] tracking-[0.14em] uppercase ${attention ? 'bg-amber-100 text-amber-900' : complete ? 'bg-emerald-100 text-emerald-900' : closed ? 'bg-stone-200 text-stone-600' : 'bg-stone-950 text-white'}`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}

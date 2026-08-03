'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { listAdminOrders } from '@/lib/api/admin';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import type { OrderStatus, PaymentStatus } from '@/types/orders';

const orderStatuses: OrderStatus[] = [
  'PENDING',
  'WAITING_FOR_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];
const paymentStatuses: PaymentStatus[] = [
  'PENDING',
  'WAITING_FOR_PAYMENT',
  'PAID',
  'CANCELLED',
  'REFUNDED',
];

export function OrdersPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('');
  const [page, setPage] = useState(1);
  const orders = useQuery({
    queryKey: ['admin', 'orders', { page, search, status, paymentStatus }],
    queryFn: () =>
      listAdminOrders({
        page,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      }),
    retry: false,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };
  return (
    <div>
      <div>
        <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Commerce</p>
        <h1 className="mt-2 font-serif text-4xl">Orders</h1>
        <p className="mt-3 text-sm text-stone-600">
          Review payments, delivery progress, invoices, and audited status changes.
        </p>
      </div>
      <form
        className="my-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_220px_auto]"
        onSubmit={submit}
      >
        <Input
          aria-label="Search orders"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Order number, email, or phone"
          value={searchInput}
        />
        <select
          className="h-12 border border-stone-300 bg-white px-3 text-sm"
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as OrderStatus | '');
          }}
          value={status}
        >
          <option value="">All order statuses</option>
          {orderStatuses.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          className="h-12 border border-stone-300 bg-white px-3 text-sm"
          onChange={(e) => {
            setPage(1);
            setPaymentStatus(e.target.value as PaymentStatus | '');
          }}
          value={paymentStatus}
        >
          <option value="">All payment statuses</option>
          {paymentStatuses.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <Button type="submit">Search</Button>
      </form>
      {orders.isPending ? <StatusMessage>Loading orders…</StatusMessage> : null}
      {orders.isError ? (
        <StatusMessage tone="error">{errorMessage(orders.error)}</StatusMessage>
      ) : null}
      {orders.data ? (
        <>
          <div className="overflow-hidden border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-[10px] tracking-wider text-stone-500 uppercase">
                  <tr>
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Total</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.data.items.map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-4">
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium' }).format(
                            new Date(order.placedAt),
                          )}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p>
                          {order.customerFirstName} {order.customerLastName}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">{order.customerEmail}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p>{order.paymentMethod.replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {order.paymentStatus.replaceAll('_', ' ')}
                        </p>
                      </td>
                      <td className="px-5 py-4">{order.status.replaceAll('_', ' ')}</td>
                      <td className="px-5 py-4 text-right">{formatEgp(order.totalPiasters)}</td>
                      <td className="px-5 py-4 text-right">
                        <Link className="underline" href={`/admin/orders/${order.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button
              disabled={page <= 1 || orders.isFetching}
              onClick={() => setPage((v) => v - 1)}
              variant="secondary"
            >
              Previous
            </Button>
            <span className="text-xs text-stone-500">
              Page {orders.data.page} of {Math.max(orders.data.totalPages, 1)}
            </span>
            <Button
              disabled={page >= orders.data.totalPages || orders.isFetching}
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

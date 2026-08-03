'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { StatusMessage } from '@/components/ui/status-message';
import { getDashboardAnalytics } from '@/lib/api/admin';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import type { DashboardPeriod } from '@/types/admin';

export function DashboardPanel() {
  const [days, setDays] = useState<DashboardPeriod>(30);
  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard', days],
    queryFn: () => getDashboardAnalytics(days),
    retry: false,
  });

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Overview</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Store dashboard</h1>
          <p className="mt-3 text-sm text-stone-600">
            Revenue, demand, customers, and recent operations.
          </p>
        </div>
        <select
          className="h-11 border border-stone-300 bg-white px-3 text-sm"
          onChange={(event) => setDays(Number(event.target.value) as DashboardPeriod)}
          value={days}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {dashboard.isPending ? (
        <div className="mt-8">
          <StatusMessage>Loading dashboard…</StatusMessage>
        </div>
      ) : null}
      {dashboard.isError ? (
        <div className="mt-8">
          <StatusMessage tone="error">{errorMessage(dashboard.error)}</StatusMessage>
        </div>
      ) : null}
      {dashboard.data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Paid revenue" value={formatEgp(dashboard.data.revenuePiasters)} />
            <Metric label="Orders" value={String(dashboard.data.ordersInPeriod)} />
            <Metric
              label="Customers"
              value={String(dashboard.data.customersTotal)}
              detail={`+${dashboard.data.newCustomersInPeriod} in period`}
            />
            <Metric
              label="Needs attention"
              value={String(
                (dashboard.data.statusCounts.PENDING ?? 0) +
                  (dashboard.data.statusCounts.WAITING_FOR_PAYMENT ?? 0),
              )}
              detail="Pending or awaiting payment"
            />
          </div>
          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <section className="border border-stone-200 bg-white">
              <div className="flex items-center justify-between border-b border-stone-200 p-5">
                <h2 className="font-serif text-2xl">Recent orders</h2>
                <Link className="text-xs underline" href="/admin/orders">
                  View all
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-stone-50 text-[10px] tracking-wider text-stone-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {dashboard.data.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-5 py-4">
                          <Link
                            className="font-medium hover:underline"
                            href={`/admin/orders/${order.id}`}
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="mt-1 text-xs text-stone-400">
                            {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium' }).format(
                              new Date(order.placedAt),
                            )}
                          </p>
                        </td>
                        <td className="px-5 py-4">{order.customerName}</td>
                        <td className="px-5 py-4">{order.status.replaceAll('_', ' ')}</td>
                        <td className="px-5 py-4 text-right">{formatEgp(order.totalPiasters)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="border border-stone-200 bg-white p-5">
              <h2 className="font-serif text-2xl">Best sellers</h2>
              <ol className="mt-5 divide-y divide-stone-100">
                {dashboard.data.bestSellers.map((product, index) => (
                  <li
                    className="flex justify-between gap-4 py-4"
                    key={`${product.productId ?? product.productSlug}-${index}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{product.productName}</p>
                      <p className="mt-1 text-xs text-stone-500">{product.quantitySold} units</p>
                    </div>
                    <span className="text-sm">{formatEgp(product.revenuePiasters)}</span>
                  </li>
                ))}
              </ol>
              {dashboard.data.bestSellers.length === 0 ? (
                <p className="mt-5 text-sm text-stone-500">No completed sales in this period.</p>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="border border-stone-200 bg-white p-6">
      <p className="text-[10px] tracking-[0.16em] text-stone-500 uppercase">{label}</p>
      <p className="mt-4 font-serif text-4xl">{value}</p>
      {detail ? <p className="mt-2 text-xs text-stone-500">{detail}</p> : null}
    </article>
  );
}

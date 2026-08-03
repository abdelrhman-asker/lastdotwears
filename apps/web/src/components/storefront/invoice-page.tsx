'use client';

import Link from 'next/link';

import { useInvoice } from '@/hooks/use-checkout';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';

export function InvoicePage({ orderNumber }: { orderNumber: string }) {
  const invoice = useInvoice(orderNumber);
  if (invoice.isPending)
    return (
      <div className="mx-auto min-h-[70vh] max-w-4xl animate-pulse px-6 py-16">
        <div className="h-[700px] bg-stone-200" />
      </div>
    );
  if (invoice.isError || !invoice.data)
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-serif text-5xl">Invoice unavailable.</h1>
        <p className="mt-4 text-sm text-stone-500">{errorMessage(invoice.error)}</p>
      </div>
    );
  const data = invoice.data;
  return (
    <div className="invoice-page mx-auto max-w-4xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="mb-8 flex justify-between gap-4 print:hidden">
        <Link className="text-sm underline underline-offset-4" href={`/orders/${data.orderNumber}`}>
          Back to order
        </Link>
        <button
          type="button"
          className="bg-stone-950 px-6 py-3 text-xs tracking-[0.14em] text-white uppercase"
          onClick={() => window.print()}
        >
          Print invoice
        </button>
      </div>
      <article className="border border-stone-300 bg-white p-7 sm:p-12">
        <header className="flex flex-col justify-between gap-8 border-b border-stone-950 pb-9 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase">Last-Dot Wears</p>
            <h1 className="mt-5 font-serif text-5xl">Invoice</h1>
          </div>
          <dl className="space-y-2 text-sm sm:text-right">
            <div>
              <dt className="text-stone-500">Invoice</dt>
              <dd>{data.invoiceNumber}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Order</dt>
              <dd>{data.orderNumber}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Issued</dt>
              <dd>
                {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium' }).format(
                  new Date(data.placedAt),
                )}
              </dd>
            </div>
          </dl>
        </header>
        <div className="grid gap-8 border-b border-stone-200 py-8 sm:grid-cols-2">
          <section>
            <h2 className="text-[10px] tracking-[0.16em] text-stone-500 uppercase">Customer</h2>
            <p className="mt-3 text-sm leading-6">
              {data.customerFirstName} {data.customerLastName}
              <br />
              {data.customerEmail}
              <br />
              {data.customerPhone}
            </p>
          </section>
          <section>
            <h2 className="text-[10px] tracking-[0.16em] text-stone-500 uppercase">Deliver to</h2>
            <p className="mt-3 text-sm leading-6">
              {data.shippingAddressLine1}
              <br />
              {data.shippingAddressLine2 ? (
                <>
                  {data.shippingAddressLine2}
                  <br />
                </>
              ) : null}
              {data.shippingCity}, {data.shippingGovernorateName}
            </p>
          </section>
        </div>
        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-950 text-[10px] tracking-[0.12em] uppercase">
              <th className="py-3 font-medium">Item</th>
              <th className="py-3 text-center font-medium">Qty</th>
              <th className="py-3 text-right font-medium">Price</th>
              <th className="py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-stone-200">
                <td className="py-4">
                  <p>{item.productName}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {item.sku} · {item.colorName} · {item.size}
                  </p>
                </td>
                <td className="py-4 text-center">{item.quantity}</td>
                <td className="py-4 text-right">{formatEgp(item.unitPricePiasters)}</td>
                <td className="py-4 text-right">{formatEgp(item.lineTotalPiasters)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-8 ml-auto max-w-xs space-y-3 text-sm">
          <Summary label="Subtotal" value={formatEgp(data.subtotalPiasters)} />
          <Summary label="Discount" value={`−${formatEgp(data.discountPiasters)}`} />
          <Summary label="Shipping" value={formatEgp(data.shippingPiasters)} />
          <div className="flex justify-between border-t border-stone-950 pt-4 text-base font-medium">
            <dt>Total</dt>
            <dd>{formatEgp(data.totalPiasters)}</dd>
          </div>
        </dl>
        <footer className="mt-12 border-t border-stone-200 pt-6 text-xs leading-5 text-stone-500">
          Payment method:{' '}
          {data.paymentMethod === 'INSTAPAY' ? 'Manual InstaPay' : 'Cash on delivery'} · Payment
          status: {data.paymentStatus.replaceAll('_', ' ')}
        </footer>
      </article>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-5">
      <dt className="text-stone-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

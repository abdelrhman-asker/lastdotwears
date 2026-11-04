'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { StatusMessage } from '@/components/ui/status-message';
import { useInstaPayProof, useOrder, useSubmitInstaPayProof } from '@/hooks/use-checkout';
import { errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import type { OrderStatus } from '@/types/orders';

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  WAITING_FOR_PAYMENT: 'Waiting for payment',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function OrderConfirmationPage({ orderNumber }: { orderNumber: string }) {
  const order = useOrder(orderNumber);

  if (order.isPending) {
    return (
      <div className="mx-auto min-h-[70vh] max-w-5xl animate-pulse px-5 py-16">
        <div className="h-16 w-96 bg-stone-200" />
        <div className="mt-12 h-[500px] bg-stone-200" />
      </div>
    );
  }
  if (order.isError || !order.data) {
    return (
      <section className="grid min-h-[65vh] place-items-center px-6 text-center">
        <div>
          <h1 className="font-serif text-5xl">Order unavailable.</h1>
          <p className="mt-4 text-sm text-stone-500">{errorMessage(order.error)}</p>
          <Link
            className="mt-8 inline-block bg-stone-950 px-7 py-3 text-sm text-white"
            href="/login"
          >
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  const data = order.data;
  const paymentProofSubmitted = Boolean(data.payment.proofSubmittedAt);
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 lg:py-20">
      <header className="border-b border-stone-300 pb-8 text-center">
        <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">
          {data.paymentMethod === 'INSTAPAY' && !paymentProofSubmitted
            ? 'Complete your payment'
            : 'Order received'}
        </p>
        <h1 className="mt-5 font-serif text-5xl tracking-[-0.04em] sm:text-6xl">
          Thank you, {data.customerFirstName}.
        </h1>
        <p className="mt-5 text-sm text-stone-500">Order {data.orderNumber}</p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {data.instaPayInstructions ? (
            <section className="border border-stone-950 bg-white p-6 sm:p-8">
              <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
                <Image
                  src={data.instaPayInstructions.qrCodeDataUrl}
                  alt="InstaPay transfer QR code"
                  width={240}
                  height={240}
                  unoptimized
                  className="mx-auto size-60 border border-stone-200 sm:mx-0"
                />
                <div>
                  <p className="text-[10px] tracking-[0.18em] text-stone-500 uppercase">
                    Manual InstaPay payment
                  </p>
                  <h2 className="mt-3 font-serif text-3xl">
                    Transfer {formatEgp(data.totalPiasters)}
                  </h2>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div>
                      <dt className="text-stone-500">InstaPay ID</dt>
                      <dd className="mt-1 font-medium break-all">
                        {data.instaPayInstructions.instaPayId}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Reference</dt>
                      <dd className="mt-1 font-medium">{data.orderNumber}</dd>
                    </div>
                  </dl>
                  <p className="mt-5 text-sm leading-6 text-stone-600">
                    {data.instaPayInstructions.instructions}
                  </p>
                  <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    <strong>Important:</strong> enter order number{' '}
                    <span className="font-semibold">{data.orderNumber}</span> in the InstaPay
                    payment reason or note.
                  </div>
                </div>
              </div>
              <div className="mt-6">
                {paymentProofSubmitted ? (
                  <div className="space-y-5">
                    <StatusMessage tone="success">
                      Your transfer receipt was submitted successfully. Last Dot will review the
                      payment before confirming your order.
                    </StatusMessage>
                    <PaymentProofImage orderNumber={data.orderNumber} />
                  </div>
                ) : (
                  <PaymentProofForm orderNumber={data.orderNumber} />
                )}
              </div>
            </section>
          ) : (
            <StatusMessage tone="success">
              Your cash-on-delivery order has been placed. Pay the courier when it arrives.
            </StatusMessage>
          )}

          <section className="border border-stone-300 bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between gap-5">
              <h2 className="font-serif text-3xl">Order pieces</h2>
              <span className="text-xs text-stone-500">
                {data.items.reduce((total, item) => total + item.quantity, 0)} items
              </span>
            </div>
            <ul className="mt-6 divide-y divide-stone-200 border-t border-stone-200">
              {data.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-5 py-5 text-sm">
                  <div>
                    <p>{item.productName}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {item.colorName} · {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0">{formatEgp(item.lineTotalPiasters)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-stone-300 bg-[#eeebe5] p-6">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-stone-500">Status</span>
              <span className="text-sm font-medium">{statusLabels[data.status]}</span>
            </div>
            <dl className="mt-6 space-y-3 border-t border-stone-300 pt-5 text-sm">
              <Summary label="Subtotal" value={formatEgp(data.subtotalPiasters)} />
              <Summary label="Discount" value={`−${formatEgp(data.discountPiasters)}`} />
              <Summary label="Shipping" value={formatEgp(data.shippingPiasters)} />
              <div className="flex justify-between border-t border-stone-400 pt-4 font-medium">
                <dt>Total</dt>
                <dd>{formatEgp(data.totalPiasters)}</dd>
              </div>
            </dl>
          </section>
          <section className="border border-stone-300 bg-white p-6 text-sm leading-6">
            <h2 className="font-serif text-2xl">Delivery</h2>
            <p className="mt-4">
              {data.customerFirstName} {data.customerLastName}
            </p>
            <p>{data.shippingAddressLine1}</p>
            {data.shippingAddressLine2 ? <p>{data.shippingAddressLine2}</p> : null}
            <p>
              {data.shippingCity}, {data.shippingGovernorateName}
            </p>
            <p className="mt-3 text-stone-500">{data.customerPhone}</p>
          </section>
          {data.paymentMethod !== 'INSTAPAY' || paymentProofSubmitted ? (
            <Link
              href={`/orders/${data.orderNumber}/invoice`}
              className="grid min-h-12 place-items-center border border-stone-950 bg-white px-5 text-xs tracking-[0.14em] uppercase"
            >
              View printable invoice
            </Link>
          ) : null}
          <Link
            href="/products"
            className="grid min-h-12 place-items-center bg-stone-950 px-5 text-xs tracking-[0.14em] text-white uppercase"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}

function PaymentProofForm({ orderNumber }: { orderNumber: string }) {
  const [file, setFile] = useState<File | null>(null);
  const submit = useSubmitInstaPayProof(orderNumber);

  return (
    <form
      className="border border-stone-300 bg-[#eeebe5] p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (file) submit.mutate(file);
      }}
    >
      <h3 className="font-serif text-2xl">Send your transfer receipt</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Complete the transfer, take a screenshot, then upload it here. Your order is submitted to
        Last Dot only after this step.
      </p>
      <label className="mt-5 block text-xs font-medium" htmlFor="paymentProof">
        Transfer screenshot
      </label>
      <input
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="mt-2 block w-full border border-stone-300 bg-white p-3 text-sm file:mr-4 file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-xs file:text-white"
        id="paymentProof"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        type="file"
      />
      <p className="mt-2 text-xs text-stone-500">JPEG, PNG, WebP, or AVIF. Maximum 8 MB.</p>
      {submit.error ? (
        <div className="mt-4">
          <StatusMessage tone="error">{errorMessage(submit.error)}</StatusMessage>
        </div>
      ) : null}
      <Button className="mt-5 w-full" disabled={!file || submit.isPending} type="submit">
        {submit.isPending ? 'Submitting receipt…' : 'I sent the payment — submit receipt'}
      </Button>
    </form>
  );
}

function PaymentProofImage({ orderNumber }: { orderNumber: string }) {
  const proof = useInstaPayProof(orderNumber, true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!proof.data) return;
    const url = URL.createObjectURL(proof.data);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [proof.data]);

  if (proof.isError) {
    return (
      <StatusMessage tone="error">The transfer receipt image could not be loaded.</StatusMessage>
    );
  }
  if (proof.isPending || !imageUrl) {
    return <div className="h-48 w-full animate-pulse bg-stone-100" aria-label="Loading receipt" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`Transfer receipt for order ${orderNumber}`}
      className="max-h-[520px] w-full border border-stone-200 object-contain"
      src={imageUrl}
    />
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

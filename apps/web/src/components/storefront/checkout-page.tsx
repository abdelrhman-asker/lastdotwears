'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { useAddresses } from '@/hooks/use-addresses';
import { useCheckoutQuote, usePlaceOrder, useShippingRates } from '@/hooks/use-checkout';
import { useCart } from '@/hooks/use-commerce';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ApiError, errorMessage } from '@/lib/api/http-client';
import { formatEgp } from '@/lib/format/currency';
import { checkoutSchema, type CheckoutFormInput } from '@/lib/validation/checkout';
import type { Address } from '@/types/address';
import type { Cart } from '@/types/commerce';
import type { ShippingRate } from '@/types/orders';
import type { User } from '@/types/user';

export function CheckoutPage({
  cashOnDeliveryEnabled,
  instaPayEnabled,
}: {
  cashOnDeliveryEnabled: boolean;
  instaPayEnabled: boolean;
}) {
  const user = useCurrentUser();
  const cart = useCart();
  const shipping = useShippingRates();
  const addresses = useAddresses(user.data?.role === 'CUSTOMER');

  if (
    user.isPending ||
    cart.isPending ||
    shipping.isPending ||
    (user.data?.role === 'CUSTOMER' && addresses.isPending)
  ) {
    return <CheckoutLoading />;
  }
  if (user.isError) {
    const unauthorized = user.error instanceof ApiError && user.error.problem.status === 401;
    return (
      <CheckoutGate
        title={unauthorized ? 'Sign in to continue.' : 'Your account could not be loaded.'}
        detail={
          unauthorized
            ? 'Your guest shopping bag will be merged with your account after sign in.'
            : errorMessage(user.error)
        }
        href="/login?next=/checkout"
        action="Sign in"
      />
    );
  }
  if (cart.isError || shipping.isError) {
    return (
      <CheckoutGate
        title="Checkout is temporarily unavailable."
        detail={errorMessage(cart.error ?? shipping.error)}
        href="/cart"
        action="Return to bag"
      />
    );
  }
  if (!user.data.isEmailVerified) {
    return (
      <CheckoutGate
        title="Verify your email before checkout."
        detail="This protects your order and ensures payment and delivery updates reach you."
        href="/resend-verification"
        action="Send verification email"
      />
    );
  }
  if (!cart.data?.items.length) {
    return (
      <CheckoutGate
        title="Your shopping bag is empty."
        detail="Choose a piece before starting checkout."
        href="/products"
        action="Explore products"
      />
    );
  }

  return (
    <CheckoutForm
      key={user.data.id}
      user={user.data}
      cart={cart.data}
      shippingRates={shipping.data ?? []}
      addresses={addresses.data ?? []}
      cashOnDeliveryEnabled={cashOnDeliveryEnabled}
      instaPayEnabled={instaPayEnabled}
    />
  );
}

function CheckoutForm({
  user,
  cart,
  shippingRates,
  addresses,
  cashOnDeliveryEnabled,
  instaPayEnabled,
}: {
  user: User;
  cart: Cart;
  shippingRates: ShippingRate[];
  addresses: Address[];
  cashOnDeliveryEnabled: boolean;
  instaPayEnabled: boolean;
}) {
  const router = useRouter();
  const usableAddresses = addresses.filter((address) =>
    shippingRates.some((rate) => rate.governorateCode === address.governorateCode),
  );
  const preferredAddress =
    usableAddresses.find((address) => address.isDefault) ?? usableAddresses[0];
  const defaultRate =
    shippingRates.find((rate) => rate.governorateCode === preferredAddress?.governorateCode) ??
    shippingRates.find((rate) => rate.governorateCode === 'cairo') ??
    shippingRates[0];
  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerFirstName: preferredAddress?.recipientFirstName ?? user.firstName,
      customerLastName: preferredAddress?.recipientLastName ?? user.lastName,
      customerEmail: user.email,
      customerPhone: preferredAddress?.phone ?? user.phone ?? '',
      governorateCode: defaultRate?.governorateCode ?? '',
      shippingCity: preferredAddress?.city ?? '',
      shippingAddressLine1: preferredAddress?.addressLine1 ?? '',
      shippingAddressLine2: preferredAddress?.addressLine2 ?? '',
      shippingPostalCode: preferredAddress?.postalCode ?? '',
      deliveryNotes: preferredAddress?.deliveryNotes ?? '',
      paymentMethod: cashOnDeliveryEnabled ? 'CASH_ON_DELIVERY' : 'INSTAPAY',
    },
  });
  const quote = useCheckoutQuote();
  const place = usePlaceOrder();
  const idempotencyKey = useRef<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState(preferredAddress?.id ?? '');
  const governorateCode = form.watch('governorateCode');
  const requestQuote = quote.mutate;

  useEffect(() => {
    if (governorateCode) {
      requestQuote({ governorateCode, couponCode: appliedCoupon });
    }
  }, [appliedCoupon, governorateCode, requestQuote]);

  const submit = form.handleSubmit((input) => {
    idempotencyKey.current ??= crypto.randomUUID();
    place.mutate(
      { ...input, couponCode: appliedCoupon, idempotencyKey: idempotencyKey.current },
      { onSuccess: (order) => router.replace(`/orders/${order.orderNumber}`) },
    );
  });

  const applyAddress = (id: string) => {
    setSelectedAddressId(id);
    const address = usableAddresses.find((candidate) => candidate.id === id);
    if (!address) return;
    form.setValue('customerFirstName', address.recipientFirstName, { shouldValidate: true });
    form.setValue('customerLastName', address.recipientLastName, { shouldValidate: true });
    form.setValue('customerPhone', address.phone, { shouldValidate: true });
    form.setValue('governorateCode', address.governorateCode, { shouldValidate: true });
    form.setValue('shippingCity', address.city, { shouldValidate: true });
    form.setValue('shippingAddressLine1', address.addressLine1, { shouldValidate: true });
    form.setValue('shippingAddressLine2', address.addressLine2 ?? '', { shouldValidate: true });
    form.setValue('shippingPostalCode', address.postalCode ?? '', { shouldValidate: true });
    form.setValue('deliveryNotes', address.deliveryNotes ?? '', { shouldValidate: true });
  };

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-12 sm:px-8 lg:px-12 lg:py-18">
      <header className="border-b border-stone-300 pb-8">
        <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">Secure checkout</p>
        <h1 className="mt-4 font-serif text-5xl tracking-[-0.045em] sm:text-6xl">
          Delivery & payment
        </h1>
      </header>

      <form
        className="mt-10 grid gap-14 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start"
        onSubmit={submit}
        noValidate
      >
        <div className="space-y-12">
          <section>
            <SectionTitle number="01" title="Contact" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                error={form.formState.errors.customerFirstName?.message}
                htmlFor="customerFirstName"
                label="First name"
              >
                <Input
                  autoComplete="given-name"
                  id="customerFirstName"
                  {...form.register('customerFirstName')}
                />
              </Field>
              <Field
                error={form.formState.errors.customerLastName?.message}
                htmlFor="customerLastName"
                label="Last name"
              >
                <Input
                  autoComplete="family-name"
                  id="customerLastName"
                  {...form.register('customerLastName')}
                />
              </Field>
              <Field
                error={form.formState.errors.customerEmail?.message}
                htmlFor="customerEmail"
                label="Email address"
              >
                <Input
                  autoComplete="email"
                  id="customerEmail"
                  type="email"
                  {...form.register('customerEmail')}
                />
              </Field>
              <Field
                error={form.formState.errors.customerPhone?.message}
                htmlFor="customerPhone"
                label="Egyptian mobile number"
              >
                <Input
                  autoComplete="tel"
                  id="customerPhone"
                  inputMode="tel"
                  {...form.register('customerPhone')}
                />
              </Field>
            </div>
          </section>

          <section>
            <SectionTitle number="02" title="Delivery address" />
            {usableAddresses.length ? (
              <div className="mt-6 border border-stone-300 bg-[#eeebe5] p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <label
                    className="flex-1 text-[10px] tracking-[0.14em] text-stone-500 uppercase"
                    htmlFor="savedAddress"
                  >
                    Saved address
                    <select
                      className="mt-2 block h-12 w-full border border-stone-300 bg-white px-3 text-sm normal-case tracking-normal"
                      id="savedAddress"
                      onChange={(event) => applyAddress(event.target.value)}
                      value={selectedAddressId}
                    >
                      <option value="">Enter another address</option>
                      {usableAddresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label} — {address.city}, {address.governorateName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Link className="text-xs underline" href="/account/addresses">
                    Manage addresses
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-xs text-stone-500">
                <Link className="underline" href="/account/addresses">
                  Save an address
                </Link>{' '}
                for a faster future checkout.
              </p>
            )}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                error={form.formState.errors.governorateCode?.message}
                htmlFor="governorateCode"
                label="Governorate"
              >
                <select
                  id="governorateCode"
                  className="h-12 w-full border border-stone-300 bg-white px-3 text-base"
                  {...form.register('governorateCode')}
                >
                  <option value="">Choose a governorate</option>
                  {shippingRates.map((rate) => (
                    <option key={rate.id} value={rate.governorateCode}>
                      {rate.governorateName} — {formatEgp(rate.feePiasters)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                error={form.formState.errors.shippingCity?.message}
                htmlFor="shippingCity"
                label="City / district"
              >
                <Input
                  autoComplete="address-level2"
                  id="shippingCity"
                  {...form.register('shippingCity')}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  error={form.formState.errors.shippingAddressLine1?.message}
                  htmlFor="shippingAddressLine1"
                  label="Street address"
                >
                  <Input
                    autoComplete="address-line1"
                    id="shippingAddressLine1"
                    {...form.register('shippingAddressLine1')}
                  />
                </Field>
              </div>
              <Field
                error={form.formState.errors.shippingAddressLine2?.message}
                htmlFor="shippingAddressLine2"
                label="Apartment, floor, landmark (optional)"
              >
                <Input
                  autoComplete="address-line2"
                  id="shippingAddressLine2"
                  {...form.register('shippingAddressLine2')}
                />
              </Field>
              <Field
                error={form.formState.errors.shippingPostalCode?.message}
                htmlFor="shippingPostalCode"
                label="Postal code (optional)"
              >
                <Input
                  autoComplete="postal-code"
                  id="shippingPostalCode"
                  {...form.register('shippingPostalCode')}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  error={form.formState.errors.deliveryNotes?.message}
                  htmlFor="deliveryNotes"
                  label="Delivery notes (optional)"
                >
                  <textarea
                    id="deliveryNotes"
                    className="min-h-28 w-full resize-y border border-stone-300 bg-white p-3 text-base"
                    {...form.register('deliveryNotes')}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle number="03" title="Payment" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {cashOnDeliveryEnabled ? (
                <PaymentOption
                  checked={form.watch('paymentMethod') === 'CASH_ON_DELIVERY'}
                  description="Pay the courier when your order arrives."
                  label="Cash on delivery"
                  value="CASH_ON_DELIVERY"
                  register={form.register('paymentMethod')}
                />
              ) : null}
              {instaPayEnabled ? (
                <PaymentOption
                  checked={form.watch('paymentMethod') === 'INSTAPAY'}
                  description="Place the order, then transfer using the displayed QR code or InstaPay ID."
                  label="InstaPay — manual"
                  value="INSTAPAY"
                  register={form.register('paymentMethod')}
                />
              ) : null}
            </div>
          </section>
        </div>

        <aside className="border border-stone-300 bg-[#eeebe5] p-7 lg:sticky lg:top-28">
          <h2 className="font-serif text-3xl tracking-tight">Order summary</h2>
          <ul className="mt-6 space-y-4 border-b border-stone-300 pb-6">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <div>
                  <p>{item.product.name}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {item.variant.colorName} · {item.variant.size} · Qty {item.quantity}
                  </p>
                </div>
                <span className="shrink-0">{formatEgp(item.lineTotalPiasters)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <label
              className="text-[10px] tracking-[0.14em] text-stone-500 uppercase"
              htmlFor="couponCode"
            >
              Coupon
            </label>
            <div className="mt-2 flex">
              <Input
                id="couponCode"
                value={couponInput}
                className="border-r-0 uppercase"
                placeholder="WELCOME10"
                onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
              />
              <Button
                className="min-h-12"
                disabled={!couponInput.trim() || quote.isPending}
                onClick={() => setAppliedCoupon(couponInput.trim().toUpperCase())}
                type="button"
              >
                Apply
              </Button>
            </div>
            {appliedCoupon ? (
              <button
                type="button"
                className="mt-2 text-xs underline"
                onClick={() => {
                  setAppliedCoupon(null);
                  setCouponInput('');
                }}
              >
                Remove {appliedCoupon}
              </button>
            ) : null}
          </div>

          {quote.isError ? (
            <p className="mt-4 text-xs text-red-700" role="alert">
              {errorMessage(quote.error)}
            </p>
          ) : null}
          <dl className="mt-7 space-y-3 text-sm">
            <SummaryRow
              label="Subtotal"
              value={formatEgp(quote.data?.subtotalPiasters ?? cart.subtotalPiasters)}
            />
            <SummaryRow
              label="Discount"
              value={quote.data ? `−${formatEgp(quote.data.discountPiasters)}` : '—'}
            />
            <SummaryRow
              label="Shipping"
              value={quote.data ? formatEgp(quote.data.shippingPiasters) : 'Choose governorate'}
            />
          </dl>
          <div className="mt-5 flex justify-between border-t border-stone-400 pt-5 font-medium">
            <span>Total</span>
            <span>{quote.data ? formatEgp(quote.data.totalPiasters) : '—'}</span>
          </div>
          {quote.data ? (
            <p className="mt-3 text-xs leading-5 text-stone-500">
              Estimated delivery: {quote.data.shipping.estimatedMinDays}–
              {quote.data.shipping.estimatedMaxDays} business days.
            </p>
          ) : null}
          {place.error ? (
            <div className="mt-5">
              <StatusMessage tone="error">{errorMessage(place.error)}</StatusMessage>
            </div>
          ) : null}
          <Button
            className="mt-7 min-h-13 w-full text-xs tracking-[0.14em] uppercase"
            disabled={!quote.data || quote.isPending || place.isPending}
            type="submit"
          >
            {place.isPending ? 'Placing order…' : 'Place order'}
          </Button>
          <p className="mt-4 text-center text-[11px] leading-5 text-stone-500">
            Prices and stock are verified once more when the order is placed.
          </p>
        </aside>
      </form>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-stone-300 pb-4">
      <span className="text-xs text-stone-400">{number}</span>
      <h2 className="font-serif text-3xl">{title}</h2>
    </div>
  );
}

function PaymentOption({
  checked,
  description,
  label,
  value,
  register,
}: {
  checked: boolean;
  description: string;
  label: string;
  value: 'CASH_ON_DELIVERY' | 'INSTAPAY';
  register: ReturnType<ReturnType<typeof useForm<CheckoutFormInput>>['register']>;
}) {
  return (
    <label
      className={`block cursor-pointer border p-5 ${checked ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white'}`}
    >
      <input className="sr-only" type="radio" value={value} {...register} />
      <span className="block text-sm font-medium">{label}</span>
      <span
        className={`mt-2 block text-xs leading-5 ${checked ? 'text-stone-300' : 'text-stone-500'}`}
      >
        {description}
      </span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CheckoutGate({
  title,
  detail,
  href,
  action,
}: {
  title: string;
  detail: string;
  href: string;
  action: string;
}) {
  return (
    <section className="grid min-h-[65vh] place-items-center px-6 py-24 text-center">
      <div className="max-w-lg">
        <p className="text-[10px] tracking-[0.22em] text-stone-500 uppercase">Checkout</p>
        <h1 className="mt-5 font-serif text-5xl tracking-[-0.04em]">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-stone-500">{detail}</p>
        <Link
          className="mt-8 inline-block bg-stone-950 px-7 py-3.5 text-xs tracking-[0.14em] text-white uppercase"
          href={href}
        >
          {action}
        </Link>
      </div>
    </section>
  );
}

function CheckoutLoading() {
  return (
    <div className="mx-auto min-h-[70vh] max-w-[1500px] animate-pulse px-5 py-16 sm:px-8 lg:px-12">
      <div className="h-16 w-80 bg-stone-200" />
      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_390px]">
        <div className="h-[650px] bg-stone-200" />
        <div className="h-[520px] bg-stone-200" />
      </div>
    </div>
  );
}

'use client';

import { useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { StatusMessage } from '@/components/ui/status-message';
import { useCancelOrder } from '@/hooks/use-checkout';
import { errorMessage } from '@/lib/api/http-client';

export function CancelOrderButton({
  orderNumber,
  canCancel,
  onCancelled,
}: {
  orderNumber: string;
  canCancel: boolean;
  onCancelled?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const cancellation = useCancelOrder(orderNumber);

  if (cancellation.isSuccess) {
    return onCancelled ? null : (
      <StatusMessage tone="success">Your order was cancelled.</StatusMessage>
    );
  }
  if (!canCancel && !cancellation.isPending) {
    return cancellation.error ? (
      <StatusMessage tone="error">{errorMessage(cancellation.error)}</StatusMessage>
    ) : null;
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          cancellation.reset();
          dialog.current?.showModal();
        }}
      >
        Cancel order
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (cancellation.isPending) event.preventDefault();
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md border border-stone-300 bg-white p-6 text-stone-950 backdrop:bg-stone-950/60 sm:p-8"
      >
        <h2 id={titleId} className="font-serif text-3xl">
          Cancel order?
        </h2>
        <p id={descriptionId} className="mt-4 text-sm leading-6 text-stone-600">
          Are you sure you want to cancel this order? This action cannot be undone.
        </p>
        {cancellation.error ? (
          <div className="mt-4">
            <StatusMessage tone="error">{errorMessage(cancellation.error)}</StatusMessage>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            disabled={cancellation.isPending}
            onClick={() => dialog.current?.close()}
            variant="secondary"
          >
            Keep order
          </Button>
          <Button
            disabled={cancellation.isPending}
            onClick={() => cancellation.mutate(undefined, { onSuccess: onCancelled })}
          >
            {cancellation.isPending ? 'Cancelling order…' : 'Cancel order'}
          </Button>
        </div>
      </dialog>
    </>
  );
}

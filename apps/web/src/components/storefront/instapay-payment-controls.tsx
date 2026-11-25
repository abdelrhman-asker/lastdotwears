'use client';

import { useState } from 'react';

import Image from '@/components/shared/media-image';
import { Button } from '@/components/ui/button';

function isPaymentLink(value: string): boolean {
  if (!/^https:\/\//iu.test(value) || /[\s\\]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return url.hostname === 'ipn.eg' && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}

export function InstaPayQr({
  paymentUrl,
  qrCodeDataUrl,
}: {
  paymentUrl: string | null;
  qrCodeDataUrl: string | null;
}) {
  if (!paymentUrl || !qrCodeDataUrl || !isPaymentLink(paymentUrl)) return null;

  return (
    <div className="mx-auto w-full max-w-60 shrink-0 sm:mx-0">
      <Image
        src={qrCodeDataUrl}
        alt="InstaPay transfer QR code"
        width={240}
        height={240}
        unoptimized
        className="h-auto w-full border border-stone-200"
      />
      <a
        href={paymentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center bg-stone-950 px-5 text-sm font-medium text-white hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Open InstaPay
      </a>
    </div>
  );
}

export function CopyPaymentValue({ label, value }: { label: string; value: string }) {
  const [feedback, setFeedback] = useState('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(label + ' copied.');
    } catch {
      setFeedback('Could not copy. Select the text to copy it manually.');
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium break-all">{value}</span>
        <Button
          aria-label={'Copy ' + label}
          className="min-h-9 px-3 text-xs"
          onClick={() => void copy()}
          variant="secondary"
        >
          Copy
        </Button>
      </div>
      {feedback ? (
        <p className="mt-1 text-xs text-stone-600" role="status">
          {feedback}
        </p>
      ) : null}
    </>
  );
}

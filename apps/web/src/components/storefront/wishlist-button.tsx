'use client';

import { useState } from 'react';

import { useToggleWishlist } from '@/hooks/use-commerce';
import { errorMessage } from '@/lib/api/http-client';
import { cn } from '@/lib/utils/cn';

import { HeartIcon } from './icons';

export function WishlistButton({
  productId,
  productName,
  className,
  showLabel = false,
}: {
  productId: string;
  productName: string;
  className?: string;
  showLabel?: boolean;
}) {
  const toggle = useToggleWishlist();
  const saved = toggle.isSaved(productId);
  const [announcement, setAnnouncement] = useState('');

  return (
    <>
      <button
        type="button"
        disabled={toggle.isPending}
        aria-pressed={saved}
        aria-label={`${saved ? 'Remove' : 'Save'} ${productName} ${saved ? 'from' : 'to'} wishlist`}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 bg-[#f7f5f1]/95 px-3 text-xs transition-colors hover:bg-white disabled:opacity-60',
          className,
        )}
        onClick={() =>
          toggle.mutate(
            { productId, saved },
            {
              onSuccess: () =>
                setAnnouncement(saved ? 'Removed from wishlist.' : 'Saved to wishlist.'),
              onError: (error) => setAnnouncement(errorMessage(error)),
            },
          )
        }
      >
        <HeartIcon className="size-5" filled={saved} />
        {showLabel ? (saved ? 'Saved' : 'Save for later') : null}
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

'use client';

import { useEffect } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics/client';
import type { ProductAnalyticsProperties } from '@/lib/analytics/events';

const capturedViews = new Set<string>();
const pendingViews = new Set<string>();

async function captureOnce(key: string, capture: () => Promise<boolean>): Promise<void> {
  if (capturedViews.has(key) || pendingViews.has(key)) return;
  pendingViews.add(key);
  try {
    if (await capture()) capturedViews.add(key);
  } finally {
    pendingViews.delete(key);
  }
}

export function ProductViewTracker({ product }: { product: ProductAnalyticsProperties }) {
  useEffect(() => {
    const key = `product:${product.product_id}`;
    const capture = () => captureOnce(key, () => captureAnalyticsEvent('product_viewed', product));
    void capture();
    window.addEventListener('lastdot:analytics-ready', capture);
    return () => window.removeEventListener('lastdot:analytics-ready', capture);
  }, [product]);
  return null;
}

export function CategoryViewTracker({
  categoryId,
  categoryName,
  categorySlug,
}: {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
}) {
  useEffect(() => {
    const key = `category:${categoryId}`;
    const capture = () =>
      captureOnce(key, () =>
        captureAnalyticsEvent('category_viewed', {
          category_id: categoryId,
          category_name: categoryName,
          category_slug: categorySlug,
        }),
      );
    void capture();
    window.addEventListener('lastdot:analytics-ready', capture);
    return () => window.removeEventListener('lastdot:analytics-ready', capture);
  }, [categoryId, categoryName, categorySlug]);
  return null;
}

export function ProductSearchTracker({
  searchTerm,
  resultCount,
}: {
  searchTerm: string;
  resultCount: number;
}) {
  useEffect(() => {
    const key = `search:${searchTerm.toLocaleLowerCase()}`;
    const capture = () =>
      captureOnce(key, () =>
        captureAnalyticsEvent('product_searched', {
          search_term: searchTerm.slice(0, 120),
          result_count: resultCount,
        }),
      );
    void capture();
    window.addEventListener('lastdot:analytics-ready', capture);
    return () => window.removeEventListener('lastdot:analytics-ready', capture);
  }, [resultCount, searchTerm]);
  return null;
}

export function CheckoutStartedTracker({
  itemCount,
  subtotalPiasters,
}: {
  itemCount: number;
  subtotalPiasters: number;
}) {
  useEffect(() => {
    const key = `checkout:${itemCount}:${subtotalPiasters}`;
    const capture = () =>
      captureOnce(key, () =>
        captureAnalyticsEvent('checkout_started', {
          item_count: itemCount,
          subtotal_egp: subtotalPiasters / 100,
          currency: 'EGP',
        }),
      );
    void capture();
    window.addEventListener('lastdot:analytics-ready', capture);
    return () => window.removeEventListener('lastdot:analytics-ready', capture);
  }, [itemCount, subtotalPiasters]);
  return null;
}

export function PurchaseCompletedTracker({
  orderId,
  paymentMethod,
  itemCount,
  totalPiasters,
  productIds,
}: {
  orderId: string;
  paymentMethod: string;
  itemCount: number;
  totalPiasters: number;
  productIds: string[];
}) {
  useEffect(() => {
    const storageKey = `lastdot:purchase-captured:${orderId}`;
    const capture = async () => {
      if (window.localStorage.getItem(storageKey)) return;
      await captureOnce(`purchase:${orderId}`, () =>
        captureAnalyticsEvent('purchase_completed', {
          order_id: orderId,
          payment_method: paymentMethod,
          item_count: itemCount,
          total_egp: totalPiasters / 100,
          currency: 'EGP',
          product_ids: productIds,
        }),
      );
      if (capturedViews.has(`purchase:${orderId}`)) {
        window.localStorage.setItem(storageKey, 'true');
      }
    };
    void capture();
    window.addEventListener('lastdot:analytics-ready', capture);
    return () => window.removeEventListener('lastdot:analytics-ready', capture);
  }, [itemCount, orderId, paymentMethod, productIds, totalPiasters]);
  return null;
}

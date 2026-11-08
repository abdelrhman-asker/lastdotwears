'use client';

import type { AutocaptureConfig, PostHog } from 'posthog-js';

import { clientEnvironment } from '@/lib/env/client';

import type { AnalyticsEvents } from './events';

export interface AnalyticsPreferences {
  analytics: boolean;
  sessionReplay: boolean;
}

const consentStorageKey = 'lastdot.analytics-consent.v1';
let analyticsClient: PostHog | null = null;
let analyticsClientPromise: Promise<PostHog | null> | null = null;
let identifiedUserId: string | null = null;
let lastPageViewKey: string | null = null;

const safeAutocaptureConfig: AutocaptureConfig = {
  dom_event_allowlist: ['click'],
  element_allowlist: ['button'],
  css_selector_ignorelist: [
    '.ph-no-autocapture',
    '[data-ph-no-autocapture]',
    '[data-analytics-custom]',
    '.ph-no-capture',
  ],
  element_attribute_ignorelist: ['aria-label', 'title'],
};

export function analyticsConfigured(): boolean {
  return Boolean(
    clientEnvironment.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false' &&
    clientEnvironment.NEXT_PUBLIC_POSTHOG_KEY &&
    clientEnvironment.NEXT_PUBLIC_POSTHOG_HOST &&
    process.env.NODE_ENV === 'production',
  );
}

export function readAnalyticsPreferences(): AnalyticsPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(consentStorageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<AnalyticsPreferences>;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.sessionReplay !== 'boolean') {
      return null;
    }
    return { analytics: parsed.analytics, sessionReplay: parsed.sessionReplay };
  } catch {
    return null;
  }
}

export function storeAnalyticsPreferences(preferences: AnalyticsPreferences): void {
  window.localStorage.setItem(consentStorageKey, JSON.stringify(preferences));
}

export async function initializeAnalytics(): Promise<PostHog | null> {
  if (!analyticsConfigured() || readAnalyticsPreferences()?.analytics !== true) return null;
  if (analyticsClient) {
    if (analyticsClient.has_opted_out_capturing()) {
      analyticsClient.opt_in_capturing({ captureEventName: false });
    }
    return analyticsClient;
  }
  if (analyticsClientPromise) return analyticsClientPromise;

  analyticsClientPromise = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(clientEnvironment.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: clientEnvironment.NEXT_PUBLIC_POSTHOG_HOST,
        defaults: '2026-08-30',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        enable_heatmaps: false,
        disable_session_recording: true,
        disable_surveys: true,
        person_profiles: 'identified_only',
        opt_out_persistence_by_default: true,
        persistence: 'localStorage+cookie',
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*',
          maskCapturedNetworkRequestFn: (request) => {
            if (request.name) request.name = request.name.split('?')[0] ?? request.name;
            return request;
          },
        },
      });
      analyticsClient = posthog;
      return posthog;
    })
    .catch(() => null);

  return analyticsClientPromise;
}

export async function captureAnalyticsEvent<EventName extends keyof AnalyticsEvents>(
  eventName: EventName,
  properties: AnalyticsEvents[EventName],
): Promise<boolean> {
  if (isExcludedPath(window.location.pathname)) return false;
  const posthog = await initializeAnalytics();
  try {
    if (!posthog) return false;
    posthog.capture(eventName, properties);
    return true;
  } catch {
    // Analytics is always best-effort and must never interrupt commerce flows.
    return false;
  }
}

export async function capturePageView(pathname: string, search: string): Promise<void> {
  if (isExcludedPath(pathname)) return;
  const safePathname = safeAnalyticsPath(pathname);
  const safeSearch = safeCampaignSearch(search);
  const key = `${safePathname}${safeSearch}`;
  if (lastPageViewKey === key) return;
  lastPageViewKey = key;
  const posthog = await initializeAnalytics();
  if (!posthog) return;

  const pageUrl = `${window.location.origin}${key}`;
  try {
    posthog.capture('$pageview', {
      $current_url: pageUrl,
      $pathname: safePathname,
      $title: document.title,
      $referrer: safeReferrer(document.referrer),
      ...campaignProperties(search),
    });
  } catch {
    // Analytics is always best-effort.
  }
}

export async function identifyAnalyticsUser(userId: string): Promise<void> {
  if (identifiedUserId === userId) return;
  const posthog = await initializeAnalytics();
  if (!posthog) return;
  try {
    posthog.identify(userId);
    identifiedUserId = userId;
  } catch {
    // Identity synchronization must never interrupt authentication.
  }
}

export function resetAnalyticsIdentity(): void {
  if (!analyticsClient) return;
  try {
    analyticsClient.reset();
    analyticsClient.opt_in_capturing({ captureEventName: false });
    identifiedUserId = null;
    lastPageViewKey = null;
  } catch {
    // Logout must succeed even if analytics is unavailable.
  }
}

export async function updateSessionReplay(enabled: boolean, pathname: string): Promise<void> {
  const posthog = await initializeAnalytics();
  if (!posthog) return;
  try {
    if (enabled && !isSensitiveAnalyticsPath(pathname)) posthog.startSessionRecording();
    else posthog.stopSessionRecording();
  } catch {
    // Replay is optional and best-effort.
  }
}

export async function updateInteractionCapture(pathname: string): Promise<void> {
  const posthog = await initializeAnalytics();
  if (!posthog) return;
  const enabled = !isSensitiveAnalyticsPath(pathname);
  try {
    posthog.set_config({
      autocapture: enabled ? safeAutocaptureConfig : false,
      enable_heatmaps: enabled,
    });
  } catch {
    // Autocapture and heatmaps are optional and must never affect navigation.
  }
}

export function stopInteractionCapture(): void {
  try {
    analyticsClient?.set_config({ autocapture: false, enable_heatmaps: false });
  } catch {
    // Sensitive routes must remain usable even if optional capture teardown fails.
  }
}

export function stopSessionReplay(): void {
  try {
    analyticsClient?.stopSessionRecording();
  } catch {
    // Sensitive routes must remain usable even if replay teardown fails.
  }
}

export function revokeAnalytics(): void {
  if (!analyticsClient) return;
  try {
    analyticsClient.stopSessionRecording();
    analyticsClient.set_config({ autocapture: false, enable_heatmaps: false });
    analyticsClient.opt_out_capturing();
  } catch {
    // Consent withdrawal remains recorded locally even if the SDK fails.
  }
  identifiedUserId = null;
  lastPageViewKey = null;
}

export function isExcludedPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function safeAnalyticsPath(pathname: string): string {
  if (/^\/orders\/[^/]+/u.test(pathname)) {
    return pathname.replace(/^\/orders\/[^/]+/u, '/orders/[order]');
  }
  return pathname;
}

function isSensitiveAnalyticsPath(pathname: string): boolean {
  return (
    isExcludedPath(pathname) ||
    pathname === '/checkout' ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/orders/') ||
    ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].some(
      (path) => pathname === path,
    )
  );
}

function safeCampaignSearch(search: string): string {
  const source = new URLSearchParams(search);
  const safe = new URLSearchParams();
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = source.get(key);
    if (value) safe.set(key, value.slice(0, 160));
  }
  const value = safe.toString();
  return value ? `?${value}` : '';
}

function campaignProperties(search: string): Record<string, string> {
  const source = new URLSearchParams(search);
  return Object.fromEntries(
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].flatMap((key) => {
      const value = source.get(key);
      return value ? [[key, value.slice(0, 160)]] : [];
    }),
  );
}

function safeReferrer(referrer: string): string {
  if (!referrer) return '';
  try {
    const url = new URL(referrer);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}

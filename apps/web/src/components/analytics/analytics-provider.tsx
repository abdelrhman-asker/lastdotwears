'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { useCurrentUser } from '@/hooks/use-current-user';
import {
  analyticsConfigured,
  captureAnalyticsEvent,
  capturePageView,
  identifyAnalyticsUser,
  initializeAnalytics,
  isExcludedPath,
  readAnalyticsPreferences,
  revokeAnalytics,
  safeAnalyticsPath,
  stopInteractionCapture,
  stopSessionReplay,
  storeAnalyticsPreferences,
  updateSessionReplay,
  updateInteractionCapture,
  type AnalyticsPreferences,
} from '@/lib/analytics/client';

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const configured = analyticsConfigured();
  const [consent, setConsent] = useState<AnalyticsPreferences | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!configured) return;
    setConsent(readAnalyticsPreferences());
  }, [configured]);

  useEffect(() => {
    if (!configured || !consent?.analytics || isExcludedPath(pathname)) return;
    void initializeAnalytics();
  }, [configured, consent?.analytics, pathname]);

  useEffect(() => {
    if (isExcludedPath(pathname)) {
      stopSessionReplay();
      stopInteractionCapture();
    }
  }, [pathname]);

  if (!configured) return children;

  const save = (next: AnalyticsPreferences) => {
    storeAnalyticsPreferences(next);
    setConsent(next);
    setPreferencesOpen(false);
    if (next.analytics) window.dispatchEvent(new Event('lastdot:analytics-ready'));
    else revokeAnalytics();
  };

  return (
    <>
      {children}
      {consent?.analytics && !isExcludedPath(pathname) ? (
        <AnalyticsRuntime replay={consent.sessionReplay} />
      ) : null}
      {!isExcludedPath(pathname) ? (
        <AnalyticsConsentBanner
          consent={consent}
          open={preferencesOpen}
          onOpen={() => setPreferencesOpen(true)}
          onClose={() => setPreferencesOpen(false)}
          onSave={save}
        />
      ) : null}
    </>
  );
}

function AnalyticsRuntime({ replay }: { replay: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useCurrentUser();

  useEffect(() => {
    void capturePageView(pathname, searchParams.toString());
  }, [pathname, searchParams]);

  useEffect(() => {
    void updateSessionReplay(replay, pathname);
    return () => stopSessionReplay();
  }, [pathname, replay]);

  useEffect(() => {
    void updateInteractionCapture(pathname);
    return () => stopInteractionCapture();
  }, [pathname]);

  useEffect(() => {
    if (user.data?.role === 'CUSTOMER') void identifyAnalyticsUser(user.data.id);
  }, [user.data?.id, user.data?.role]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.dataset.analyticsSkip === 'true') return;

      const destination = safeLinkDestination(link.href);
      if (!destination) return;
      const linkId =
        link.dataset.analyticsId ??
        link.getAttribute('aria-label') ??
        link.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ??
        'unlabelled-link';
      void captureAnalyticsEvent('link_clicked', {
        link_id: linkId,
        destination,
        external: new URL(link.href, window.location.href).origin !== window.location.origin,
        page_path: safeAnalyticsPath(window.location.pathname),
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}

function AnalyticsConsentBanner({
  consent,
  open,
  onOpen,
  onClose,
  onSave,
}: {
  consent: AnalyticsPreferences | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave: (consent: AnalyticsPreferences) => void;
}) {
  const [replay, setReplay] = useState(false);
  const showDialog = consent === null || open;

  useEffect(() => setReplay(consent?.sessionReplay ?? false), [consent?.sessionReplay, open]);

  return (
    <>
      {showDialog ? (
        <section
          aria-label="Analytics preferences"
          aria-modal={open ? 'true' : undefined}
          className="fixed right-4 bottom-4 left-4 z-[100] mx-auto max-w-2xl border border-stone-300 bg-[#f7f5f1] p-5 shadow-2xl sm:right-6 sm:bottom-6 sm:left-auto sm:p-6"
          role={open ? 'dialog' : 'region'}
        >
          <h2 className="font-serif text-2xl text-stone-950">Your privacy choices</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Optional analytics help us understand visits and improve the store. We do not send your
            name, email, phone, address, payment details, or form entries. Rejecting does not affect
            shopping.
          </p>
          <label className="mt-4 flex items-start gap-3 border border-stone-300 bg-white p-3 text-sm text-stone-700">
            <input
              checked={replay}
              className="mt-1 size-4 accent-stone-950"
              onChange={(event) => setReplay(event.target.checked)}
              type="checkbox"
            />
            <span>
              Allow privacy-masked session recordings. All text and form inputs are masked, and
              checkout, account, order, authentication, and admin pages are never recorded.
            </span>
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="min-h-11 bg-stone-950 px-5 text-xs tracking-[0.12em] text-white uppercase"
              onClick={() => onSave({ analytics: true, sessionReplay: replay })}
              type="button"
            >
              Accept analytics
            </button>
            <button
              className="min-h-11 border border-stone-400 px-5 text-xs tracking-[0.12em] text-stone-950 uppercase"
              onClick={() => onSave({ analytics: false, sessionReplay: false })}
              type="button"
            >
              Reject analytics
            </button>
            {open ? (
              <button className="min-h-11 px-3 text-xs underline" onClick={onClose} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <button
          className="fixed bottom-3 left-3 z-[90] border border-stone-400 bg-[#f7f5f1] px-3 py-2 text-[10px] tracking-[0.12em] text-stone-700 uppercase shadow-sm print:hidden"
          data-analytics-skip="true"
          onClick={onOpen}
          type="button"
        >
          Privacy choices
        </button>
      )}
    </>
  );
}

function safeLinkDestination(href: string): string | null {
  try {
    const url = new URL(href, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin === window.location.origin
      ? safeAnalyticsPath(url.pathname)
      : `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

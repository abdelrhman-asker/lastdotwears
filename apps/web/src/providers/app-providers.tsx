'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { AnalyticsProvider } from '@/components/analytics/analytics-provider';
import { getQueryClient } from '@/lib/query/query-client';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </QueryClientProvider>
  );
}

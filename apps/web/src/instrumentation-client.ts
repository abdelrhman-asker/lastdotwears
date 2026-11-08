import { initializeAnalytics } from '@/lib/analytics/client';

// Next.js 15.3+ loads this before hydration. Initialization remains a no-op
// unless production analytics is configured and the visitor already consented.
void initializeAnalytics();

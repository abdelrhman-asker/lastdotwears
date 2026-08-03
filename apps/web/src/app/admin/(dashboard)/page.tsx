import type { Metadata } from 'next';

import { DashboardPanel } from '@/components/admin/dashboard-panel';

export const metadata: Metadata = { title: 'Admin dashboard' };

export default function AdminDashboardPage() {
  return <DashboardPanel />;
}

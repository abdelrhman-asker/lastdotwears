import type { Metadata } from 'next';

import { SettingsPanel } from '@/components/admin/settings-panel';

export const metadata: Metadata = { title: 'Website settings' };

export default function AdminSettingsPage() {
  return <SettingsPanel />;
}

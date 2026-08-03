import type { Metadata } from 'next';
import { CouponsPanel } from '@/components/admin/coupons-panel';
export const metadata: Metadata = { title: 'Admin coupons' };
export default function CouponsPage() {
  return <CouponsPanel />;
}

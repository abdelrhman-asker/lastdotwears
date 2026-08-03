import type { Metadata } from 'next';
import { InventoryPanel } from '@/components/admin/inventory-panel';
export const metadata: Metadata = { title: 'Inventory — Administration', robots: { index: false } };
export default function InventoryPage() {
  return <InventoryPanel />;
}

'use client';

import { StatusMessage } from '@/components/ui/status-message';
import { useCurrentUser } from '@/hooks/use-current-user';
import { errorMessage } from '@/lib/api/http-client';
import { AddressBookPanel } from './address-book-panel';

export function AddressBookPage() {
  const user = useCurrentUser();
  if (user.isPending) return <StatusMessage>Loading your address book…</StatusMessage>;
  if (user.isError) return <StatusMessage tone="error">{errorMessage(user.error)}</StatusMessage>;
  return <AddressBookPanel user={user.data} />;
}

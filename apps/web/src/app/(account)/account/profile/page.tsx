import type { Metadata } from 'next';

import { ProfilePanel } from '@/components/account/profile-panel';

export const metadata: Metadata = { title: 'My profile' };

interface ProfilePageProps {
  searchParams: Promise<{ registered?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { registered } = await searchParams;
  return <ProfilePanel justRegistered={registered === '1'} />;
}

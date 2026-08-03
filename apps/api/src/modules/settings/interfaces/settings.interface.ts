export interface WebsiteSettingsRecord {
  id: string;
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string | null;
  storeAddress: string | null;
  businessHours: string;
  announcementText: string | null;
  announcementEnabled: boolean;
  cashOnDeliveryEnabled: boolean;
  instaPayEnabled: boolean;
  instaPayId: string;
  instaPayQrValue: string | null;
  instaPayInstructions: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialLinkRecord {
  id: string;
  platform: string;
  label: string;
  url: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HomepageBannerRecord {
  id: string;
  eyebrow: string | null;
  title: string;
  description: string | null;
  imageUrl: string;
  imagePublicId: string | null;
  altText: string;
  ctaLabel: string;
  ctaUrl: string;
  position: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WebsiteSettingsWriteInput = Omit<
  WebsiteSettingsRecord,
  'id' | 'createdAt' | 'updatedAt'
>;
export type SocialLinkWriteInput = Omit<SocialLinkRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type HomepageBannerWriteInput = Omit<HomepageBannerRecord, 'id' | 'createdAt' | 'updatedAt'>;

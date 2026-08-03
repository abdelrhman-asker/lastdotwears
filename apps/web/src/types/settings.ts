export interface WebsiteSettings {
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
  createdAt: string;
  updatedAt: string;
}

export type WebsiteSettingsWriteInput = Partial<
  Omit<WebsiteSettings, 'id' | 'createdAt' | 'updatedAt'>
>;

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SocialLinkWriteInput = Omit<SocialLink, 'id' | 'createdAt' | 'updatedAt'>;

export interface HomepageBanner {
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
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HomepageBannerWriteInput = Omit<HomepageBanner, 'id' | 'createdAt' | 'updatedAt'>;

export interface PublicWebsiteSettings {
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
  socialLinks: SocialLink[];
  banners: HomepageBanner[];
}

export type ContactMessageStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';

export interface ContactMessage {
  id: string;
  status: ContactMessageStatus;
  name: string;
  email: string;
  phone: string | null;
  orderNumber: string | null;
  subject: string;
  message: string;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedContactMessages {
  items: ContactMessage[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string | null;
  orderNumber?: string | null;
  subject: string;
  message: string;
}

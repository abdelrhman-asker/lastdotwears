import { apiRequest } from '@/lib/api/http-client';
import type {
  Coupon,
  CouponWriteInput,
  DashboardAnalytics,
  DashboardPeriod,
  PaginatedCoupons,
  ShippingRate,
  ShippingRateWriteInput,
} from '@/types/admin';
import type { Order, OrderStatus, PaginatedOrders, PaymentStatus } from '@/types/orders';
import type {
  ContactMessage,
  ContactMessageStatus,
  HomepageBanner,
  HomepageBannerWriteInput,
  PaginatedContactMessages,
  SocialLink,
  SocialLinkWriteInput,
  WebsiteSettings,
  WebsiteSettingsWriteInput,
} from '@/types/settings';

export function getDashboardAnalytics(days: DashboardPeriod): Promise<DashboardAnalytics> {
  return apiRequest(`/admin/analytics/dashboard?days=${days}`);
}

export function listAdminOrders(input: {
  page: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}): Promise<Omit<PaginatedOrders, 'items'> & { items: Order[] }> {
  const query = new URLSearchParams({ page: String(input.page), limit: '20' });
  if (input.search) query.set('search', input.search);
  if (input.status) query.set('status', input.status);
  if (input.paymentStatus) query.set('paymentStatus', input.paymentStatus);
  return apiRequest(`/admin/orders?${query.toString()}`);
}

export function getAdminOrder(id: string): Promise<Order> {
  return apiRequest(`/admin/orders/${encodeURIComponent(id)}`);
}

export function updateAdminOrderStatus(
  id: string,
  input: { status: OrderStatus; note?: string | null; restockItems?: boolean },
): Promise<Order> {
  return apiRequest(`/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: input,
  });
}

export function confirmAdminInstaPay(
  id: string,
  input: { reference?: string | null; note?: string | null },
): Promise<Order> {
  return apiRequest(`/admin/orders/${encodeURIComponent(id)}/confirm-instapay`, {
    method: 'POST',
    body: input,
  });
}

export function listCoupons(input: {
  page: number;
  search?: string;
  isActive?: boolean;
}): Promise<PaginatedCoupons> {
  const query = new URLSearchParams({ page: String(input.page), limit: '20' });
  if (input.search) query.set('search', input.search);
  if (input.isActive !== undefined) query.set('isActive', String(input.isActive));
  return apiRequest(`/admin/coupons?${query.toString()}`);
}

export function createCoupon(input: CouponWriteInput): Promise<Coupon> {
  return apiRequest('/admin/coupons', { method: 'POST', body: input });
}

export function updateCoupon(id: string, input: CouponWriteInput): Promise<Coupon> {
  return apiRequest(`/admin/coupons/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
}

export function deleteCoupon(id: string): Promise<void> {
  return apiRequest(`/admin/coupons/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function listAdminShippingRates(): Promise<ShippingRate[]> {
  return apiRequest('/admin/shipping/rates');
}

export function createShippingRate(input: ShippingRateWriteInput): Promise<ShippingRate> {
  return apiRequest('/admin/shipping/rates', { method: 'POST', body: input });
}

export function updateShippingRate(
  id: string,
  input: ShippingRateWriteInput,
): Promise<ShippingRate> {
  return apiRequest(`/admin/shipping/rates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteShippingRate(id: string): Promise<void> {
  return apiRequest(`/admin/shipping/rates/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getAdminSettings(): Promise<WebsiteSettings> {
  return apiRequest('/admin/settings');
}

export function updateAdminSettings(input: WebsiteSettingsWriteInput): Promise<WebsiteSettings> {
  return apiRequest('/admin/settings', { method: 'PATCH', body: input });
}

export function listSocialLinks(): Promise<SocialLink[]> {
  return apiRequest('/admin/settings/social-links');
}

export function createSocialLink(input: SocialLinkWriteInput): Promise<SocialLink> {
  return apiRequest('/admin/settings/social-links', { method: 'POST', body: input });
}

export function updateSocialLink(
  id: string,
  input: Partial<SocialLinkWriteInput>,
): Promise<SocialLink> {
  return apiRequest(`/admin/settings/social-links/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteSocialLink(id: string): Promise<void> {
  return apiRequest(`/admin/settings/social-links/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function listHomepageBanners(): Promise<HomepageBanner[]> {
  return apiRequest('/admin/settings/banners');
}

export function createHomepageBanner(input: HomepageBannerWriteInput): Promise<HomepageBanner> {
  return apiRequest('/admin/settings/banners', { method: 'POST', body: input });
}

export function updateHomepageBanner(
  id: string,
  input: Partial<HomepageBannerWriteInput>,
): Promise<HomepageBanner> {
  return apiRequest(`/admin/settings/banners/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteHomepageBanner(id: string): Promise<void> {
  return apiRequest(`/admin/settings/banners/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function uploadHomepageBannerImage(file: File): Promise<{
  publicId: string;
  secureUrl: string;
}> {
  const form = new FormData();
  form.set('file', file);
  return apiRequest('/admin/settings/banner-images', { method: 'POST', body: form });
}

export function listContactMessages(input: {
  page: number;
  search?: string;
  status?: ContactMessageStatus;
}): Promise<PaginatedContactMessages> {
  const query = new URLSearchParams({ page: String(input.page), limit: '20' });
  if (input.search) query.set('search', input.search);
  if (input.status) query.set('status', input.status);
  return apiRequest(`/admin/contact-messages?${query.toString()}`);
}

export function updateContactMessage(
  id: string,
  input: { status?: ContactMessageStatus; adminNote?: string | null },
): Promise<ContactMessage> {
  return apiRequest(`/admin/contact-messages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

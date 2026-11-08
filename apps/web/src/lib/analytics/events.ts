export interface ProductAnalyticsProperties {
  product_id: string;
  product_name: string;
  category?: string;
  category_id?: string;
  sku?: string;
  variant_id?: string;
  price_egp?: number;
  currency: 'EGP';
  quantity?: number;
}

export interface AnalyticsEvents {
  product_viewed: ProductAnalyticsProperties;
  product_clicked: ProductAnalyticsProperties & { source: string };
  product_searched: { search_term: string; result_count: number };
  category_viewed: { category_id: string; category_name: string; category_slug: string };
  add_to_cart: ProductAnalyticsProperties;
  remove_from_cart: ProductAnalyticsProperties;
  add_to_wishlist: Pick<ProductAnalyticsProperties, 'product_id' | 'product_name' | 'currency'>;
  remove_from_wishlist: Pick<
    ProductAnalyticsProperties,
    'product_id' | 'product_name' | 'currency'
  >;
  checkout_started: {
    item_count: number;
    subtotal_egp: number;
    currency: 'EGP';
  };
  order_placed: {
    order_id: string;
    payment_method: string;
    item_count: number;
    total_egp: number;
    currency: 'EGP';
    product_ids: string[];
  };
  purchase_completed: {
    order_id: string;
    payment_method: string;
    item_count: number;
    total_egp: number;
    currency: 'EGP';
    product_ids: string[];
  };
  login_success: { user_id: string };
  signup_success: { user_id: string };
  link_clicked: {
    link_id: string;
    destination: string;
    external: boolean;
    page_path: string;
  };
}

export function piastersToEgp(pricePiasters: number): number {
  return pricePiasters / 100;
}

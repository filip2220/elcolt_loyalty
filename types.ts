
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface OrderActivity {
  order_item_id: number;
  product_name: string;
  date_created: string;
  product_qty: number;
  product_gross_revenue: number;
}

// FIX: Add the Reward interface to define the data structure for a reward.
// This resolves the error in RewardsView.tsx where the type was not found.
export interface Reward {
  id: number;
  name: string;
  points: number;
  description: string;
}

// Represents the user's current loyalty level
export interface Level {
  name: string;
  level_id?: number | null;
}

// Represents the full details for a loyalty level, including point ranges
export interface LevelDetails {
  id: number;
  name: string;
  from_points: number;
  to_points: number;
}

// Represents a product image attachment
export interface ProductImage {
  id: number;
  url: string;
  title: string;
  mime_type?: string;
}

// Represents a product with basic info (from list endpoint)
export interface ProductBasic {
  id: number;
  name: string;
  short_description: string;
  description: string;
  created_at: string;
  updated_at: string;
  thumbnail_id: number | null;
  thumbnail_url: string | null;
}

// Represents a product with full details including images
export interface Product {
  id: number;
  name: string;
  short_description: string;
  description: string;
  created_at: string;
  updated_at: string;
  featured_image: ProductImage | null;
  gallery_images: ProductImage[];
  price: string | null;
  regular_price: string | null;
  sale_price: string | null;
  sku: string | null;
}

// Pagination info returned with product lists
export interface ProductPagination {
  limit: number;
  offset: number;
  total: number;
}

// Response from GET /api/products
export interface ProductListResponse {
  products: ProductBasic[];
  pagination: ProductPagination;
}

// Response from GET /api/products/:id/images
export interface ProductImagesResponse {
  featured_image: ProductImage | null;
  gallery_images: ProductImage[];
  all_images: ProductImage[];
}

// =====================================================
// SALES MODULE TYPES
// =====================================================

// Product on sale (from WooCommerce)
export interface SaleProduct {
  id: number;
  name: string;
  regular_price: string | null;
  sale_price: string | null;
  thumbnail_url: string | null;
  discount_percent: number;
  sale_from: string | null;
  sale_to: string | null;
}

// App-exclusive offer (from WPLoyalty)
export interface AppOffer {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product';
  discount_value: number;
  points_required: number;
  reward_type: 'redeem_point' | 'redeem_coupon';
}

// Response from GET /api/sales/public
export interface PublicSalesResponse {
  sales: SaleProduct[];
  count: number;
}

// Response from GET /api/sales/app-exclusive
export interface AppOffersResponse {
  offers: AppOffer[];
  count: number;
}


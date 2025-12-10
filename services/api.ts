// FIX: Import the Reward type to use in the getRewards function.
import { User, OrderActivity, Level, LevelDetails, Reward, Product, ProductListResponse, ProductImagesResponse, PublicSalesResponse, AppOffersResponse } from '../types';

// The base URL for your backend API.
// This is now configurable via environment variables for different environments:
// - Development: http://localhost:8080/api (default)
// - Production: Set VITE_API_URL in your deployment environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Log the API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', API_BASE_URL);
}


/**
 * A helper function to handle API responses.
 * It checks if the response was successful and parses the JSON body.
 * If the response is not ok, it throws an error.
 */
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface LoyaltyData {
  points: number;
  level: Level;
}

// FIX: Define the shape of the response from the redeem reward endpoint.
export interface RedeemResult {
  newPoints: number;
  message: string;
  coupon: string;
}

export const signup = async (data: SignupData): Promise<{ token: string }> => {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};


export const login = async (email: string, password: string): Promise<{ token: string }> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
};

export const getUserProfile = async (token: string): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

export const getLoyaltyData = async (token: string): Promise<LoyaltyData> => {
  const response = await fetch(`${API_BASE_URL}/user/points`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response); // The API now returns { points: number, level: Level }
};

export const getUserActivity = async (token: string): Promise<OrderActivity[]> => {
  const response = await fetch(`${API_BASE_URL}/user/activity`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

// FIX: Add getRewards function to fetch available rewards from the backend.
export const getRewards = async (): Promise<Reward[]> => {
  const response = await fetch(`${API_BASE_URL}/rewards`);
  return handleResponse(response);
};

// FIX: Add redeemReward function to send a redemption request to the backend.
export const redeemReward = async (token: string, rewardId: number): Promise<RedeemResult> => {
  const response = await fetch(`${API_BASE_URL}/user/redeem`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rewardId }),
  });
  return handleResponse(response);
};

export const getLevels = async (): Promise<LevelDetails[]> => {
  const response = await fetch(`${API_BASE_URL}/levels`);
  return handleResponse(response);
};

export const getTotalSavings = async (token: string): Promise<{ totalSavings: number }> => {
  const response = await fetch(`${API_BASE_URL}/user/savings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return handleResponse(response);
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  });
  return handleResponse(response);
};

// =====================================================
// PRODUCT API FUNCTIONS
// =====================================================

/**
 * Get a paginated list of products with basic info
 * @param limit - Number of products to return (default 20, max 100)
 * @param offset - Pagination offset (default 0)
 */
export const getProducts = async (limit: number = 20, offset: number = 0): Promise<ProductListResponse> => {
  const response = await fetch(`${API_BASE_URL}/products?limit=${limit}&offset=${offset}`);
  return handleResponse(response);
};

/**
 * Get a single product with full details including images and price
 * @param productId - The product ID
 */
export const getProduct = async (productId: number): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`);
  return handleResponse(response);
};

/**
 * Get all images for a specific product
 * @param productId - The product ID
 */
export const getProductImages = async (productId: number): Promise<ProductImagesResponse> => {
  const response = await fetch(`${API_BASE_URL}/products/${productId}/images`);
  return handleResponse(response);
};

/**
 * Get a proxied image URL to bypass CORS/hosting issues
 * @param originalUrl - The original image URL from WordPress
 */
export const getProxiedImageUrl = (originalUrl: string): string => {
  return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(originalUrl)}`;
};

// =====================================================
// SALES API FUNCTIONS
// =====================================================

/**
 * Get products currently on sale (public WooCommerce sales)
 */
export const getPublicSales = async (): Promise<PublicSalesResponse> => {
  const response = await fetch(`${API_BASE_URL}/sales/public`);
  return handleResponse(response);
};

/**
 * Get app-exclusive offers (WPLoyalty rewards)
 */
export const getAppOffers = async (): Promise<AppOffersResponse> => {
  const response = await fetch(`${API_BASE_URL}/sales/app-exclusive`);
  return handleResponse(response);
};

// =====================================================
// CART & ORDER API FUNCTIONS
// =====================================================

/**
 * Create a new order
 * @param token - JWT authentication token
 * @param orderData - Order details including items and billing info
 */
export const createOrder = async (token: string, orderData: import('../types').CreateOrderRequest): Promise<import('../types').Order> => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  return handleResponse(response);
};



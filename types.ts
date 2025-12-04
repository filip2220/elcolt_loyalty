
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

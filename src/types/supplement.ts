export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  website_url?: string;
  country?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface NutritionalInfo {
  serving_size?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  sugar_g?: number;
  active_substances?: Record<string, string | number>;
}

export interface Supplement {
  id: string;
  name: string;
  slug: string;
  brand_id: string;
  category_id: string;
  brand?: Brand;
  category?: Category;
  description?: string;
  image_url?: string;
  format?: "powder" | "capsules" | "tablets" | "liquid";
  flavors?: string[];
  nutritional_info?: NutritionalInfo;
  created_at: string;
  updated_at: string;
}

export interface PriceOffer {
  id: string;
  supplement_id: string;
  store_name: string;
  store_logo?: string;
  product_url: string;
  price: number;
  currency: string;
  package_size?: string;
  price_per_unit?: number;
  in_stock: boolean;
  last_checked_at: string;
}

export interface Review {
  id: string;
  supplement_id: string;
  user_id: string;
  profile?: Profile;
  rating: number; // 1-5
  taste_rating?: number;
  digestibility_rating?: number;
  effectiveness_rating?: number;
  comment?: string;
  verified_purchase: boolean;
  created_at: string;
}

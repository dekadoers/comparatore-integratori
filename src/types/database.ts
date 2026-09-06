export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          brand: string;
          name: string;
          price: number;
          protein_percentage: number | null;
          vegan: boolean;
          link: string | null;
          image_url: string | null;
          values_json: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand: string;
          name: string;
          price: number;
          protein_percentage?: number | null;
          vegan?: boolean;
          link?: string | null;
          image_url?: string | null;
          values_json?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand?: string;
          name?: string;
          price?: number;
          protein_percentage?: number | null;
          vegan?: boolean;
          link?: string | null;
          image_url?: string | null;
          values_json?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          user_email: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id?: string | null;
          user_email?: string | null;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string | null;
          user_email?: string | null;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];

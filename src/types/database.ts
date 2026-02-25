// Supabase-generated types placeholder
// In production: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          rereview_reminders: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          rereview_reminders?: boolean;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          rereview_reminders?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          icon_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          icon_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          icon_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          website_url: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          logo_url?: string | null;
          website_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          website_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          brand_id: string | null;
          name: string;
          description: string | null;
          image_url: string | null;
          barcode: string | null;
          avg_rating: number;
          rating_count: number;
          added_by: string | null;
          is_verified: boolean;
          attributes: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          brand_id?: string | null;
          name: string;
          description?: string | null;
          image_url?: string | null;
          barcode?: string | null;
          added_by?: string | null;
          is_verified?: boolean;
          attributes?: Json;
        };
        Update: {
          id?: string;
          category_id?: string;
          brand_id?: string | null;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          barcode?: string | null;
          avg_rating?: number;
          rating_count?: number;
          added_by?: string | null;
          is_verified?: boolean;
          attributes?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'brands';
            referencedColumns: ['id'];
          },
        ];
      };
      ratings: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          score: number;
          review_text: string | null;
          photo_url: string | null;
          would_buy_again: boolean | null;
          review_count: number;
          comment_count: number;
          like_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          score: number;
          review_text?: string | null;
          photo_url?: string | null;
          would_buy_again?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          score?: number;
          review_text?: string | null;
          photo_url?: string | null;
          would_buy_again?: boolean | null;
          review_count?: number;
          comment_count?: number;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ratings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ratings_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      rating_history: {
        Row: {
          id: string;
          rating_id: string;
          previous_score: number;
          previous_review_text: string | null;
          previous_photo_url: string | null;
          previous_would_buy_again: boolean | null;
          changed_at: string;
        };
        Insert: {
          rating_id: string;
          previous_score: number;
          previous_review_text?: string | null;
          previous_photo_url?: string | null;
          previous_would_buy_again?: boolean | null;
        };
        Update: {
          id?: string;
          rating_id?: string;
          previous_score?: number;
          previous_review_text?: string | null;
          previous_photo_url?: string | null;
          previous_would_buy_again?: boolean | null;
          changed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rating_history_rating_id_fkey';
            columns: ['rating_id'];
            isOneToOne: false;
            referencedRelation: 'ratings';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          category_id?: string | null;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      rating_tags: {
        Row: {
          rating_id: string;
          tag_id: string;
        };
        Insert: {
          rating_id: string;
          tag_id: string;
        };
        Update: {
          rating_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rating_tags_rating_id_fkey';
            columns: ['rating_id'];
            isOneToOne: false;
            referencedRelation: 'ratings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rating_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          rating_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          rating_id: string;
          user_id: string;
          body: string;
        };
        Update: {
          id?: string;
          rating_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_rating_id_fkey';
            columns: ['rating_id'];
            isOneToOne: false;
            referencedRelation: 'ratings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      likes: {
        Row: {
          user_id: string;
          rating_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          rating_id: string;
        };
        Update: {
          user_id?: string;
          rating_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'new_follower' | 'new_comment' | 'new_rating' | 'rating_liked' | 'rereview_prompt';
          actor_id: string | null;
          rating_id: string | null;
          comment_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: 'new_follower' | 'new_comment' | 'new_rating' | 'rating_liked' | 'rereview_prompt';
          actor_id?: string | null;
          rating_id?: string | null;
          comment_id?: string | null;
          is_read?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'new_follower' | 'new_comment' | 'new_rating' | 'rating_liked' | 'rereview_prompt';
          actor_id?: string | null;
          rating_id?: string | null;
          comment_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      get_activity_feed: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_cursor?: string | null;
        };
        Returns: {
          rating_id: string;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          product_id: string;
          product_name: string;
          product_image_url: string | null;
          brand_name: string | null;
          score: number;
          review_text: string | null;
          photo_url: string | null;
          would_buy_again: boolean | null;
          review_count: number;
          comment_count: number;
          like_count: number;
          rating_created_at: string;
          rating_updated_at: string;
        }[];
      };
    };
    Enums: {
      notification_type: 'new_follower' | 'new_comment' | 'new_rating' | 'rating_liked' | 'rereview_prompt';
    };
    CompositeTypes: {};
  };
}

// Convenience type aliases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Profile = Tables<'profiles'>;
export type Product = Tables<'products'>;
export type Rating = Tables<'ratings'>;
export type RatingHistory = Tables<'rating_history'>;
export type Brand = Tables<'brands'>;
export type Category = Tables<'categories'>;
export type Tag = Tables<'tags'>;
export type Comment = Tables<'comments'>;
export type Notification = Tables<'notifications'>;

// Joined types for common queries
export interface RatingWithDetails extends Rating {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>;
  products: Pick<Product, 'name' | 'image_url'> & {
    brands: Pick<Brand, 'name'> | null;
  };
  rating_tags: { tags: Pick<Tag, 'id' | 'name' | 'slug'> }[];
}

export interface ProductWithBrand extends Product {
  brands: Brand | null;
}

export type EnergyDrinkAttributes = {
  flavor?: string;
  sugar_free?: boolean;
  volume_ml?: number;
  caffeine_mg?: number;
};

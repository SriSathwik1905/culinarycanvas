
export type Recipe = {
  id: string;
  title: string;
  description?: string;
  instructions: string;
  ingredients: string[]; // Array of ingredient strings
  cook_time_minutes: number;
  prep_time_minutes: number;
  calories?: number;
  servings: number;
  cuisine: string;
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
  average_rating?: number;
  total_ratings?: number;
  tags?: Tag[]; // Array of tag objects
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Tag = {
  id: string;
  name: string;
};

export type RecipeTag = {
  recipe_id: string;
  tag_id: string;
};

// Define database schema types for Supabase queries
// This will help TypeScript understand the shape of data returned from database operations
export type Tables = {
  recipes: {
    Row: Recipe;
    Insert: Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'tags'>;
    Update: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'tags'>>;
  };
  tags: {
    Row: Tag;
    Insert: Omit<Tag, 'id'>;
    Update: Partial<Omit<Tag, 'id'>>;
  };
  recipe_tags: {
    Row: RecipeTag;
    Insert: RecipeTag;
    Update: Partial<RecipeTag>;
  };
  likes: {
    Row: {
      id: string;
      recipe_id: string;
      user_id: string;
      created_at?: string;
    };
    Insert: Omit<{
      id: string;
      recipe_id: string;
      user_id: string;
      created_at?: string;
    }, 'id' | 'created_at'>;
    Update: Partial<Omit<{
      id: string;
      recipe_id: string;
      user_id: string;
      created_at?: string;
    }, 'id' | 'created_at'>>;
  };
  ratings: {
    Row: {
      id: string;
      recipe_id: string;
      user_id: string;
      rating: number;
      created_at?: string;
    };
    Insert: Omit<{
      id: string;
      recipe_id: string;
      user_id: string;
      rating: number;
      created_at?: string;
    }, 'id' | 'created_at'>;
    Update: Partial<Omit<{
      id: string;
      recipe_id: string;
      user_id: string;
      rating: number;
      created_at?: string;
    }, 'id' | 'created_at'>>;
  };
};

// Helper type for Supabase database schema
export interface Database {
  public: {
    Tables: Tables;
  };
}

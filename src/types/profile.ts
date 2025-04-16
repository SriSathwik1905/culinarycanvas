
export type Profile = {
  id: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  created_at?: string;
  updated_at?: string;
  favorite_cuisines?: string[];
  recipe_count?: number;
};

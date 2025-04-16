import { supabase } from './client';
import { Tag } from '@/types/recipe';
import { Profile } from '@/types/profile';

// Helper function to get current user ID from either Supabase or localStorage
export async function getCurrentUserId(): Promise<string | null> {
  try {
    // Try to get user from Supabase auth first
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (supabaseUser?.id) {
      return supabaseUser.id;
    }
    
    // Try to get user from local storage as fallback
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.id) {
          return parsedUser.id;
        }
      } catch (err) {
        console.error("Error parsing stored user:", err);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

// Define typed wrappers for easier and type-safe Supabase queries
export const typedSupabase = {
  recipes: {
    select: () => supabase.from('recipes').select(),
    insert: (data: any) => {
      if (Array.isArray(data)) {
        return supabase.from('recipes').insert(data);
      }
      return supabase.from('recipes').insert([data]).select().single();
    },
    update: (data: any) => 
      supabase.from('recipes').update(data),
    delete: () => supabase.from('recipes').delete(),
  },
  
  tags: {
    select: () => supabase.from('tags').select(),
    insert: (data: { name: string }) => {
      if (Array.isArray(data)) {
        return supabase.from('tags').insert(data).select();
      }
      return supabase.from('tags').insert(data).select().single();
    },
    update: (data: any) => 
      supabase.from('tags').update(data),
    delete: () => supabase.from('tags').delete(),
  },
  
  recipe_tags: {
    select: () => supabase.from('recipe_tags').select(),
    insert: (data: { recipe_id: string; tag_id: string } | Array<{ recipe_id: string; tag_id: string }>) => {
      if (Array.isArray(data)) {
        return supabase.from('recipe_tags').insert(data);
      }
      return supabase.from('recipe_tags').insert(data);
    },
    update: (data: any) => 
      supabase.from('recipe_tags').update(data),
    delete: () => supabase.from('recipe_tags').delete(),
  },
  
  likes: {
    select: () => supabase.from('likes').select(),
    insert: (data: { recipe_id: string; user_id: string }) => {
      if (Array.isArray(data)) {
        return supabase.from('likes').insert(data);
      }
      return supabase.from('likes').insert(data);
    },
    update: (data: any) => 
      supabase.from('likes').update(data),
    delete: () => supabase.from('likes').delete(),
  },
  
  ratings: {
    select: () => supabase.from('ratings').select(),
    insert: (data: { recipe_id: string; user_id: string; rating: number }) => {
      if (Array.isArray(data)) {
        return supabase.from('ratings').insert(data);
      }
      return supabase.from('ratings').insert(data);
    },
    update: (data: any) => 
      supabase.from('ratings').update(data),
    delete: () => supabase.from('ratings').delete(),
  },
  
  profiles: {
    select: () => supabase.from('profiles').select(),
    getById: (id: string) => supabase.from('profiles').select().eq('id', id).single(),
    search: (query: string) => 
      supabase.from('profiles')
        .select()
        .or(`username.ilike.%${query}%,bio.ilike.%${query}%`)
        .order('username'),
    insert: (data: Partial<Profile>) => {
      if (Array.isArray(data)) {
        return supabase.from('profiles').insert(data);
      }
      return supabase.from('profiles').insert([data]).select().single();
    },
    update: (id: string, data: Partial<Profile>) => 
      supabase.from('profiles').update(data).eq('id', id),
    upsert: (data: any) =>
      supabase.from('profiles').upsert(data),
    delete: () => supabase.from('profiles').delete(),
  },
  
  follows: {
    select: () => supabase.from('follows').select(),
    insert: (data: { follower_id: string; followed_id: string }) => {
      if (Array.isArray(data)) {
        return supabase.from('follows').insert(data);
      }
      return supabase.from('follows').insert(data);
    },
    delete: () => supabase.from('follows').delete(),
    isFollowing: (followerId: string, followedId: string) => 
      supabase.from('follows')
        .select()
        .eq('follower_id', followerId)
        .eq('followed_id', followedId)
        .maybeSingle(),
    getFollowers: (chefId: string) => 
      supabase.from('follows')
        .select('follower_id')
        .eq('followed_id', chefId),
    getFollowing: (userId: string) => 
      supabase.from('follows')
        .select('followed_id')
        .eq('follower_id', userId),
  },
  
  favorites: {
    select: () => supabase.from('favorites').select(),
    insert: (data: { user_id: string; recipe_id: string }) => {
      if (Array.isArray(data)) {
        return supabase.from('favorites').insert(data);
      }
      return supabase.from('favorites').insert(data);
    },
    delete: () => supabase.from('favorites').delete(),
    isFavorite: (userId: string, recipeId: string) => 
      supabase.from('favorites')
        .select()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)
        .maybeSingle(),
    getUserFavorites: (userId: string) => 
      supabase.from('favorites')
        .select('recipe_id')
        .eq('user_id', userId),
  },
};

// Helper functions for common DB operations
export async function fetchTags(): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select()
      .order('name');
      
    if (error) throw error;
    return data as Tag[];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

export async function createTag(name: string): Promise<Tag | null> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: name.trim() })
      .select()
      .single();
      
    if (error) throw error;
    return data as Tag;
  } catch (error) {
    console.error('Error creating tag:', error);
    return null;
  }
}

export async function searchChefs(query: string): Promise<Profile[]> {
  try {
    const { data, error } = await typedSupabase.profiles.search(query);
    
    if (error) throw error;
    return data as Profile[];
  } catch (error) {
    console.error('Error searching chefs:', error);
    return [];
  }
}

// New helper functions for follows
export async function followChef(followedId: string): Promise<{ error: any } | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('You must be logged in to follow a chef');

    const { error } = await typedSupabase.follows.insert({
      follower_id: userId,
      followed_id: followedId
    });
    
    if (error) throw error;
    return null;
  } catch (error) {
    console.error('Error following chef:', error);
    return { error };
  }
}

export async function unfollowChef(followedId: string): Promise<{ error: any } | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('You must be logged in to unfollow a chef');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('followed_id', followedId);
    
    if (error) throw error;
    return null;
  } catch (error) {
    console.error('Error unfollowing chef:', error);
    return { error };
  }
}

export async function isFollowingChef(followedId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const { data } = await typedSupabase.follows.isFollowing(userId, followedId);
    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

// New helper functions for favorites
export async function addFavorite(recipeId: string): Promise<{ error: any } | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('You must be logged in to favorite a recipe');

    const { error } = await typedSupabase.favorites.insert({
      user_id: userId,
      recipe_id: recipeId
    });
    
    if (error) throw error;
    return null;
  } catch (error) {
    console.error('Error adding favorite:', error);
    return { error };
  }
}

export async function removeFavorite(recipeId: string): Promise<{ error: any } | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('You must be logged in to remove a favorite');

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);
    
    if (error) throw error;
    return null;
  } catch (error) {
    console.error('Error removing favorite:', error);
    return { error };
  }
}

export async function isFavorite(recipeId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const { data } = await typedSupabase.favorites.isFavorite(userId, recipeId);
    return !!data;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

export async function getUserFavoriteRecipes(userId: string): Promise<string[]> {
  try {
    const { data, error } = await typedSupabase.favorites.getUserFavorites(userId);
    
    if (error) throw error;
    return data?.map(item => item.recipe_id) || [];
  } catch (error) {
    console.error('Error fetching favorite recipes:', error);
    return [];
  }
}

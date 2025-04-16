
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  followChef, 
  unfollowChef, 
  isFollowingChef, 
  addFavorite, 
  removeFavorite, 
  isFavorite 
} from '@/integrations/supabase/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function useFollowChef(chefId: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndFollowStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user?.id || null);
        
        if (user && chefId) {
          const following = await isFollowingChef(chefId);
          setIsFollowing(following);
        }

        // Get follower count
        const { data } = await supabase.rpc('get_follower_count', { chef_id: chefId });
        setFollowerCount(data || 0);
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFollowStatus();
  }, [chefId]);

  const toggleFollow = async () => {
    if (!currentUser) {
      toast("Please sign in to follow chefs");
      navigate("/auth");
      return;
    }

    if (currentUser === chefId) {
      toast("You cannot follow yourself");
      return;
    }

    setIsLoading(true);
    
    try {
      if (isFollowing) {
        await unfollowChef(chefId);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast("Unfollowed chef");
      } else {
        await followChef(chefId);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast("Now following chef");
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      toast.error("Failed to update follow status");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isFollowing,
    isLoading,
    currentUser,
    followerCount,
    toggleFollow,
    isOwnProfile: currentUser === chefId
  };
}

export function useFavoriteRecipe(recipeId?: string) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndFavoriteStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user?.id || null);
        
        if (user && recipeId) {
          const favorited = await isFavorite(recipeId);
          setIsFavorited(favorited);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFavoriteStatus();
  }, [recipeId]);

  const toggleFavorite = async () => {
    if (!recipeId) return;
    
    if (!currentUser) {
      toast("Please sign in to save favorites");
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    
    try {
      if (isFavorited) {
        await removeFavorite(recipeId);
        setIsFavorited(false);
        toast("Recipe removed from favorites");
      } else {
        await addFavorite(recipeId);
        setIsFavorited(true);
        toast("Recipe added to favorites");
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      toast.error("Failed to update favorite status");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isFavorited,
    isLoading,
    currentUser,
    toggleFavorite
  };
}


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Profile } from "@/types/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, UserPlus, UserMinus } from "lucide-react";
import { followChef, unfollowChef, isFollowingChef } from "@/integrations/supabase/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChefCardProps {
  chef: Profile & { recipe_count?: number; follower_count?: number };
  showFollowButton?: boolean;
}

export const ChefCard = ({ chef, showFollowButton = true }: ChefCardProps) => {
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState<number>(chef.follower_count || 0);
  
  useEffect(() => {
    const checkAuthAndFollowStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
      
      if (user && chef.id) {
        const following = await isFollowingChef(chef.id);
        setIsFollowing(following);
      }
    };
    
    checkAuthAndFollowStatus();
  }, [chef.id]);
  
  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to chef profile
    
    if (!currentUser) {
      toast("Please sign in to follow chefs");
      navigate("/auth");
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isFollowing) {
        await unfollowChef(chef.id);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast("Unfollowed chef");
      } else {
        await followChef(chef.id);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast("Now following chef");
      }
    } catch (error) {
      console.error("Error toggling follow status:", error);
      toast.error("Failed to update follow status");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCardClick = () => {
    navigate(`/chefs/${chef.id}`);
  };
  
  return (
    <div 
      className="flex flex-col rounded-xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={chef.avatar_url} alt={chef.username} />
            <AvatarFallback className="bg-sage text-white text-xl">
              {chef.username ? chef.username.charAt(0).toUpperCase() : "C"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{chef.username}</h3>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <ChefHat className="h-3 w-3" />
                <span>{chef.recipe_count || 0} recipes</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{followerCount} followers</span>
              </div>
            </div>
          </div>
        </div>
        
        {showFollowButton && currentUser && currentUser !== chef.id && (
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollow}
            disabled={isLoading}
            className="flex items-center gap-1"
            title={isFollowing ? "Unfollow" : "Follow"}
          >
            {isFollowing ? (
              <UserMinus className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      
      {chef.bio && (
        <p className="mt-4 text-sm text-gray-600 line-clamp-3">{chef.bio}</p>
      )}
      
      {chef.favorite_cuisines && chef.favorite_cuisines.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {chef.favorite_cuisines.slice(0, 3).map((cuisine, idx) => (
            <Badge key={idx} variant="outline" className="bg-sage/10 text-xs">
              {cuisine}
            </Badge>
          ))}
          {chef.favorite_cuisines.length > 3 && (
            <Badge variant="outline" className="bg-sage/5 text-xs">
              +{chef.favorite_cuisines.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default ChefCard;

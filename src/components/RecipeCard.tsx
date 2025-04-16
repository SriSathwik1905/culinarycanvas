import { useState, useEffect } from "react";
import { Heart, Star, Clock, ChefHat, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tag } from "@/types/recipe";
import { addFavorite, removeFavorite, isFavorite } from "@/integrations/supabase/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface RecipeCardProps {
  title: string;
  image: string;
  rating: number | null;
  cookTime: string;
  cuisine: string;
  difficulty: string;
  recipeId?: string; 
  isLiked?: boolean;
  tags?: Tag[];
  onRate?: (rating: number) => void;
  onLike?: () => void;
  onClick?: () => void;
}

export const RecipeCard = ({
  title,
  image,
  rating,
  cookTime,
  cuisine,
  difficulty,
  recipeId,
  isLiked = false,
  tags = [],
  onRate,
  onLike,
  onClick,
}: RecipeCardProps) => {
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndFavoriteStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
      
      if (user && recipeId) {
        const favorited = await isFavorite(recipeId);
        setIsFavorited(favorited);
      }
    };
    
    checkAuthAndFavoriteStatus();
  }, [recipeId]);

  useEffect(() => {
    if (isLiked !== undefined) {
      setIsFavorited(isLiked);
    }
  }, [isLiked]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onLike) {
      onLike();
      return;
    }

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
      console.error("Error toggling favorite status:", error);
      toast.error("Failed to update favorite status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        className="group relative overflow-hidden rounded-lg bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      >
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-sage">{cuisine}</span>
            <span className="flex items-center text-xs text-gray-500">
              <ChefHat className="mr-1 h-3 w-3" />
              {difficulty}
            </span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 line-clamp-2">
            {title}
          </h3>
          
          {tags && tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {tags.slice(0, 3).map(tag => (
                <Badge key={tag.id} variant="outline" className="text-xs bg-sage/10">
                  {tag.name}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs bg-gray-100">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <button 
              className="flex items-center space-x-1"
              onClick={(e) => {
                e.stopPropagation();
                if (onRate) {
                  setIsRatingOpen(true);
                }
              }}
            >
              <Star className={`h-4 w-4 ${rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-600">
                {rating ? rating.toFixed(1) : 'Rate'}
              </span>
            </button>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="mr-1 h-4 w-4" />
              {cookTime}
            </div>
          </div>
          
          {(recipeId || onLike) && (
            <button 
              className="absolute right-4 top-4 rounded-full bg-white/80 p-2 hover:bg-white hover:text-terracotta"
              onClick={handleFavoriteToggle}
              disabled={isLoading}
            >
              <Heart className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate this recipe</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center space-x-2 py-4">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRate?.(value);
                  setIsRatingOpen(false);
                }}
                className="h-10 w-10 p-0"
              >
                <Star className={`h-6 w-6 ${value <= (rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

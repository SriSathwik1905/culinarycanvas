import { useNavigate } from "react-router-dom";
import { RecipeCard } from "@/components/RecipeCard";
import { Button } from "@/components/ui/button";
import { Recipe } from "@/types/recipe";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Filter, ArrowUp, RefreshCcw } from "lucide-react";
import { getCurrentUserId } from "@/integrations/supabase/utils";

interface RecipeResultsProps {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  likes: Record<string, boolean>;
  userRatings: Record<string, number>;
  setLikes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setUserRatings: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  resetFilters: () => void;
  refetchRecipes: () => void;
}

export const RecipeResults = ({
  recipes,
  isLoading,
  error,
  likes,
  userRatings,
  setLikes,
  setUserRatings,
  setRecipes,
  resetFilters,
  refetchRecipes,
}: RecipeResultsProps) => {
  const navigate = useNavigate();

  const handleLike = async (recipeId: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("Please log in to favorite recipes");
        navigate("/auth");
        return;
      }

      if (likes[recipeId]) {
        const response = await supabase.from('likes')
          .delete()
          .match({
            "recipe_id": recipeId,
            "user_id": userId
          });
        
        if (response.error) throw response.error;
        
        setLikes(prev => ({
          ...prev,
          [recipeId]: false
        }));
        toast.success("Recipe removed from favorites");
      } else {
        const response = await supabase.from('likes')
          .insert({
            recipe_id: recipeId,
            user_id: userId
          });
        
        if (response.error) throw response.error;
        
        setLikes(prev => ({
          ...prev,
          [recipeId]: true
        }));
        toast.success("Recipe added to favorites");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update favorite status");
    }
  };

  const handleRate = async (recipeId: string, rating: number) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("Please log in to rate recipes");
        navigate("/auth");
        return;
      }

      const response = await supabase.from('ratings')
        .insert({
          recipe_id: recipeId,
          user_id: userId,
          rating
        });

      if (response.error) throw response.error;

      setUserRatings(prev => ({
        ...prev,
        [recipeId]: rating
      }));

      setRecipes(prev => prev.map(recipe => {
        if (recipe.id === recipeId) {
          const currentRating = recipe.average_rating || 0;
          const totalRatings = recipe.total_ratings || 0;
          const newAverage = ((currentRating * totalRatings) + rating) / (totalRatings + 1);
          return {
            ...recipe,
            average_rating: newAverage,
            total_ratings: totalRatings + 1
          };
        }
        return recipe;
      }));

      toast.success("Rating saved successfully");
    } catch (error) {
      console.error("Error rating recipe:", error);
      toast.error("Failed to save rating");
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div 
            key={i}
            className="rounded-lg bg-white p-4 shadow-md h-[300px] animate-pulse"
          >
            <div className="bg-gray-200 h-[150px] w-full mb-4 rounded"></div>
            <div className="bg-gray-200 h-5 w-3/4 mb-2 rounded"></div>
            <div className="bg-gray-200 h-4 w-1/2 mb-4 rounded"></div>
            <div className="flex justify-between items-center">
              <div className="bg-gray-200 h-4 w-[40px] rounded"></div>
              <div className="bg-gray-200 h-4 w-[60px] rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-md">
        <h3 className="mb-2 text-xl font-semibold text-red-600">
          Error Loading Recipes
        </h3>
        <p className="mb-6 text-gray-600">
          {error}
        </p>
        <Button 
          onClick={refetchRecipes} 
          className="flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-md">
        <h3 className="mb-2 text-xl font-semibold text-gray-900">
          No recipes match your filters 😢
        </h3>
        <p className="mb-6 text-gray-600">
          Try removing a few filters or adding different ingredients
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={resetFilters} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Clear All Filters
          </Button>
          <Button variant="outline" onClick={() => navigate("/recipes/new")}>
            Create a Recipe
          </Button>
        </div>
      </div>
    );
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipeId={recipe.id}
            title={recipe.title}
            image={recipe.image_url || "/placeholder.svg"}
            rating={recipe.average_rating}
            cookTime={`${recipe.cook_time_minutes + recipe.prep_time_minutes} min`}
            cuisine={recipe.cuisine}
            difficulty={recipe.difficulty}
            isLiked={likes[recipe.id] || false}
            tags={recipe.tags}
            onLike={() => handleLike(recipe.id)}
            onRate={(rating) => handleRate(recipe.id, rating)}
            onClick={() => navigate(`/recipes/${recipe.id}`)}
          />
        ))}
      </div>
      
      {recipes.length > 9 && (
        <Button 
          onClick={scrollToTop}
          variant="outline" 
          size="sm"
          className="fixed bottom-6 right-6 rounded-full h-10 w-10 p-0 flex items-center justify-center shadow-md bg-white z-10"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

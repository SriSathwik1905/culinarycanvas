import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Clock, ChefHat, Users, Trash2, Edit, Tag as TagIcon, User, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { typedSupabase, addFavorite, removeFavorite, isFavorite } from "@/integrations/supabase/utils";
import { Recipe as RecipeType, Tag } from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RecipeForm } from "@/components/RecipeForm";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

export const Recipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [chefProfile, setChefProfile] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user?.id || null);
        setIsAuthChecking(false);
        
        if (user && id) {
          const favorited = await isFavorite(id);
          setIsFavorited(favorited);
        }
        
        const recipeResponse = await supabase.from('recipes')
          .select()
          .eq("id", id)
          .single();

        if (recipeResponse.error) throw recipeResponse.error;
        const recipeData = recipeResponse.data;
        
        if (!recipeData) {
          navigate("/not-found");
          return;
        }
        
        const recipeWithIngredients = {
          ...recipeData,
          ingredients: recipeData.ingredients || []
        };

        setRecipe(recipeWithIngredients);
        setIsOwner(user?.id === recipeData.user_id);

        const tagsResponse = await supabase.from('recipe_tags')
          .select()
          .eq("recipe_id", id);

        if (tagsResponse.error) {
          console.error("Error fetching recipe tags:", tagsResponse.error);
        } else {
          const tagIds = tagsResponse.data.map(item => item.tag_id);
          
          if (tagIds.length > 0) {
            const tagDetailsResponse = await supabase.from('tags')
              .select()
              .in("id", tagIds);
              
            if (tagDetailsResponse.error) {
              console.error("Error fetching tag details:", tagDetailsResponse.error);
            } else {
              setTags(tagDetailsResponse.data as Tag[]);
            }
          }
        }
        
        if (recipeData.user_id) {
          const profileResponse = await supabase.from('profiles')
            .select()
            .eq('id', recipeData.user_id)
            .single();
          
          if (!profileResponse.error && profileResponse.data) {
            setChefProfile(profileResponse.data);
          } else {
            setChefProfile({
              id: recipeData.user_id,
              username: "Chef",
              avatar_url: null
            });
          }
        }

      } catch (error: unknown) {
        console.error("Error in recipe fetch:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load recipe";
        setError(errorMessage);
        navigate("/not-found");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipe();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!recipe?.id) return;

    try {
      const { error } = await supabase.from('recipes')
        .delete()
        .eq("id", recipe.id);

      if (error) throw error;

      toast.success("Recipe deleted successfully");
      navigate("/profile");
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Failed to delete recipe");
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    toast.success("Recipe updated successfully");
    window.location.reload();
  };

  const handleFavoriteToggle = async () => {
    if (!id) return;
    if (!currentUser) {
      toast("Please sign in to save favorites");
      navigate("/auth");
      return;
    }
    
    try {
      if (isFavorited) {
        await removeFavorite(id);
        setIsFavorited(false);
        toast("Recipe removed from favorites");
      } else {
        await addFavorite(id);
        setIsFavorited(true);
        toast("Recipe added to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      toast.error("Failed to update favorite status");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="container mx-auto px-4 pt-24">
          <div className="text-center">Loading recipe...</div>
        </main>
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="container mx-auto px-4 pt-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="mb-4 text-4xl font-bold text-gray-900">{recipe.title}</h1>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-5 w-5" />
                  <span>{recipe.prep_time_minutes + recipe.cook_time_minutes} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <ChefHat className="h-5 w-5" />
                  <span>{recipe.difficulty}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-5 w-5" />
                  <span>{recipe.servings} servings</span>
                </div>
              </div>
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <TagIcon className="h-4 w-4 text-gray-500" />
                  {tags.map(tag => (
                    <Badge key={tag.id} variant="outline" className="bg-sage/10">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!isAuthChecking && currentUser && !isOwner && (
                <Button
                  variant={isFavorited ? "default" : "outline"}
                  size="icon"
                  onClick={handleFavoriteToggle}
                  className={isFavorited ? "bg-red-500 hover:bg-red-600" : ""}
                >
                  <Heart className={`h-4 w-4 ${isFavorited ? "fill-white" : ""}`} />
                </Button>
              )}
              
              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this recipe? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>

          {chefProfile && (
            <div className="mb-8 flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
              <Avatar className="h-12 w-12">
                <AvatarImage src={chefProfile.avatar_url} alt="Chef" />
                <AvatarFallback className="bg-sage text-white">
                  {chefProfile.username ? chefProfile.username.charAt(0).toUpperCase() : "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Link to={`/chefs/${chefProfile.id}`} className="font-medium text-gray-900 hover:text-sage">
                  Recipe by {chefProfile.username || "Chef"}
                </Link>
                {chefProfile.recipe_count && (
                  <p className="text-sm text-gray-500">{chefProfile.recipe_count} recipes</p>
                )}
              </div>
            </div>
          )}

          {recipe.image_url && (
            <div className="mb-8 overflow-hidden rounded-lg">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="h-[400px] w-full object-cover"
              />
            </div>
          )}

          {recipe.description && (
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-semibold text-gray-900">Description</h2>
              <p className="text-gray-600">{recipe.description}</p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">Ingredients</h2>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="text-gray-600">{ingredient}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No ingredients listed</p>
            )}
          </div>

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">Instructions</h2>
            <div className="prose max-w-none">
              {recipe.instructions.split('\n').map((instruction, index) => (
                <p key={index} className="mb-4 text-gray-600">
                  {instruction}
                </p>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
          </DialogHeader>
          <RecipeForm 
            initialData={{...recipe, tags}}
            onSuccess={handleEditSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recipe;

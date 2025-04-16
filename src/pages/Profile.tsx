import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { PlusCircle } from "lucide-react";
import { Recipe, Tag } from "@/types/recipe";
import { RecipeCard } from "@/components/RecipeCard";
import { supabase } from "@/integrations/supabase/client";
import { typedSupabase } from "@/integrations/supabase/utils";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChefCard from "@/components/chef/ChefCard";
import type { Profile } from "@/types/profile";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [followingChefs, setFollowingChefs] = useState<(Profile & { recipe_count?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("recipes");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) {
        navigate("/auth");
        return;
      }
      setUser(authUser);
    };

    getUser();
  }, [navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        const recipesResponse = await supabase.from('recipes')
          .select()
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (recipesResponse.error) throw recipesResponse.error;
        const recipesData = recipesResponse.data || [];

        const recipeIds = recipesData.map(r => r.id);
        const tagsResponse = await supabase.from('recipe_tags')
          .select()
          .in("recipe_id", recipeIds);

        const tagsData = tagsResponse.data || [];

        const allTagsResponse = await supabase.from('tags')
          .select();
        
        const allTags = allTagsResponse.data || [];
        
        const tagsMap: Record<string, Tag> = {};
        allTags.forEach(tag => {
          tagsMap[tag.id] = tag as Tag;
        });

        const recipeTags: Record<string, Tag[]> = {};
        tagsData.forEach(item => {
          if (!recipeTags[item.recipe_id]) {
            recipeTags[item.recipe_id] = [];
          }
          const tag = tagsMap[item.tag_id];
          if (tag) {
            recipeTags[item.recipe_id].push(tag);
          }
        });

        const recipesWithTags = recipesData.map(recipe => ({
          ...recipe,
          tags: recipeTags[recipe.id] || [],
          ingredients: recipe.ingredients || []
        }));

        setRecipes(recipesWithTags);

        const favoritesResponse = await supabase
          .from('favorites')
          .select('recipe_id')
          .eq('user_id', user.id);
        
        if (!favoritesResponse.error && favoritesResponse.data) {
          const favoriteIds = favoritesResponse.data.map(fav => fav.recipe_id);
          
          if (favoriteIds.length > 0) {
            const favoriteRecipesResponse = await supabase
              .from('recipes')
              .select()
              .in('id', favoriteIds);
            
            if (!favoriteRecipesResponse.error) {
              const favoriteRecipesData = favoriteRecipesResponse.data || [];
              
              const favoriteRecipeIds = favoriteRecipesData.map(r => r.id);
              const favoriteTagsResponse = await supabase
                .from('recipe_tags')
                .select()
                .in("recipe_id", favoriteRecipeIds);

              const favoriteTagsData = favoriteTagsResponse.data || [];
              
              const favoriteRecipeTags: Record<string, Tag[]> = {};
              favoriteTagsData.forEach(item => {
                if (!favoriteRecipeTags[item.recipe_id]) {
                  favoriteRecipeTags[item.recipe_id] = [];
                }
                const tag = tagsMap[item.tag_id];
                if (tag) {
                  favoriteRecipeTags[item.recipe_id].push(tag);
                }
              });

              const favoriteRecipesWithTags = favoriteRecipesData.map(recipe => ({
                ...recipe,
                tags: favoriteRecipeTags[recipe.id] || [],
                ingredients: recipe.ingredients || []
              }));

              setFavoriteRecipes(favoriteRecipesWithTags);
            }
          }
        }

        const followingResponse = await supabase
          .from('follows')
          .select('followed_id')
          .eq('follower_id', user.id);
        
        if (!followingResponse.error && followingResponse.data) {
          const followingIds = followingResponse.data.map(follow => follow.followed_id);
          
          if (followingIds.length > 0) {
            const followingChefsResponse = await supabase
              .from('profiles')
              .select()
              .in('id', followingIds);
            
            if (!followingChefsResponse.error) {
              const followingChefsData = followingChefsResponse.data || [];
              
              const chefWithRecipeCounts = await Promise.all(
                followingChefsData.map(async (chef) => {
                  const recipeCountResponse = await supabase
                    .from('recipes')
                    .select('id', { count: 'exact' })
                    .eq('user_id', chef.id);
                  
                  return {
                    ...chef,
                    recipe_count: recipeCountResponse.count || 0
                  };
                })
              );
              
              setFollowingChefs(chefWithRecipeCounts);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="container mx-auto px-4 pt-24">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome!
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your recipes and create new culinary masterpieces
            </p>
          </div>
          <Button
            onClick={() => navigate("/recipes/new")}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-5 w-5" />
            Create Recipe
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="recipes" className="flex-1">
              Your Recipes
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              Favorite Recipes
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1">
              Chefs You Follow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes">
            <section>
              {isLoading ? (
                <div className="text-center text-gray-600">Loading recipes...</div>
              ) : recipes.length === 0 ? (
                <div className="rounded-lg bg-white p-8 text-center shadow-md">
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    No recipes yet
                  </h3>
                  <p className="mb-6 text-gray-600">
                    Start sharing your culinary creations with the world
                  </p>
                  <Button onClick={() => navigate("/recipes/new")}>
                    Create Your First Recipe
                  </Button>
                </div>
              ) : (
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
                      tags={recipe.tags}
                      onClick={() => navigate(`/recipes/${recipe.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="favorites">
            <section>
              {isLoading ? (
                <div className="text-center text-gray-600">Loading favorites...</div>
              ) : favoriteRecipes.length === 0 ? (
                <div className="rounded-lg bg-white p-8 text-center shadow-md">
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    No favorite recipes yet
                  </h3>
                  <p className="mb-6 text-gray-600">
                    Browse recipes and click the heart icon to add them to your favorites
                  </p>
                  <Button onClick={() => navigate("/explore")}>
                    Explore Recipes
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipeId={recipe.id}
                      title={recipe.title}
                      image={recipe.image_url || "/placeholder.svg"}
                      rating={recipe.average_rating}
                      cookTime={`${recipe.cook_time_minutes + recipe.prep_time_minutes} min`}
                      cuisine={recipe.cuisine}
                      difficulty={recipe.difficulty}
                      tags={recipe.tags}
                      onClick={() => navigate(`/recipes/${recipe.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="following">
            <section>
              {isLoading ? (
                <div className="text-center text-gray-600">Loading chefs...</div>
              ) : followingChefs.length === 0 ? (
                <div className="rounded-lg bg-white p-8 text-center shadow-md">
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    Not following any chefs yet
                  </h3>
                  <p className="mb-6 text-gray-600">
                    Follow chefs to get updates on their latest recipes
                  </p>
                  <Button onClick={() => navigate("/chefs")}>
                    Discover Chefs
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {followingChefs.map((chef) => (
                    <ChefCard
                      key={chef.id}
                      chef={chef}
                    />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfilePage;

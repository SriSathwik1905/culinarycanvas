import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { RecipeCard } from "@/components/RecipeCard";
import { Profile } from "@/types/profile";
import { Recipe, Tag } from "@/types/recipe";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Edit, Globe, ChefHat, Users, UserPlus, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/ProfileForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { followChef, unfollowChef, isFollowingChef } from "@/integrations/supabase/utils";

export const ChefProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [followingChefs, setFollowingChefs] = useState<(Profile & { recipe_count?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("recipes");
  const [stats, setStats] = useState({
    totalRecipes: 0,
    averageRating: 0,
    followerCount: 0
  });

  useEffect(() => {
    const fetchProfileAndRecipes = async () => {
      if (!id) return;

      try {
        // Check if this is the current user
        const { data: { user } } = await supabase.auth.getUser();
        setIsCurrentUser(user?.id === id);
        setCurrentUser(user?.id || null);
        
        // Check if following
        if (user && user.id !== id) {
          const following = await isFollowingChef(id);
          setIsFollowing(following);
        }

        // Fetch profile
        const profileResponse = await supabase
          .from('profiles')
          .select()
          .eq("id", id)
          .single();

        if (profileResponse.data) {
          setProfile(profileResponse.data as Profile);
        } else {
          // If no profile found, redirect to 404 or show error message
          toast.error("No profile found for this chef");
          navigate("/explore");
          return;
        }

        // Fetch recipes
        const recipesResponse = await supabase
          .from('recipes')
          .select()
          .eq("user_id", id)
          .order("created_at", { ascending: false });

        if (recipesResponse.error) throw recipesResponse.error;
        const recipesData = recipesResponse.data || [];

        // Fetch follower count
        const followerCountResponse = await supabase.rpc('get_follower_count', { chef_id: id });
        const followerCount = followerCountResponse.data || 0;

        // Calculate stats
        setStats({
          totalRecipes: recipesData.length,
          averageRating: recipesData.reduce((sum, recipe) => 
            sum + (recipe.average_rating || 0), 0) / 
            (recipesData.filter(recipe => recipe.average_rating).length || 1),
          followerCount: followerCount
        });

        // Fetch tags for recipes and process recipe data
        const recipeIds = recipesData.map(r => r.id);
        const tagsResponse = await supabase
          .from('recipe_tags')
          .select()
          .in("recipe_id", recipeIds);

        const tagsData = tagsResponse.data || [];

        // Get all tags
        const allTagsResponse = await supabase
          .from('tags')
          .select();
        
        const allTags = allTagsResponse.data || [];
        
        // Create a tags map
        const tagsMap: Record<string, Tag> = {};
        allTags.forEach(tag => {
          tagsMap[tag.id] = tag as Tag;
        });

        // Create a map of recipe IDs to their tags
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

        // Add tags to recipes
        const recipesWithTags = recipesData.map(recipe => ({
          ...recipe,
          tags: recipeTags[recipe.id] || [],
          ingredients: recipe.ingredients || []
        }));

        setRecipes(recipesWithTags);

        // If this is the current user, fetch favorite recipes and following chefs
        if (user?.id === id) {
          // Fetch favorite recipes
          const favoritesResponse = await supabase
            .from('favorites')
            .select('recipe_id')
            .eq('user_id', id);
          
          if (!favoritesResponse.error && favoritesResponse.data) {
            const favoriteIds = favoritesResponse.data.map(fav => fav.recipe_id);
            
            if (favoriteIds.length > 0) {
              const favoriteRecipesResponse = await supabase
                .from('recipes')
                .select()
                .in('id', favoriteIds);
              
              if (!favoriteRecipesResponse.error) {
                const favoriteRecipesData = favoriteRecipesResponse.data || [];
                
                // Add tags to favorite recipes
                const favoriteRecipeIds = favoriteRecipesData.map(r => r.id);
                const favoriteTagsResponse = await supabase
                  .from('recipe_tags')
                  .select()
                  .in("recipe_id", favoriteRecipeIds);

                const favoriteTagsData = favoriteTagsResponse.data || [];
                
                // Create a map of recipe IDs to their tags
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

                // Add tags to favorite recipes
                const favoriteRecipesWithTags = favoriteRecipesData.map(recipe => ({
                  ...recipe,
                  tags: favoriteRecipeTags[recipe.id] || [],
                  ingredients: recipe.ingredients || []
                }));

                setFavoriteRecipes(favoriteRecipesWithTags);
              }
            }
          }

          // Fetch following chefs
          const followingResponse = await supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', id);
          
          if (!followingResponse.error && followingResponse.data) {
            const followingIds = followingResponse.data.map(follow => follow.followed_id);
            
            if (followingIds.length > 0) {
              const followingChefsResponse = await supabase
                .from('profiles')
                .select()
                .in('id', followingIds);
              
              if (!followingChefsResponse.error) {
                const followingChefsData = followingChefsResponse.data || [];
                
                // Get recipe count for each chef
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
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndRecipes();
  }, [id, navigate]);

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    window.location.reload();
  };

  const handleFollowToggle = async () => {
    if (!id || !currentUser) {
      toast("Please sign in to follow chefs");
      navigate("/auth");
      return;
    }

    try {
      if (isFollowing) {
        await unfollowChef(id);
        setIsFollowing(false);
        // Update follower count
        setStats(prev => ({
          ...prev,
          followerCount: Math.max(0, prev.followerCount - 1)
        }));
        toast("Unfollowed chef");
      } else {
        await followChef(id);
        setIsFollowing(true);
        // Update follower count
        setStats(prev => ({
          ...prev,
          followerCount: prev.followerCount + 1
        }));
        toast("Now following chef");
      }
    } catch (error) {
      console.error("Error toggling follow status:", error);
      toast.error("Failed to update follow status");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="container mx-auto px-4 pt-24">
          <div className="text-center">Loading profile...</div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="container mx-auto px-4 pt-24">
        <div className="mx-auto max-w-4xl">
          {/* Profile Header */}
          <div className="mb-8 rounded-xl bg-white p-8 shadow-md">
            <div className="flex flex-col items-center md:flex-row md:items-start md:gap-8">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.avatar_url} alt={profile.username} />
                <AvatarFallback className="bg-sage text-white text-4xl">
                  {profile.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="mt-4 flex-1 md:mt-0">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-gray-900">{profile.username}</h1>
                  <div className="flex gap-2">
                    {!isCurrentUser && currentUser && (
                      <Button
                        onClick={handleFollowToggle}
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                    
                    {isCurrentUser && (
                      <Button 
                        onClick={() => setEditDialogOpen(true)}
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="my-4 flex gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-sage" />
                    <span>{stats.totalRecipes} recipes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-sage" />
                    <span>{stats.followerCount} followers</span>
                  </div>
                  {stats.averageRating > 0 && (
                    <div className="flex items-center gap-2">
                      <span>⭐ {stats.averageRating.toFixed(1)} rating</span>
                    </div>
                  )}
                </div>
                
                {profile.bio && (
                  <div className="mb-4 text-gray-700">
                    <p>{profile.bio}</p>
                  </div>
                )}
                
                {profile.website && (
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <a 
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sage hover:underline"
                    >
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {profile.favorite_cuisines && profile.favorite_cuisines.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">Favorite cuisines</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.favorite_cuisines.map((cuisine, idx) => (
                        <Badge key={idx} variant="outline" className="bg-sage/10">
                          {cuisine}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="recipes" className="flex-1">
                {isCurrentUser ? "My Recipes" : `${profile.username}'s Recipes`}
              </TabsTrigger>
              
              {isCurrentUser && (
                <>
                  <TabsTrigger value="favorites" className="flex-1">
                    Favorite Recipes
                  </TabsTrigger>
                  <TabsTrigger value="following" className="flex-1">
                    Chefs I Follow
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            
            {/* My Recipes Tab */}
            <TabsContent value="recipes">
              <section>
                {recipes.length === 0 ? (
                  <div className="rounded-lg bg-white p-8 text-center shadow-md">
                    <h3 className="mb-2 text-xl font-semibold text-gray-900">
                      No recipes yet
                    </h3>
                    {isCurrentUser ? (
                      <>
                        <p className="mb-6 text-gray-600">
                          Start sharing your culinary creations with the world
                        </p>
                        <Button onClick={() => navigate("/recipes/new")}>
                          Create Your First Recipe
                        </Button>
                      </>
                    ) : (
                      <p className="mb-6 text-gray-600">
                        This chef hasn't posted any recipes yet
                      </p>
                    )}
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
            
            {/* Favorite Recipes Tab */}
            {isCurrentUser && (
              <TabsContent value="favorites">
                <section>
                  {favoriteRecipes.length === 0 ? (
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
            )}
            
            {/* Following Chefs Tab */}
            {isCurrentUser && (
              <TabsContent value="following">
                <section>
                  {followingChefs.length === 0 ? (
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
                        <div 
                          key={chef.id}
                          className="flex flex-col rounded-xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg cursor-pointer"
                          onClick={() => navigate(`/chefs/${chef.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={chef.avatar_url} alt={chef.username} />
                              <AvatarFallback className="bg-sage text-white text-xl">
                                {chef.username ? chef.username.charAt(0).toUpperCase() : "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{chef.username}</h3>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <ChefHat className="h-3 w-3" />
                                <span>{chef.recipe_count} recipes</span>
                              </div>
                            </div>
                          </div>
                          {chef.bio && (
                            <p className="mt-4 text-sm text-gray-600 line-clamp-3">{chef.bio}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] overflow-y-auto px-1">
            <ProfileForm 
              initialData={profile}
              onSuccess={handleEditSuccess}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChefProfile;

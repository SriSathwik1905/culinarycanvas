import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RecipeCard } from "@/components/RecipeCard";
import { Navbar } from "@/components/Navbar";
import { ChefHat, Clock, Flame, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { typedSupabase } from "@/integrations/supabase/utils";
import { Recipe, Tag } from "@/types/recipe";
import { Button } from "@/components/ui/button";

const CategoryCard = ({ icon: Icon, title, count }: { icon: any; title: string; count: number }) => (
  <div className="flex items-center space-x-4 rounded-xl bg-white p-4 shadow-md transition-all hover:shadow-lg">
    <div className="rounded-lg bg-sage/10 p-3">
      <Icon className="h-6 w-6 text-sage" />
    </div>
    <div>
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{count} recipes</p>
    </div>
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{[key: string]: Recipe[]}>({});

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get recipes with all their data
      const recipesResponse = await supabase.from('recipes').select();

      if (recipesResponse.error) {
        console.error("Error fetching recipes:", recipesResponse.error);
        setIsLoading(false);
        return;
      }

      const recipesData = recipesResponse.data || [];

      // Fetch tags for recipes
      const recipeIds = recipesData.map(r => r.id);
      const tagsResponse = await supabase.from('recipe_tags')
        .select()
        .in('recipe_id', recipeIds);
      
      const tagsData = tagsResponse.data || [];

      // Fetch all tags
      const allTagsResponse = await supabase.from('tags').select();
      const allTagsData = allTagsResponse.data || [];
      
      // Create a tags map
      const tagsMap: Record<string, Tag> = {};
      allTagsData.forEach(tag => {
        tagsMap[tag.id] = tag as Tag;
      });

      // Create a map of recipe IDs to their tags
      const recipeTags: Record<string, Tag[]> = {};
      tagsData.forEach(item => {
        if (!recipeTags[item.recipe_id]) {
          recipeTags[item.recipe_id] = [];
        }
        
        const tagData = tagsMap[item.tag_id];
        if (tagData) {
          recipeTags[item.recipe_id].push(tagData);
        }
      });

      // Add tags and ingredients to recipes
      const recipesWithTags = recipesData.map(recipe => ({
        ...recipe,
        tags: recipeTags[recipe.id] || [],
        ingredients: recipe.ingredients || []
      }));

      setRecipes(recipesWithTags);

      // Organize recipes by cuisine
      const categorized = recipesWithTags.reduce((acc: {[key: string]: Recipe[]}, recipe) => {
        if (!acc[recipe.cuisine]) {
          acc[recipe.cuisine] = [];
        }
        acc[recipe.cuisine].push(recipe);
        return acc;
      }, {});
      
      setCategories(categorized);
      setIsLoading(false);
    };

    fetchRecipes();
  }, [navigate]);

  useEffect(() => {
    const loadFeaturedContent = async () => {
      try {
        // Load featured content logic
      } catch (error: unknown) {
        console.error("Error loading featured content:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        // Handle error
      }
    };

    loadFeaturedContent();
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="container mx-auto px-4 pt-24">
        <section className="mb-16 animate-fade-up">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">
              Discover Culinary Excellence
            </h1>
            <p className="mb-8 text-lg text-gray-600">
              Explore our collection of hand-picked recipes from around the world,
              crafted by passionate chefs and home cooks
            </p>
            <Button 
              onClick={() => navigate("/recipes/new")}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create New Recipe
            </Button>
          </div>
          
          <div className="mb-12 mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CategoryCard 
              icon={ChefHat} 
              title="Total Recipes" 
              count={recipes.length} 
            />
            <CategoryCard 
              icon={Clock} 
              title="Quick & Easy" 
              count={recipes.filter(r => (r.prep_time_minutes + r.cook_time_minutes) <= 30).length} 
            />
            <CategoryCard 
              icon={Flame} 
              title="Advanced Recipes" 
              count={recipes.filter(r => r.difficulty === 'hard').length} 
            />
          </div>

          {Object.entries(categories).map(([cuisine, cuisineRecipes]) => (
            <div key={cuisine} className="mb-12">
              <h2 className="mb-6 text-2xl font-semibold text-gray-900">
                {cuisine} Cuisine
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cuisineRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
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
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Index;

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Recipe, Tag, Difficulty } from "@/types/recipe";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserId } from "@/integrations/supabase/utils";

export interface SortOption {
  label: string;
  value: string;
}

interface RecipesDataProps {
  searchQuery: string;
  sortBy: string;
  filterCuisine: string;
  filterDifficulty: string;
  ingredients: string[];
  maxCookTime: number | null;
  selectedTags: string[];
}

export const useRecipesData = ({
  searchQuery,
  sortBy,
  filterCuisine,
  filterDifficulty,
  ingredients,
  maxCookTime,
  selectedTags,
}: RecipesDataProps) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const { user } = useAuth();
  
  // Create refs to track last request params and prevent duplicate requests
  const lastRequestParams = useRef("");
  const fetchingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const errorCountRef = useRef(0);
  const cachedRecipesRef = useRef<Recipe[]>([]);
  
  // Use this to prevent too frequent refetches
  const lastFetchTime = useRef(0);

  const fetchRecipes = useCallback(async (force = false) => {
    // Skip if we're already fetching or if we've had too many errors
    if (fetchingRef.current && !force) {
      console.log("Skipping fetch - another request is in progress");
      return;
    }
    
    // Prevent rapid refetches
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 3000 && recipes.length > 0) {
      console.log("Skipping fetch - too soon since last fetch");
      return;
    }
    
    // Track attempt count
    setFetchAttempts(prev => prev + 1);
    
    // Throttle if we've had multiple attempts in succession
    if (fetchAttempts > 3 && !force) {
      console.warn("Too many fetch attempts, throttling");
      setTimeout(() => {
        setFetchAttempts(0);
      }, 5000);
      return;
    }

    // Create a parameter signature to detect duplicate requests
    const requestSignature = JSON.stringify({
      searchQuery,
      sortBy,
      filterCuisine,
      filterDifficulty,
      ingredients,
      maxCookTime,
      selectedTags
    });
    
    // Don't refetch with the same parameters unless forced
    if (requestSignature === lastRequestParams.current && !force && recipes.length > 0) {
      console.log("Skipping duplicate request with same parameters");
      setIsLoading(false);
      return;
    }
    
    // Set fetching state
    fetchingRef.current = true;
    lastRequestParams.current = requestSignature;
    lastFetchTime.current = now;
    
    // Only show loading if we don't have cached results
    if (cachedRecipesRef.current.length === 0) {
      setIsLoading(true);
    }
    
    setError(null);
    
    // Set a timeout to catch stuck requests
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout to detect long-running requests
    timeoutRef.current = window.setTimeout(() => {
      if (fetchingRef.current) {
        console.warn("Recipe fetch taking too long, using cached data");
        
        // Use cached data if available
        if (cachedRecipesRef.current.length > 0) {
          console.log("Using cached recipes:", cachedRecipesRef.current.length);
          setRecipes(cachedRecipesRef.current);
          setIsLoading(false);
          fetchingRef.current = false;
        } else {
          setError("Request took too long. Showing any available recipes.");
          // Keep any recipes we might already have
          setIsLoading(false);
          fetchingRef.current = false;
        }
      }
    }, 8000); // 8 second timeout
    
    try {
      console.info("Fetching recipes with filters:", {
        searchQuery,
        sortBy,
        filterCuisine,
        filterDifficulty,
        ingredients,
        maxCookTime,
      });

      // Start building the query
      let query = supabase.from("recipes").select("*");

      // Apply text search if provided
      if (searchQuery) {
        try {
          // First try to use the search_recipes function if it exists
          const { data, error } = await supabase.rpc('search_recipes', {
            search_term: searchQuery
          });
          
          if (error) {
            console.error("Search query error:", error);
            // Fall back to basic filtering if the function doesn't exist
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,instructions.ilike.%${searchQuery}%`);
          } else if (data) {
            // Function exists but we need to continue with our other filters
            // Extract the IDs and use them in our query
            const recipeIds = data.map((recipe: { id: string }) => recipe.id);
            if (recipeIds.length > 0) {
              query = query.in('id', recipeIds);
            } else {
              // No recipes match the search query
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              setRecipes([]);
              setIsLoading(false);
              fetchingRef.current = false;
              return;
            }
          }
        } catch (error) {
          console.error("Search error:", error);
          // Fall back to basic filtering
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,instructions.ilike.%${searchQuery}%`);
        }
      }

      // Apply cuisine filter
      if (filterCuisine) {
        query = query.ilike("cuisine", `%${filterCuisine}%`);
      }

      // Apply difficulty filter
      if (filterDifficulty) {
        query = query.eq("difficulty", filterDifficulty);
      }

      // Apply cooking time filter
      if (maxCookTime) {
        query = query.lte("cook_time_minutes", maxCookTime);
      }

      // Apply ingredients filter
      if (ingredients.length > 0) {
        // For each ingredient, find recipes that contain it
        // This creates a condition like: ingredients[0] ILIKE '%egg%' OR ingredients[1] ILIKE '%egg%'...
        let ingredientFilter = "";
        ingredients.forEach((ingredient, index) => {
          const cleanIngredient = ingredient.toLowerCase().trim();
          if (index > 0) ingredientFilter += ",";
          ingredientFilter += cleanIngredient;
        });
        
        // Use RPC call for ingredients search if available
        try {
          const { data: ingredientResults, error: ingredientError } = await supabase
            .rpc('search_recipes_by_ingredients', { ingredient_list: ingredientFilter });
            
          if (!ingredientError && ingredientResults) {
            const recipeIds = ingredientResults.map((recipe: any) => recipe.id);
            if (recipeIds.length > 0) {
              query = query.in('id', recipeIds);
            } else {
              // No recipes match the ingredients
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              setRecipes([]);
              setIsLoading(false);
              fetchingRef.current = false;
              return;
            }
          } else {
            // Fall back to basic filtering
            ingredients.forEach(ingredient => {
              // Extract the ingredient name without quantity
              const cleanIngredient = ingredient.split('(')[0].trim().toLowerCase();
              query = query.filter('ingredients', 'cs', `{${cleanIngredient}}`);
            });
          }
        } catch (error) {
          console.error("Ingredient search error:", error);
          // Fall back to basic filtering
          ingredients.forEach(ingredient => {
            const cleanIngredient = ingredient.split('(')[0].trim().toLowerCase();
            query = query.filter('ingredients', 'cs', `{${cleanIngredient}}`);
          });
        }
      }

      // Apply tag filters
      if (selectedTags.length > 0) {
        // First get all recipe_ids that match the selected tags
        const { data: taggedRecipes, error: tagError } = await supabase
          .from('recipe_tags')
          .select('recipe_id')
          .in('tag_id', selectedTags);

        if (tagError) {
          console.error("Error fetching recipes by tags:", tagError);
        } else if (taggedRecipes && taggedRecipes.length > 0) {
          // Extract recipe IDs and filter by them
          const recipeIds = taggedRecipes.map(item => item.recipe_id);
          query = query.in('id', recipeIds);
        } else {
          // No recipes match these tags, return empty result
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setRecipes([]);
          setIsLoading(false);
          fetchingRef.current = false;
          return;
        }
      }

      // Apply sorting
      console.info("Sorting by:", {
        label: sortBy === "newest" ? "Newest First" : sortBy === "rating" ? "Highest Rated" : "Cooking Time",
        value: sortBy,
        column: sortBy === "newest" ? "created_at" : sortBy === "rating" ? "average_rating" : "cook_time_minutes",
        ascending: sortBy === "cook_time"
      });

      if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "rating") {
        // Fix: Remove nullsLast property which is not supported
        query = query.order("average_rating", { ascending: false });
      } else if (sortBy === "cook_time") {
        query = query.order("cook_time_minutes", { ascending: true });
      }

      // Set a limit to avoid too many results - reduce from 100 to 20 to improve performance
      query = query.limit(20);

      // Execute the query with a timeout
      const { data: recipesData, error: recipesError } = await query;

      // Clear the timeout since the query has completed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (recipesError) {
        console.error("Error fetching recipes:", recipesError);
        errorCountRef.current++;
        
        // If we have cached data, use it
        if (cachedRecipesRef.current.length > 0) {
          console.log("Using cached recipes after error:", cachedRecipesRef.current.length);
          setRecipes(cachedRecipesRef.current);
          setError("Showing cached results. Please try again later.");
        } else {
          setError("Failed to load recipes. Please try again later.");
        }
        
        setIsLoading(false);
        fetchingRef.current = false;
        return;
      }

      console.info("Found", recipesData?.length, "recipes");
      
      // If we don't have any recipes, return early
      if (!recipesData || recipesData.length === 0) {
        setRecipes([]);
        setIsLoading(false);
        fetchingRef.current = false;
        return;
      }
      
      // Store the basic recipes in state temporarily
      setRecipes(recipesData);
      
      // Cache the recipes for future use
      cachedRecipesRef.current = recipesData;
      
      // Reset error count on successful fetch
      errorCountRef.current = 0;
      
      // If user is not logged in, skip the likes/ratings fetch
      let userId = null;
      try {
        // Try to get userId, but don't fail if it's not available
        userId = user?.id || await getCurrentUserId();
      } catch (err) {
        console.log("No authenticated user, skipping likes/ratings fetch");
      }

      // Only fetch likes and ratings if we have a userId
      if (userId) {
        try {
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('recipe_id')
            .eq('user_id', userId);

          if (!likesError && likesData) {
            const likedRecipes: Record<string, boolean> = {};
            likesData.forEach(like => {
              likedRecipes[like.recipe_id] = true;
            });
            console.info("Found", Object.keys(likedRecipes).length, "liked recipes");
            setLikes(likedRecipes);
          }

          // Fetch user ratings
          const { data: ratingsData, error: ratingsError } = await supabase
            .from('ratings')
            .select('recipe_id, rating')
            .eq('user_id', userId);

          if (!ratingsError && ratingsData) {
            const ratedRecipes: Record<string, number> = {};
            ratingsData.forEach(rating => {
              ratedRecipes[rating.recipe_id] = rating.rating;
            });
            console.info("Found", Object.keys(ratedRecipes).length, "rated recipes");
            setUserRatings(ratedRecipes);
          }
        } catch (error) {
          console.error("Error fetching user-specific data:", error);
          // Continue without user-specific data
        }
      } else {
        console.log("No authenticated user, skipping likes/ratings fetch");
      }

      // Fetch tags for each recipe - only if we have recipes and no errors so far
      try {
        console.info("Fetching tags for", recipesData.length, "recipes");
        const recipeIds = recipesData.map(recipe => recipe.id);
        
        const { data: recipeTagsData, error: recipeTagsError } = await supabase
          .from('recipe_tags')
          .select('recipe_id, tag_id')
          .in('recipe_id', recipeIds);
          
        if (recipeTagsError) {
          console.error("Error fetching recipe tags:", recipeTagsError);
          // Continue without tags
          setRecipes(recipesData);
        } else {
          console.info("Found", recipeTagsData?.length || 0, "recipe-tag associations");
          
          // Fetch all tags - we cache these for performance
          const { data: tagsData, error: tagsError } = await supabase
            .from('tags')
            .select('*');
            
          if (tagsError) {
            console.error("Error fetching tags:", tagsError);
            // Continue without tags
            setRecipes(recipesData);
          } else {
            // Map tags to recipes
            const recipesWithTags = recipesData.map(recipe => {
              const recipeTags = (recipeTagsData || [])
                .filter(rt => rt.recipe_id === recipe.id)
                .map(rt => {
                  const tag = tagsData?.find(t => t.id === rt.tag_id);
                  return tag;
                })
                .filter(Boolean);
                
              return {
                ...recipe,
                tags: recipeTags
              };
            });
            
            setRecipes(recipesWithTags);
            // Update cache with tagged recipes
            cachedRecipesRef.current = recipesWithTags;
          }
        }
      } catch (error) {
        console.error("Error fetching recipe tags:", error);
        // At least set the recipes we have
        setRecipes(recipesData);
      }
      
      setIsLoading(false);
      fetchingRef.current = false;
    } catch (error) {
      console.error("Unexpected error fetching recipes:", error);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      errorCountRef.current++;
      
      // If we have cached recipes, use them
      if (cachedRecipesRef.current.length > 0) {
        console.log("Using cached recipes after unexpected error");
        setRecipes(cachedRecipesRef.current);
        setError("Showing cached results. Network issues detected.");
      } else {
        setError("An unexpected error occurred. Please try again.");
        // Keep any recipes we might already have
        if (recipes.length === 0) {
          // Create fallback recipes if we have no data at all
          const fallbackRecipes: Recipe[] = [
            {
              id: "fallback-1",
              title: "Classic Pasta Carbonara",
              description: "A creamy Italian pasta dish with eggs and pancetta",
              user_id: "system",
              created_at: new Date().toISOString(),
              average_rating: 4.5,
              cuisine: "Italian",
              cook_time_minutes: 25,
              prep_time_minutes: 10,
              servings: 4,
              difficulty: "medium" as Difficulty,
              ingredients: ["Pasta", "Eggs", "Pancetta", "Parmesan", "Black Pepper"],
              instructions: "1. Cook pasta according to package directions.\n2. In a bowl, mix eggs and grated parmesan cheese.\n3. Cook diced pancetta until crispy.\n4. Drain pasta and immediately toss with egg mixture and pancetta.\n5. Season with freshly ground black pepper and serve immediately.",
              tags: []
            },
            {
              id: "fallback-2",
              title: "Simple Vegetable Stir Fry",
              description: "Quick and healthy vegetable stir fry with soy sauce",
              user_id: "system",
              created_at: new Date().toISOString(),
              average_rating: 4.2,
              cuisine: "Asian",
              cook_time_minutes: 15,
              prep_time_minutes: 10,
              servings: 2,
              difficulty: "easy" as Difficulty,
              ingredients: ["Bell Peppers", "Broccoli", "Carrots", "Soy Sauce", "Garlic", "Ginger", "Vegetable Oil"],
              instructions: "1. Heat oil in a wok or large skillet over high heat.\n2. Add minced garlic and ginger, stir for 30 seconds.\n3. Add vegetables and stir-fry for 5-7 minutes until crisp-tender.\n4. Add soy sauce and any other desired seasonings.\n5. Serve hot over rice or noodles.",
              tags: []
            }
          ];
          setRecipes(fallbackRecipes);
        }
      }
      
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [
    searchQuery,
    sortBy,
    filterCuisine,
    filterDifficulty,
    ingredients,
    maxCookTime,
    selectedTags,
    user,
    recipes.length,
    fetchAttempts
  ]);

  // Initial fetch on component mount or when search parameters change
  useEffect(() => {
    // Use a small delay to prevent too many calls when multiple filters change at once
    const debounceTimer = setTimeout(() => {
      fetchRecipes();
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [fetchRecipes]);

  return {
    recipes,
    isLoading,
    error,
    likes,
    userRatings,
    setLikes,
    setUserRatings,
    setRecipes,
    refetchRecipes: () => fetchRecipes(true)
  };
};

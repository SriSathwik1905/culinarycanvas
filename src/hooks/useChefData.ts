import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { useAuth } from "@/hooks/useAuth";

/**
 * Custom hook for fetching chef data with their recipe counts
 * 
 * This hook manages fetching chef profiles with their recipe counts,
 * includes optimizations for caching and efficient data retrieval,
 * and ensures the current user is included in results.
 */
export const useChefData = (initialChefs: Profile[] = []) => {
  // -------------------- STATE --------------------
  const [chefsWithCounts, setChefsWithCounts] = useState<(Profile & { recipe_count?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const { user } = useAuth();

  // Add refs to track state and prevent infinite loops
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);
  const userCheckedRef = useRef(false);

  /**
   * Directly query the database for chef data
   * Uses either RPC function or falls back to manual queries
   */
  const fetchChefsDirectly = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches
    if (fetchingRef.current && !forceRefresh) {
      console.log("📊 Skipping fetch - already in progress");
      return;
    }
    
    // Set fetching flag
    fetchingRef.current = true;
    console.log("📊 Direct chef data fetch initiated", forceRefresh ? "(forced refresh)" : "");
    
    try {
      setIsLoading(true);
      setError(null);
      
      // APPROACH 1: Try using the RPC function for best performance
      // Temporarily skipping RPC approach since the function doesn't exist yet
      // Will use the fallback approach instead
      console.log("⚡ Skipping RPC function call - using direct query approach");
      
      // Step 1: Get all profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (profilesError) {
        throw profilesError;
      }
      
      if (!profiles || profiles.length === 0) {
        console.log("ℹ️ No profiles found in database");
        setChefsWithCounts([]);
        setLastFetch(Date.now());
        initializedRef.current = true;
        return;
      }
      
      console.log(`🧑‍🍳 Found ${profiles.length} profiles in database`);
      
      // Step 2: Get recipe counts for all profiles
      const { data: recipeCounts, error: recipeCountsError } = await supabase
        .from('recipes')
        .select('user_id, id');
        
      if (recipeCountsError) {
        throw recipeCountsError;
      }
      
      console.log(`🍽️ Found ${recipeCounts?.length || 0} recipes in database`);
      
      // Process data manually
      const countByUser: Record<string, number> = {};
      recipeCounts?.forEach(recipe => {
        countByUser[recipe.user_id] = (countByUser[recipe.user_id] || 0) + 1;
      });
      
      // Map chefs to include recipe count and filter for valid ones
      const validProfiles = profiles
        .map(profile => ({
          ...profile,
          recipe_count: countByUser[profile.id] || 0
        }))
        // Make sure each profile has a valid username and at least one recipe
        .filter(chef => chef.username && chef.recipe_count > 0)
        .sort((a, b) => (b.recipe_count || 0) - (a.recipe_count || 0));

      console.log(`📊 Found ${validProfiles.length} chefs with recipes via direct query`);
      
      // APPROACH 3: Direct inclusion of current user if needed
      await ensureCurrentUserIncluded(validProfiles);
      
      // Update last fetch timestamp and mark as initialized
      setLastFetch(Date.now());
      initializedRef.current = true;
    } catch (error) {
      console.error("❌ Error fetching chefs directly:", error);
      setError("Failed to load chef data");
      setChefsWithCounts([]);
      // Still mark as initialized to prevent infinite loops
      initializedRef.current = true;
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [user]);

  /**
   * Ensures the current user is included in the chef list if they have recipes
   * This is a critical function to fix the issue of users not seeing themselves
   */
  const ensureCurrentUserIncluded = async (chefList: (Profile & { recipe_count?: number })[]) => {
    if (!user) {
      console.log("ℹ️ No logged in user to include in chef list");
      setChefsWithCounts(chefList);
      return;
    }
    
    // Mark that we've checked this user
    userCheckedRef.current = true;
    
    console.log("🔍 Checking if current user needs to be added to chef list");
    
    // Check if current user is already in the list
    const currentUserInList = chefList.some(chef => chef.id === user.id);
    
    if (!currentUserInList) {
      console.log(`🧑‍🍳 Current user (${user.id}) not found in chef list, checking if they have recipes`);
      
      try {
        // Check if current user has recipes - DIRECT QUERY
        const { data: userRecipes, error: recipesError } = await supabase
          .from('recipes')
          .select('id')
          .eq('user_id', user.id);
          
        if (recipesError) {
          console.error("❌ Error checking current user recipes:", recipesError);
          setChefsWithCounts(chefList);
          return;
        }
          
        if (userRecipes && userRecipes.length > 0) {
          console.log(`✅ Current user has ${userRecipes.length} recipes, adding to chef list`);
          
          // APPROACH 4: Get latest profile data directly for current user
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (profileError) {
            console.error("❌ Error fetching current user profile:", profileError);
            setChefsWithCounts(chefList);
            return;
          }
            
          if (userProfile && userProfile.username) {
            // Add current user to the list with their recipe count
            const updatedList = [
              ...chefList,
              {
                ...userProfile,
                recipe_count: userRecipes.length
              }
            ].sort((a, b) => (b.recipe_count || 0) - (a.recipe_count || 0));
            
            console.log("✅ Chef list updated to include current user");
            setChefsWithCounts(updatedList);
            return;
          }
        } else {
          console.log("ℹ️ Current user has no recipes, not adding to chef list");
        }
      } catch (err) {
        console.error("❌ Error in ensureCurrentUserIncluded:", err);
      }
    } else {
      console.log("✅ Current user already included in chef list");
    }
    
    // If we get here, set the chef list as is
    setChefsWithCounts(chefList);
  };

  // -------------------- EFFECTS --------------------

  /**
   * Initial data loading effect
   * Uses initialChefs if provided, otherwise fetches directly
   */
  useEffect(() => {
    // Skip if already initialized
    if (initializedRef.current) {
      console.log("🔄 Already initialized, skipping redundant fetch");
      return;
    }
    
    // If initialChefs is provided and has content, use it
    if (initialChefs && initialChefs.length > 0) {
      console.log("🔄 Using provided initialChefs:", initialChefs.length);
      setChefsWithCounts(initialChefs.map(chef => ({
        ...chef,
        recipe_count: 1 // Assume at least 1 recipe for each chef
      })));
      setLastFetch(Date.now());
      initializedRef.current = true;
      setIsLoading(false);
    } else {
      console.log("🔍 No initialChefs, fetching directly from database");
      fetchChefsDirectly(true);
    }
  }, [initialChefs, fetchChefsDirectly]);

  /**
   * User change effect
   * Ensures current user is included when user changes
   */
  useEffect(() => {
    // Only run once when user is available and we've initialized data
    if (user && initializedRef.current && !userCheckedRef.current && !fetchingRef.current) {
      // We already have data but user has changed - check if they're in the list
      const currentUserInList = chefsWithCounts.some(chef => chef.id === user.id);
      
      if (!currentUserInList) {
        console.log("🔄 User changed, checking if they need to be added to chef list (once)");
        
        // APPROACH 5: Add user to chef list when user changes and isn't in the list
        const checkUserRecipes = async () => {
          userCheckedRef.current = true; // Mark as checked to prevent loops
          try {
            const { data: userRecipes } = await supabase
              .from('recipes')
              .select('id')
              .eq('user_id', user.id);
              
            if (userRecipes && userRecipes.length > 0) {
              console.log(`🧑‍🍳 Current user (${user.id}) has ${userRecipes.length} recipes but isn't in chef list.`);
              
              // Get the latest profile for the user
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
                
              if (userProfile && userProfile.username) {
                console.log("🔨 Manual user insertion into chef list");
                // Create updated list with user included
                const updatedList = [
                  ...chefsWithCounts,
                  {
                    ...userProfile,
                    recipe_count: userRecipes.length
                  }
                ].sort((a, b) => (b.recipe_count || 0) - (a.recipe_count || 0));
                
                setChefsWithCounts(updatedList);
              }
            }
          } catch (err) {
            console.error("❌ Error checking user recipes:", err);
          }
        };
        
        checkUserRecipes();
      }
    }
  }, [user, chefsWithCounts, lastFetch, fetchChefsDirectly]);

  // Get featured chefs (top 3 by recipe count)
  const featuredChefs = [...chefsWithCounts]
    .filter(chef => chef.username) // Ensure chef has username
    .slice(0, 3);

  /**
   * Function to sort chefs by different criteria
   */
  const getSortedChefs = (
    chefsToSort: (Profile & { recipe_count?: number })[], 
    sortBy: "newest" | "recipe_count" | "alphabetical"
  ) => {
    if (!chefsToSort || chefsToSort.length === 0) {
      return [];
    }
    
    try {
      // Filter out chefs without usernames
      const validChefs = chefsToSort.filter(chef => chef.username);
      
      switch (sortBy) {
        case "newest":
          return [...validChefs].sort((a, b) => 
            new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
          );
        case "recipe_count":
          return [...validChefs].sort((a, b) => 
            (b.recipe_count || 0) - (a.recipe_count || 0)
          );
        case "alphabetical":
          return [...validChefs].sort((a, b) => 
            (a.username || "").localeCompare(b.username || "")
          );
        default:
          return validChefs;
      }
    } catch (err) {
      console.error("❌ Error sorting chefs:", err);
      return chefsToSort.filter(chef => chef.username);
    }
  };

  // Return hook values and functions
  return {
    chefsWithCounts,    // List of chefs with recipe counts
    featuredChefs,      // Top 3 chefs
    getSortedChefs,     // Function to sort chefs
    isLoading,          // Loading state
    error,              // Error state
    refreshChefs: () => {
      // Reset flags and fetch
      initializedRef.current = false;
      userCheckedRef.current = false;
      fetchChefsDirectly(true);
    },
    forceAddCurrentUser: async () => {  // Function to force add current user
      if (user) {
        const chefList = [...chefsWithCounts];
        await ensureCurrentUserIncluded(chefList);
      }
    }
  };
};

export default useChefData;

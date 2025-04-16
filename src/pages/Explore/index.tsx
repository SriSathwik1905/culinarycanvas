import { useState, useEffect, useCallback } from "react";
import { SearchBar } from "./components/SearchBar";
import { FilterPopover } from "./components/FilterPopover";
import { RecipeResults } from "./components/RecipeResults";
import { useRecipesData } from "./hooks/useRecipesData";
import { Tag, Difficulty } from "@/types/recipe";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefGrid } from "@/components/chef/ChefGrid";
import { useChefData } from "@/hooks/useChefData";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// ======================================================
// Explore Page Component
// Provides UI for exploring recipes and chefs
// ======================================================
const Explore = () => {
  // -------------------- STATE --------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [filterCuisine, setFilterCuisine] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<"" | Difficulty>("");
  const [maxCookTime, setMaxCookTime] = useState<number | null>(null);
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("recipes");
  const [chefs, setChefs] = useState<Profile[]>([]);
  const [chefsLoading, setChefsLoading] = useState(true);
  const [chefsError, setChefsError] = useState<string | null>(null);
  const [userDebugInfo, setUserDebugInfo] = useState<string | null>(null);
  
  // -------------------- HOOKS --------------------
  const navigate = useNavigate();
  const { user } = useAuth();

  // -------------------- CHEF DATA --------------------
  // Use chef data hook with the fetched chefs
  const { 
    chefsWithCounts, 
    isLoading: chefDataLoading,
    error: chefDataError,
    refreshChefs 
  } = useChefData(chefs);

  // -------------------- RECIPE DATA --------------------
  // Use the custom hook for fetching recipes with filters
  const {
    recipes,
    isLoading: recipesLoading,
    error: recipesError,
    likes,
    userRatings,
    setLikes,
    setUserRatings,
    setRecipes,
    refetchRecipes
  } = useRecipesData({
    searchQuery,
    sortBy,
    filterCuisine,
    filterDifficulty,
    ingredients: ingredients.map(ing => ing.split(' (')[0].trim()), // Extract ingredient name without quantity
    maxCookTime,
    selectedTags: selectedTags.map(tag => tag.id)
  });

  // -------------------- DEBUG HANDLER --------------------
  // Function to show debug information to help troubleshoot chef visibility issues
  const showCurrentUserDebugInfo = useCallback(async () => {
    if (!user) {
      setUserDebugInfo("No user is currently logged in");
      return;
    }

    try {
      // Check if user exists in profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setUserDebugInfo(`Profile error: ${profileError.message}`);
        return;
      }

      // Check if user has recipes
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('id')
        .eq('user_id', user.id);

      if (recipeError) {
        setUserDebugInfo(`Recipe query error: ${recipeError.message}`);
        return;
      }

      // Check if user is in the chef list
      const userInChefList = chefsWithCounts.some(chef => chef.id === user.id);

      setUserDebugInfo(
        `User Debug Info:
        Username: ${user.username}
        ID: ${user.id}
        Has profile: ${!!profileData}
        Recipe count: ${recipeData?.length || 0}
        In chef list: ${userInChefList ? 'Yes' : 'No'}`
      );

      // If user has recipes but is not in the list, force add them
      if (recipeData && recipeData.length > 0 && !userInChefList && profileData) {
        console.log("🔧 Force adding current user to chef list");
        
        // Create a new chef list with the user included
        const updatedChefs = [
          ...chefsWithCounts,
          {
            ...profileData,
            recipe_count: recipeData.length
          }
        ].sort((a, b) => (b.recipe_count || 0) - (a.recipe_count || 0));
        
        // Manually update the chef list
        setChefs(prevChefs => [
          ...prevChefs.filter(chef => chef.id !== user.id),
          profileData
        ]);
      }
    } catch (err) {
      setUserDebugInfo(`Error checking user data: ${err}`);
    }
  }, [user, chefsWithCounts]);

  // -------------------- REFRESH FUNCTION --------------------
  // Function to refresh chefs with enhanced error handling and debugging
  const refreshChefData = async () => {
    setChefsLoading(true);
    setChefsError(null);
    console.log("🔄 Refreshing chef list");
    
    try {
      // First check if the current user has recipes
      if (user?.id) {
        const { data: userRecipes, error: userRecipesError } = await supabase
          .from('recipes')
          .select('id')
          .eq('user_id', user.id);
        
        if (!userRecipesError && userRecipes && userRecipes.length > 0) {
          console.log(`🧑‍🍳 Current user has ${userRecipes.length} recipes`);
          
          // DIRECT FIX: Make sure the user profile is in the profiles list
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (userProfile) {
            // Ensure we have the user profile in the chef list
            setChefs(prevChefs => {
              // Only add if not already present
              if (!prevChefs.some(chef => chef.id === user.id)) {
                console.log("🔨 Manually adding current user profile to chef list");
                return [...prevChefs, userProfile];
              }
              return prevChefs;
            });
          }
        }
      }
      
      // Direct database query instead of relying on cached data
      await refreshChefs(true);
      
      // After refresh, check if user was included
      setTimeout(() => {
        if (user && !chefsWithCounts.some(chef => chef.id === user.id)) {
          console.log("⚠️ User still not in chef list after refresh, showing debug info");
          showCurrentUserDebugInfo();
        }
      }, 1000);
    } catch (err) {
      console.error("Error refreshing chefs:", err);
      setChefsError("Failed to reload chefs");
    } finally {
      setChefsLoading(false);
    }
  };

  // -------------------- CUISINE OPTIONS --------------------
  // Available cuisine options for filtering
  const cuisineOptions = [
    "Italian",
    "Mexican",
    "Chinese",
    "Japanese",
    "Indian",
    "Thai",
    "Mediterranean",
    "American",
    "French",
    "Greek"
  ];

  // -------------------- SORT OPTIONS --------------------
  // Available sort options for recipe list
  const sortOptions = [
    { label: "Newest First", value: "newest" },
    { label: "Highest Rated", value: "rating" },
    { label: "Cook Time (Low to High)", value: "cook_time" }
  ];

  // -------------------- EFFECTS --------------------
  // Called when Explore page mounts or when tab changes
  useEffect(() => {
    if (activeTab === "chefs") {
      console.log("Chefs tab activated, refreshing data");
      refreshChefData();
    }
  }, [activeTab]);

  // Special effect to ensure the current user is displayed when they have recipes
  useEffect(() => {
    if (activeTab === "chefs" && user && chefsWithCounts.length > 0) {
      const isUserInChefList = chefsWithCounts.some(chef => chef.id === user.id);
      
      if (!isUserInChefList) {
        // Check if user has recipes
        const checkUserRecipes = async () => {
          try {
            const { data: userRecipes } = await supabase
              .from('recipes')
              .select('id')
              .eq('user_id', user.id);
              
            if (userRecipes && userRecipes.length > 0) {
              console.log("🔎 User has recipes but isn't in chef list - showing debug info");
              showCurrentUserDebugInfo();
            }
          } catch (error) {
            console.error("Error checking user recipes:", error);
          }
        };
        
        checkUserRecipes();
      }
    }
  }, [activeTab, user, chefsWithCounts, showCurrentUserDebugInfo]);

  // -------------------- SEARCH HANDLER --------------------
  // Function to handle search button click
  const handleSearch = () => {
    if (activeTab === "recipes") {
      refetchRecipes();
    }
    // For now, chef search is handled by the local filter below
  };

  // -------------------- FILTER CHEFS --------------------
  // Filter chefs based on search query
  const filteredChefs = searchQuery.trim() 
    ? chefsWithCounts.filter(chef => 
        chef.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chef.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chef.favorite_cuisines?.some(cuisine => cuisine.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chefsWithCounts;

  // -------------------- RESET FILTERS --------------------
  // Function to reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setIngredients([]);
    setSortBy("newest");
    setFilterCuisine("");
    setFilterDifficulty("");
    setMaxCookTime(null);
    refetchRecipes();
  };

  // Combined loading and error states
  const isLoading = activeTab === "recipes" ? recipesLoading : (chefsLoading || chefDataLoading);
  const error = activeTab === "recipes" ? recipesError : (chefsError || chefDataError);

  // -------------------- RENDER --------------------
  return (
    <div className="container mx-auto px-4 py-8">
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        ingredients={ingredients}
        setIngredients={setIngredients}
        showTagsPanel={showTagsPanel}
        setShowTagsPanel={setShowTagsPanel}
        handleSearch={handleSearch}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterPopover
          sortBy={sortBy}
          setSortBy={setSortBy}
          filterCuisine={filterCuisine}
          setFilterCuisine={setFilterCuisine}
          filterDifficulty={filterDifficulty}
          setFilterDifficulty={setFilterDifficulty}
          cuisineOptions={cuisineOptions}
          resetFilters={resetFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          sortOptions={sortOptions}
          maxCookTime={maxCookTime}
          setMaxCookTime={setMaxCookTime}
        />
      </div>

      <Tabs defaultValue="recipes" className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="recipes">Explore Recipes</TabsTrigger>
          <TabsTrigger value="chefs">Explore Chefs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recipes">
          <RecipeResults
            recipes={recipes}
            isLoading={recipesLoading}
            error={recipesError}
            likes={likes}
            userRatings={userRatings}
            setLikes={setLikes}
            setUserRatings={setUserRatings}
            setRecipes={setRecipes}
            resetFilters={resetFilters}
            refetchRecipes={refetchRecipes}
          />
        </TabsContent>
        
        <TabsContent value="chefs">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">{searchQuery ? "Chef Search Results" : "Discover Chefs"}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{chefsWithCounts.length} chef{chefsWithCounts.length !== 1 ? 's' : ''} found</span>
              <button
                onClick={() => refreshChefData()}
                className="flex items-center gap-1 text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={chefsLoading || chefDataLoading}
              >
                {(chefsLoading || chefDataLoading) ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
              {user && (
                <button 
                  onClick={() => showCurrentUserDebugInfo()} 
                  className="flex items-center gap-1 text-sm px-3 py-1 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Debug</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Debug information panel */}
          {userDebugInfo && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm whitespace-pre-line">
              <div className="flex justify-between">
                <h3 className="font-medium">User Debug Information</h3>
                <button 
                  onClick={() => setUserDebugInfo(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <pre className="mt-2 text-xs">{userDebugInfo}</pre>
            </div>
          )}
          
          {chefsLoading || chefDataLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div 
                  key={i}
                  className="rounded-lg bg-white p-6 shadow-md animate-pulse"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-gray-200 h-16 w-16 rounded-full"></div>
                    <div>
                      <div className="bg-gray-200 h-5 w-32 mb-2 rounded"></div>
                      <div className="bg-gray-200 h-4 w-24 rounded"></div>
                    </div>
                  </div>
                  <div className="bg-gray-200 h-4 w-full mb-2 rounded"></div>
                  <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
                </div>
              ))}
            </div>
          ) : chefsError || chefDataError ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-md">
              <h3 className="mb-2 text-xl font-semibold text-red-600">
                Error Loading Chefs
              </h3>
              <p className="mb-6 text-gray-600">
                {chefsError || chefDataError}
              </p>
              <button 
                onClick={() => refreshChefData()} 
                className="px-4 py-2 bg-sage text-white rounded-md hover:bg-sage/90 focus:outline-none focus:ring-2 focus:ring-sage/50"
              >
                Try Again
              </button>
            </div>
          ) : filteredChefs.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-md">
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                No chefs found
              </h3>
              <p className="mb-6 text-gray-600">
                {searchQuery 
                  ? "No chefs match your search criteria. Try a different search term." 
                  : "There are no chefs with recipes yet. Only users who have created at least one recipe are shown here."}
              </p>
              <div className="flex gap-3 justify-center">
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Clear Search
                  </button>
                )}
                <button
                  onClick={() => navigate("/recipes/new")}
                  className="px-4 py-2 bg-sage text-white rounded-md hover:bg-sage/90 focus:outline-none focus:ring-2 focus:ring-sage/50"
                >
                  Create Recipe
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-500 italic">
                Showing users who have published at least one recipe
              </div>
              <ChefGrid 
                chefs={filteredChefs} 
                title={searchQuery ? "Matching Chefs" : "All Chefs"} 
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Explore;

import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Profile } from "@/types/profile";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import useChefSearch from "@/hooks/useChefSearch";
import useChefData from "@/hooks/useChefData";
import ChefSearchDropdown from "@/components/chef/ChefSearchDropdown";
import ChefFilter from "@/components/chef/ChefFilter";
import FeaturedChefs from "@/components/chef/FeaturedChefs";
import ChefGrid from "@/components/chef/ChefGrid";
import ChefCardSkeleton from "@/components/chef/ChefCardSkeleton";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

export const ChefDirectory = () => {
  const [sortBy, setSortBy] = useState<"newest" | "recipe_count" | "alphabetical">("recipe_count");
  
  // Use our reusable chef search hook
  const { 
    searchQuery, 
    setSearchQuery,
    results: searchResults,
    isLoading: searchLoading,
    error: searchError 
  } = useChefSearch();

  // Memoize the query function to prevent it from changing on every render
  const fetchChefs = useMemo(() => {
    return () => {
      return supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
    };
  }, []);

  // Fetch all chefs for initial display and featured chefs
  const { data: allChefs = [], isLoading: fetchLoading, error: fetchError, refetch } = useSupabaseQuery<Profile[]>(fetchChefs);

  // Process chefs data with recipe counts and get featured chefs
  const { 
    chefsWithCounts, 
    featuredChefs, 
    getSortedChefs,
    isLoading: countsLoading,
    error: countsError
  } = useChefData(allChefs);

  // Apply sorting to all chefs or search results
  const sortedChefs = getSortedChefs(
    searchQuery ? searchResults : chefsWithCounts,
    sortBy
  );

  // Determine if there's an error from any source
  const hasError = searchError || fetchError || countsError;
  const errorMessage = searchError || 
    (fetchError ? fetchError.message : null) || 
    countsError || 
    "An error occurred while loading chefs.";

  // Combined loading state
  const isLoading = fetchLoading || (!searchQuery && countsLoading);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="container mx-auto px-4 pt-24">
          <h1 className="mb-8 text-4xl font-bold text-gray-900">Meet the Chefs</h1>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array(6).fill(0).map((_, i) => (
              <ChefCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Handle error state
  if (hasError && !searchQuery) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="container mx-auto px-4 pt-24">
          <h1 className="mb-8 text-4xl font-bold text-gray-900">Meet the Chefs</h1>
          <div className="rounded-lg bg-white p-8 text-center shadow-md">
            <h3 className="mb-2 text-xl font-semibold text-red-600">
              Error Loading Chefs
            </h3>
            <p className="mb-6 text-gray-600">
              {errorMessage}
            </p>
            <Button 
              onClick={() => refetch()} 
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="container mx-auto px-4 py-24">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold text-gray-900">Meet the Chefs</h1>
          
          {/* Chef Search Dropdown */}
          <ChefSearchDropdown
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            isLoading={searchLoading}
          />
        </div>

        {/* Featured Chefs */}
        {!searchQuery && featuredChefs.length > 0 && (
          <FeaturedChefs featuredChefs={featuredChefs} />
        )}

        {/* Filters */}
        <ChefFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {/* Search error state */}
        {searchError && searchQuery && (
          <div className="rounded-lg bg-white p-8 text-center shadow-md mb-6">
            <h3 className="mb-2 text-xl font-semibold text-red-600">
              Search Error
            </h3>
            <p className="mb-6 text-gray-600">
              {searchError}
            </p>
            <Button 
              onClick={() => setSearchQuery("")} 
              className="flex items-center gap-2"
            >
              Clear Search
            </Button>
          </div>
        )}

        {/* All Chefs */}
        <ChefGrid
          chefs={sortedChefs}
          title={searchQuery ? "Search Results" : "All Chefs"}
        />

        {/* No results state */}
        {sortedChefs.length === 0 && !isLoading && !hasError && (
          <div className="rounded-lg bg-white p-8 text-center shadow-md mt-6">
            <h3 className="mb-2 text-xl font-semibold text-gray-900">
              {searchQuery ? "No matching chefs found" : "No chefs found"}
            </h3>
            <p className="mb-6 text-gray-600">
              {searchQuery 
                ? "Try a different search term or check out all our chefs." 
                : "Be the first to join our community of chefs!"}
            </p>
            {searchQuery && (
              <Button 
                onClick={() => setSearchQuery("")} 
                className="flex items-center gap-2"
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChefDirectory;

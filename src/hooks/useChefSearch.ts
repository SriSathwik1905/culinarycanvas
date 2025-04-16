
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";

export const useChefSearch = (initialQuery: string = "") => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchChefs = async () => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const query = searchQuery.toLowerCase().trim();
        
        // Search by username or bio containing the query string
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.%${query}%,bio.ilike.%${query}%`)
          .order("username");
          
        if (error) throw error;
        
        setResults(data || []);
      } catch (err) {
        console.error("Error searching chefs:", err);
        setError("Failed to search chefs");
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      searchChefs();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    results,
    isLoading,
    error
  };
};

export default useChefSearch;

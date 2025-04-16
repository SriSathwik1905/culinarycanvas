import { useState, useEffect, useCallback, useRef } from 'react';
import { PostgrestError, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

// Constants
const QUERY_TIMEOUT_MS = 15000; // 15 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// Helper function to implement retry logic
const withRetry = async <T,>(
  operation: () => Promise<T>, 
  maxAttempts: number = MAX_RETRY_ATTEMPTS, 
  description: string = "database query",
  delay: number = RETRY_DELAY_MS
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.debug(`Attempt ${attempt}/${maxAttempts} for ${description}`);
      return await operation();
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt}/${maxAttempts} failed for ${description}:`, err);
      
      if (attempt < maxAttempts) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 300;
        const backoffDelay = delay * Math.pow(1.5, attempt - 1) + jitter;
        console.debug(`Retrying in ${Math.round(backoffDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
};

// Create a timeout promise
const createTimeout = (ms: number, message: string) => new Promise((_, reject) => {
  setTimeout(() => reject(new Error(message)), ms);
});

export const useSupabaseQuery = <T>(query: () => PostgrestFilterBuilder<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const queryFnRef = useRef(query);
  const isFetchingRef = useRef(false);
  
  const execute = useCallback(async () => {
    // Prevent multiple concurrent fetches
    if (isFetchingRef.current) {
      console.warn("Skipping fetch - another request is in progress");
      return;
    }
    
    try {
      setIsLoading(true);
      isFetchingRef.current = true;
      
      // Set up timeout for long-running queries
      const timeoutId = setTimeout(() => {
        if (data) {
          console.warn("Query fetch taking too long, using cached data");
        }
      }, 5000);
      
      // Run query with retry logic and timeout
      const response = await withRetry(
        async () => {
          const queryPromise = queryFnRef.current();
          return await Promise.race([
            queryPromise,
            createTimeout(QUERY_TIMEOUT_MS, "Query timeout exceeded")
          ]);
        }, 
        MAX_RETRY_ATTEMPTS,
        "Supabase query"
      );
      
      // Clear timeout since query completed
      clearTimeout(timeoutId);
      
      if (response.error) {
        setError(response.error);
        return;
      }
      
      setData(response.data as T);
      setError(null);
    } catch (err) {
      console.error('Error in Supabase query:', err);
      setError(err as PostgrestError);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [data]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, error, isLoading, refetch: execute };
}

export function useSupabaseMutation<T, TVariables>(
  mutationFn: (vars: TVariables) => Promise<PostgrestSingleResponse<T>>
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (variables: TVariables) => {
    try {
      setIsLoading(true);
      
      // Run mutation with retry logic and timeout
      const response = await withRetry(
        async () => {
          const mutationPromise = mutationFn(variables);
          return await Promise.race([
            mutationPromise,
            createTimeout(QUERY_TIMEOUT_MS, "Mutation timeout exceeded")
          ]);
        },
        2, // Fewer retries for mutations to avoid duplicate operations
        "Supabase mutation"
      );
      
      if (response.error) {
        setError(response.error);
        return { data: null, error: response.error };
      }
      
      setData(response.data);
      return { data: response.data, error: null };
    } catch (err) {
      console.error('Error in Supabase mutation:', err);
      const error = err as PostgrestError;
      setError(error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, data, error, isLoading };
}

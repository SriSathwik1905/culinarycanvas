import { useState, useEffect, useCallback, useRef } from 'react';
import { PostgrestError, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

export const useSupabaseQuery = <T>(query: () => PostgrestFilterBuilder<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const queryFnRef = useRef(query);
  
  const execute = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await queryFnRef.current();
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
    }
  }, []);

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
      const response = await mutationFn(variables);
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

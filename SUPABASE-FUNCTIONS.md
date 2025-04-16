# Adding Required Database Functions to Supabase

This document explains how to add the necessary database functions to your Supabase project.

## Required Function: `get_chefs_with_recipe_counts`

The application relies on a PostgreSQL function called `get_chefs_with_recipe_counts()` which efficiently retrieves chef profiles along with their recipe counts. This function needs to be added to your Supabase database.

### Steps to Add the Function

1. Login to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to SQL Editor
4. Create a new query
5. Paste the following SQL code:

```sql
-- Function to get chefs with their recipe counts efficiently
CREATE OR REPLACE FUNCTION get_chefs_with_recipe_counts()
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  recipe_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    COUNT(r.id) AS recipe_count
  FROM 
    profiles p
  INNER JOIN
    recipes r ON p.id = r.user_id
  GROUP BY 
    p.id
  ORDER BY 
    recipe_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the purpose of this function
COMMENT ON FUNCTION get_chefs_with_recipe_counts() IS 'Gets all chefs who have at least one recipe, with their recipe counts';
```

6. Click "Run" to execute the SQL and create the function
7. Verify the function was created successfully by running:

```sql
SELECT * FROM get_chefs_with_recipe_counts();
```

## Temporary Workaround

If you're unable to add the function to your Supabase database immediately, the application has been temporarily modified to skip using the RPC function and directly query the database instead. This should prevent the infinite reloading issue on the Chefs page.

The long-term solution is to add the function to your database as described above. 
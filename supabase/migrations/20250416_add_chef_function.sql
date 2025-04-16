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
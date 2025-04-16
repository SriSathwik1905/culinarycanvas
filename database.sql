-- SQL script for creating necessary functions to improve performance
-- in the Culinary Canvas application

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

-- Function to perform full-text search on recipes
CREATE OR REPLACE FUNCTION search_recipes(search_term text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  user_id uuid,
  cuisine text,
  difficulty text,
  cook_time_minutes integer,
  prep_time_minutes integer,
  servings integer,
  image_url text,
  created_at timestamp with time zone,
  average_rating real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.user_id,
    r.cuisine,
    r.difficulty,
    r.cook_time_minutes,
    r.prep_time_minutes,
    r.servings,
    r.image_url,
    r.created_at,
    r.average_rating
  FROM 
    recipes r
  WHERE
    to_tsvector('english', 
      COALESCE(r.title, '') || ' ' || 
      COALESCE(r.description, '') || ' ' || 
      COALESCE(r.instructions, '')
    ) @@ to_tsquery('english', search_term)
  ORDER BY
    r.average_rating DESC NULLS LAST,
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search recipes by ingredients
CREATE OR REPLACE FUNCTION search_recipes_by_ingredients(ingredient_list text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  user_id uuid,
  cuisine text,
  difficulty text,
  cook_time_minutes integer,
  prep_time_minutes integer,
  servings integer,
  image_url text,
  created_at timestamp with time zone,
  average_rating real,
  match_count bigint
) AS $$
DECLARE
  ingredients text[];
BEGIN
  -- Convert comma-separated string to array
  ingredients := string_to_array(ingredient_list, ',');
  
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.user_id,
    r.cuisine,
    r.difficulty,
    r.cook_time_minutes,
    r.prep_time_minutes,
    r.servings,
    r.image_url,
    r.created_at,
    r.average_rating,
    COUNT(*) AS match_count
  FROM 
    recipes r,
    unnest(ingredients) ingredient
  WHERE
    r.ingredients ILIKE '%' || ingredient || '%'
  GROUP BY
    r.id
  ORDER BY
    match_count DESC,
    r.average_rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get the follower count for a chef
CREATE OR REPLACE FUNCTION get_follower_count(chef_id uuid)
RETURNS bigint AS $$
DECLARE
  count_followers bigint;
BEGIN
  SELECT COUNT(*) INTO count_followers
  FROM follows
  WHERE following_id = chef_id;
  
  RETURN count_followers;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance

-- Index for text search on recipes
CREATE INDEX IF NOT EXISTS idx_recipes_text_search 
ON recipes USING GIN (to_tsvector('english', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(instructions, '')
));

-- Index for user_id on recipes for faster chef listing
CREATE INDEX IF NOT EXISTS idx_recipes_user_id 
ON recipes(user_id);

-- Indexes for recipe tags
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id 
ON recipe_tags(recipe_id);

CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id 
ON recipe_tags(tag_id);

-- Index for follows table
CREATE INDEX IF NOT EXISTS idx_follows_following_id 
ON follows(following_id);

-- Add comment to document the purpose of this file
COMMENT ON FUNCTION get_chefs_with_recipe_counts() IS 'Gets all chefs who have at least one recipe, with their recipe counts';
COMMENT ON FUNCTION search_recipes(text) IS 'Full-text search across recipe titles, descriptions, and instructions';
COMMENT ON FUNCTION search_recipes_by_ingredients(text) IS 'Search for recipes containing specified ingredients';
COMMENT ON FUNCTION get_follower_count(uuid) IS 'Count followers for a given chef'; 
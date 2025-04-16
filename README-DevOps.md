# Culinary Canvas - DevOps Guide

This document provides instructions for database setup, performance optimizations, and deployment strategies for the Culinary Canvas application.

## Database Setup

### Supabase Setup

1. Create a Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. Get your Supabase URL and anon key from the API settings
3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the database setup script:

```bash
# Navigate to your project folder
cd culinarycanvas

# Run the SQL script (using Supabase CLI)
supabase db reset

# Or manually copy and execute the SQL from database.sql in the Supabase SQL Editor
```

### Database Schema Overview

The application uses the following main tables:
- `profiles` - User profile information
- `recipes` - Recipe details
- `recipe_tags` - Many-to-many relationship between recipes and tags
- `tags` - Recipe tags/categories
- `likes` - User likes on recipes
- `follows` - User follows relationships
- `ratings` - User ratings on recipes

## Performance Optimizations

### Database Optimizations

The following SQL functions have been implemented to improve performance:

1. **get_chefs_with_recipe_counts()** - Efficiently retrieves chefs with their recipe counts in a single query:

```sql
SELECT * FROM get_chefs_with_recipe_counts();
```

2. **search_recipes(search_term)** - Full-text search across recipe title, description, and instructions:

```sql
SELECT * FROM search_recipes('pasta garlic');
```

3. **search_recipes_by_ingredients(ingredient_list)** - Find recipes matching specified ingredients:

```sql
SELECT * FROM search_recipes_by_ingredients('chicken,garlic,olive oil');
```

Database indexes have been created for these common operations to improve query performance.

### Frontend Optimizations

1. **Request Caching**

   The `useRecipesData` hook implements caching to prevent duplicate API calls:

   ```jsx
   const cacheKey = JSON.stringify({
     searchQuery,
     sortBy,
     filterCuisine,
     filterDifficulty,
     maxCookTime,
     ingredients,
     selectedTags
   });
   
   if (cache.current[cacheKey]) {
     return cache.current[cacheKey];
   }
   ```

2. **Debouncing**

   User inputs like search queries are debounced to prevent excessive API calls:

   ```jsx
   useEffect(() => {
     const handler = setTimeout(() => {
       setDebouncedSearchQuery(searchQuery);
     }, 500);
     
     return () => {
       clearTimeout(handler);
     };
   }, [searchQuery]);
   ```

3. **Pagination & Limiting Results**

   Data fetching is optimized by limiting initial loads and implementing pagination:

   ```jsx
   const { data, count } = await supabase
     .from('recipes')
     .select('*', { count: 'exact' })
     .limit(20)
     .range(page * 20, (page + 1) * 20 - 1);
   ```

4. **Minimizing Re-renders**

   Components are optimized to prevent unnecessary re-renders:
   - Using `React.memo` for pure components
   - Using `useMemo` and `useCallback` for expensive calculations
   - Implementing `shouldComponentUpdate` or `React.PureComponent` for class components

## Monitoring and Profiling

### Supabase Monitoring

1. Enable Database Insights in Supabase Dashboard
2. Monitor query performance in the "SQL" section of your Supabase project
3. Check for slow queries and optimize them

### React Performance Profiling

1. Use React Developer Tools Profiler to identify components that render too often
2. Install React DevTools:

```bash
npm install -g react-devtools
```

3. Run the profiler:

```bash
react-devtools
```

### Performance Testing

Run Lighthouse audits to measure performance:

```bash
npm install -g lighthouse
lighthouse https://your-deployed-app.com --view
```

## Common Issues and Solutions

### Rate Limiting

If you encounter rate limiting issues with Supabase:

1. Implement more aggressive caching
2. Reduce the frequency of API calls
3. Consider upgrading your Supabase plan

### Missing Chef Data

If chef data is not appearing:

```sql
-- Check if chef profiles exist
SELECT * FROM profiles WHERE id = 'chef-uuid';

-- Check if chef has recipes
SELECT COUNT(*) FROM recipes WHERE user_id = 'chef-uuid';
```

### Authentication Issues

If users can't log in or their sessions aren't persisting:

1. Check Supabase authentication logs
2. Verify browser storage settings (localStorage/cookies)
3. Check network requests for authentication errors

## Deployment

### Environment Setup

1. Create production environment variables:

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-supabase-anon-key
```

2. Build for production:

```bash
npm run build
```

### Deployment Options

#### Vercel

1. Connect your GitHub repository to Vercel
2. Configure environment variables in the Vercel dashboard
3. Deploy with:

```bash
npm install -g vercel
vercel --prod
```

#### Netlify

1. Connect your GitHub repository to Netlify
2. Configure environment variables in the Netlify dashboard
3. Deploy with:

```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### AWS S3 + CloudFront

1. Build the app: `npm run build`
2. Deploy to S3:

```bash
aws s3 sync build/ s3://your-bucket-name
```

3. Configure CloudFront for distribution

## CI/CD Pipeline

Here's a sample GitHub Actions workflow:

```yaml
name: Deploy Culinary Canvas

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [React Performance Optimization](https://reactjs.org/docs/optimizing-performance.html)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Netlify Deployment Documentation](https://docs.netlify.com)

## Contact

For DevOps issues, contact the maintainer at [your-email@example.com] 
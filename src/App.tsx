import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import Index from '@/pages/Index';
import ProfilePage from '@/pages/Profile'; // Renamed import to avoid collision
import Recipe from '@/pages/Recipe';
import Explore from '@/pages/Explore';
import NewRecipe from '@/pages/NewRecipe';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/sonner';
import ChefProfile from '@/pages/ChefProfile';
import ChefDirectory from '@/pages/ChefDirectory';
import AuthGuard from '@/components/AuthGuard';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';

// Routes that should redirect to auth when not logged in
const PROTECTED_ROUTES = [
  '/profile',
  '/recipes/new'
];

// Routes that should NOT redirect to auth when already logged in
const AUTH_ROUTES = [
  '/auth',
  '/auth/callback'
];

// Global loading component
const GlobalLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <div className="flex flex-col items-center">
      <div className="text-xl text-gray-800 mb-2">Loading Culinary Canvas...</div>
      <div className="text-sm text-gray-500">Preparing your experience</div>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user, isLoading, isInitialized, refreshAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [appReady, setAppReady] = useState(false);
  
  // Handle initial app loading state
  useEffect(() => {
    // If auth is initialized (regardless of result), app is ready
    if (isInitialized) {
      setAppReady(true);
    } else if (isLoading && !isInitialized) {
      // If still initializing after 5 seconds, force app ready anyway
      const timeoutId = setTimeout(() => {
        console.warn("App loading timeout - forcing ready state");
        setAppReady(true);
        refreshAuth().catch(err => {
          console.error("Error refreshing auth:", err);
        });
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isInitialized, isLoading, refreshAuth]);
  
  // Handle redirection based on authentication state
  useEffect(() => {
    // Only process redirects once app is ready and not loading
    if (!appReady || isLoading) return;
    
    const currentPath = location.pathname;
    console.log("App route check:", { 
      currentPath, 
      isAuthenticated: !!user,
      isProtected: PROTECTED_ROUTES.some(route => currentPath.startsWith(route)),
      isAuthRoute: AUTH_ROUTES.some(route => currentPath === route)
    });
    
    // If user is on auth page but already logged in, redirect away
    if (user && AUTH_ROUTES.some(route => currentPath === route)) {
      const from = new URLSearchParams(location.search).get('from') || '/';
      console.log("User already logged in, redirecting from auth page to:", from);
      navigate(from, { replace: true });
    }
  }, [user, appReady, isLoading, location, navigate]);

  // Show global loading state while app initializes
  if (!appReady) {
    return <GlobalLoading />;
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/recipes/:id" element={<Recipe />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/chefs" element={<ChefDirectory />} />
        <Route path="/chefs/:id" element={<ChefProfile />} />
        
        {/* Protected routes */}
        <Route 
          path="/profile" 
          element={
            <AuthGuard>
              <ProfilePage />
            </AuthGuard>
          } 
        />
        <Route 
          path="/recipes/new" 
          element={
            <AuthGuard>
              <NewRecipe />
            </AuthGuard>
          } 
        />
        
        {/* Redirects and error pages */}
        <Route path="/tags" element={<Navigate to="/explore" replace />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;

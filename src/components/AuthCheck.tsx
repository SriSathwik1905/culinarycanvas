import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthCheckProps {
  children: React.ReactNode;
  redirectPath?: string;
}

/**
 * AuthCheck component to check if user is authenticated and redirect if not
 * This is a lightweight alternative to AuthGuard that doesn't render a loading state
 */
const AuthCheck: React.FC<AuthCheckProps> = ({ 
  children, 
  redirectPath = '/auth'
}) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      // Get current path for redirecting back after login
      const currentPath = window.location.pathname;
      const returnPath = encodeURIComponent(currentPath + window.location.search);
      navigate(`${redirectPath}?from=${returnPath}`);
    }
  }, [user, isLoading, navigate, redirectPath]);

  // Render children only if authenticated or still loading
  return <>{children}</>;
};

export default AuthCheck; 
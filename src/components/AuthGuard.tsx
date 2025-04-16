import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
}

/**
 * AuthGuard component to protect routes that require authentication
 * Use this to wrap components that should only be accessible to logged-in users
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallbackPath = '/auth',
  loadingComponent = null
}) => {
  const { user, isLoading, isInitialized, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [guardState, setGuardState] = useState<'checking' | 'authenticated' | 'unauthorized' | 'network_error'>('checking');
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  const [authChecks, setAuthChecks] = useState(0);
  const [stuckTimer, setStuckTimer] = useState<number | null>(null);
  const loadingStartTime = useRef(Date.now());
  const recoveryAttempted = useRef(false);
  const networkErrorDetected = useRef(false);
  
  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      networkErrorDetected.current = false;
      if (guardState === 'network_error') {
        setGuardState('checking');
        refreshAuth();
      }
    };
    
    const handleOffline = () => {
      console.warn('🔌 Network connection lost');
      networkErrorDetected.current = true;
      // Only set network error if we were checking - don't interrupt authenticated state
      if (guardState === 'checking') {
        setGuardState('network_error');
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [guardState, refreshAuth]);
  
  // Detect and prevent redirect loops
  useEffect(() => {
    if (redirectAttempts > 3) {
      console.error('🚨 AuthGuard detected multiple redirect attempts', { 
        path: location.pathname, 
        attempts: redirectAttempts 
      });
      
      // Force a full refresh to break potential loop
      if (redirectAttempts > 5) {
        console.warn('🔄 AuthGuard forcing page reload to break loop');
        window.location.href = fallbackPath;
        return;
      }
    }
  }, [redirectAttempts, fallbackPath, location.pathname]);

  // Recovery mechanism for hard timeouts in auth
  useEffect(() => {
    const loadingTime = Date.now() - loadingStartTime.current;
    
    // If we're still checking after 12 seconds and haven't tried recovery yet
    if (guardState === 'checking' && loadingTime > 12000 && !recoveryAttempted.current) {
      console.warn('⚠️ AuthGuard detected potential deadlock, attempting recovery');
      recoveryAttempted.current = true;
      
      // Force a refresh of auth state
      refreshAuth();
      
      // Set a last resort timer - after 5 more seconds, check if we have a cached user
      const lastResortTimer = window.setTimeout(() => {
        // If auth is still not ready, try to use localStorage directly in emergency
        try {
          const storedUser = localStorage.getItem('auth_user');
          
          if (storedUser) {
            console.warn('🔑 AuthGuard using cached user data as emergency fallback');
            setGuardState('authenticated');
          } else {
            console.error('🚨 AuthGuard recovery failed, forcing redirect to login');
            setGuardState('unauthorized');
            navigate(fallbackPath, { replace: true });
          }
        } catch (err) {
          console.error('🚨 AuthGuard emergency recovery failed', err);
          setGuardState('unauthorized');
          navigate(fallbackPath, { replace: true });
        }
      }, 5000);
      
      return () => clearTimeout(lastResortTimer);
    }
  }, [guardState, refreshAuth, navigate, fallbackPath]);

  // Set a hard timeout to break out of perpetual loading state
  useEffect(() => {
    // Clear any existing timer when component state changes
    if (stuckTimer) {
      clearTimeout(stuckTimer);
    }
    
    // Only set timeout if we're loading or checking
    if (isLoading || guardState === 'checking') {
      // Force a decision after 8 seconds to prevent endless loading
      const timer = window.setTimeout(() => {
        console.warn('⚠️ AuthGuard detected stuck loading state, forcing decision');
        
        // If we have a user, force authenticate even if other flags are inconsistent
        if (user) {
          console.log('✅ AuthGuard: User exists despite loading state, allowing access');
          setGuardState('authenticated');
        } else if (isInitialized) {
          // If auth is initialized but no user, redirect to login
          console.log('❌ AuthGuard: No user after timeout, redirecting');
          setGuardState('unauthorized');
        } else if (networkErrorDetected.current) {
          // If network issues detected, show specific error state
          console.warn('🔌 AuthGuard: Network issues detected');
          setGuardState('network_error');
        } else {
          // Auth is not initialized - try one refresh
          console.warn('🔄 AuthGuard: Auth not initialized after timeout, trying refresh');
          refreshAuth();
          setAuthChecks(prev => prev + 1);
        }
      }, 8000); // 8 second timeout
      
      setStuckTimer(timer);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, guardState, isInitialized, user, refreshAuth]);

  // If auth has been stuck in loading state too long, try refresh
  useEffect(() => {
    let timeoutId: number;
    
    if (isLoading && authChecks === 0) {
      // Set a safety timeout for loading state
      timeoutId = window.setTimeout(() => {
        console.warn('⏰ AuthGuard loading timeout, trying refresh');
        refreshAuth();
        setAuthChecks(prev => prev + 1);
      }, 4000); // 4 second timeout
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, authChecks, refreshAuth]);

  // Main auth check effect
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔐 AuthGuard checking auth state:', {
        isInitialized,
        isLoading, 
        hasUser: !!user,
        path: location.pathname,
        guardState,
        checks: authChecks,
        loadingTime: `${(Date.now() - loadingStartTime.current) / 1000}s`,
        networkIssues: networkErrorDetected.current
      });
      
      // If we detected network issues, show special state
      if (networkErrorDetected.current && guardState === 'checking') {
        console.warn('🔌 AuthGuard: Network connectivity issues detected');
        setGuardState('network_error');
        return;
      }
      
      // If auth hasn't initialized for too long but we have a user, 
      // assume it's a partial state and allow access
      if (!isInitialized && user && (authChecks > 0 || Date.now() - loadingStartTime.current > 7000)) {
        console.warn('⚠️ AuthGuard: Auth not initialized but user exists, allowing access');
        setGuardState('authenticated');
        return;
      }
      
      // First wait for auth to initialize
      if (!isInitialized && !user) {
        setGuardState('checking');
        return;
      }
      
      // Auth is initialized, make decision
      if (user) {
        console.log('✅ AuthGuard: User authenticated, allowing access');
        setGuardState('authenticated');
        setRedirectAttempts(0);
        recoveryAttempted.current = false; // Reset recovery flag on success
      } else {
        console.log('❌ AuthGuard: User not authenticated, redirecting');
        setGuardState('unauthorized');
        
        // Create a safe, encoded return path
        const returnPath = encodeURIComponent(location.pathname + location.search);
        const redirectUrl = `${fallbackPath}?from=${returnPath}`;
        
        // Track redirect attempts
        setRedirectAttempts(prev => prev + 1);
        
        // Don't redirect if we're already in a loop
        if (redirectAttempts <= 3) {
          navigate(redirectUrl, { replace: true });
        }
      }
    };
    
    checkAuth();
  }, [user, isLoading, isInitialized, navigate, fallbackPath, location, guardState, redirectAttempts, authChecks]);

  // Network error state
  if (guardState === 'network_error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-2xl text-red-600 mb-4">Network Connection Issue</div>
          <div className="text-gray-600 mb-6 text-center">
            We're having trouble connecting to the server. This could be due to:
            <ul className="list-disc mt-2 ml-6 text-left">
              <li>Your internet connection</li>
              <li>Our servers being temporarily unavailable</li>
              <li>Network restrictions blocking access</li>
            </ul>
          </div>
          <div className="space-y-4 w-full">
            <button 
              onClick={() => {
                setGuardState('checking');
                refreshAuth();
                setAuthChecks(0);
                loadingStartTime.current = Date.now();
              }}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                navigate(fallbackPath, { replace: true });
              }}
              className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition duration-200"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state - show custom loading component or default
  if (guardState === 'checking' || (isLoading && !user)) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center">
          <div className="text-lg text-gray-600 mb-2">Verifying your session...</div>
          {authChecks > 0 && (
            <div className="text-sm text-amber-600">
              This is taking longer than expected.
            </div>
          )}
          {recoveryAttempted.current && (
            <div className="text-sm text-red-600 mt-2">
              Attempting to recover from timeout...
            </div>
          )}
        </div>
      </div>
    );
  }

  // If authenticated, render children, otherwise null (redirect should happen)
  // Also break any detected redirect loops by showing content anyway
  return (guardState === 'authenticated' || redirectAttempts > 3) ? (
    <>{children}</>
  ) : null;
};

export default AuthGuard; 
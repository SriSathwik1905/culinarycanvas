import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

// Constants
const AUTH_STORAGE_KEY = "auth_user";
const AUTH_SESSION_KEY = "auth_session";
const AUTH_STATE_VERSION = "v1"; // Increment when changing auth structure
const AUTH_DEBUG = true; // Set to false in production
const AUTH_TIMEOUT_MS = 30000; // Increased to 30 seconds (from 10 seconds)
const PROFILE_QUERY_TIMEOUT_MS = 10000; // Increased to 10 seconds (from 3 seconds)
const MAX_RETRY_ATTEMPTS = 3; // Maximum number of retries for queries

// Logging utilities for auth debugging
const authLog = {
  info: (...args: any[]) => AUTH_DEBUG && console.log("🔑 AUTH:", ...args),
  warn: (...args: any[]) => AUTH_DEBUG && console.warn("⚠️ AUTH:", ...args),
  error: (...args: any[]) => console.error("❌ AUTH ERROR:", ...args),
  debug: (...args: any[]) => AUTH_DEBUG && console.debug("🔍 AUTH DEBUG:", ...args),
  stateChange: (state: any) => AUTH_DEBUG && console.log("🔄 AUTH STATE:", state)
};

interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  lastInitialized: number; // Timestamp for tracking init/refresh
  version: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<{ user?: User; error?: string }>;
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<{ user?: User; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isInitialized: boolean;
  refreshAuth: () => Promise<void>;
  getSessionToken: () => string | null;
}

// Default auth state
const defaultAuthState: AuthState = {
  user: null,
  session: null,
  initialized: false,
  lastInitialized: 0,
  version: AUTH_STATE_VERSION
};

// Initialize context with undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely store auth state
const storeAuthState = (state: AuthState) => {
  try {
    // Store in localStorage for persistence
    if (state.user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    
    // Store session separately (we don't need full session in localStorage)
    if (state.session) {
      // Just store token info, not the full session
      const sessionData = {
        access_token: state.session.access_token,
        refresh_token: state.session.refresh_token,
        expires_at: state.session.expires_at
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    
    authLog.debug("State stored in localStorage", { 
      hasUser: !!state.user, 
      hasSession: !!state.session,
      initialized: state.initialized 
    });
  } catch (err) {
    authLog.error("Failed to store auth state", err);
  }
};

// Helper for creating a timeout promise
const createTimeout = (ms: number, message: string) => new Promise((_, reject) => {
  setTimeout(() => reject(new Error(message)), ms);
});

// Helper function to implement retry logic
const withRetry = async <T,>(
  operation: () => Promise<T>, 
  maxAttempts: number = MAX_RETRY_ATTEMPTS, 
  description: string = "operation",
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      authLog.debug(`Attempt ${attempt}/${maxAttempts} for ${description}`);
      return await operation();
    } catch (err) {
      lastError = err;
      authLog.warn(`Attempt ${attempt}/${maxAttempts} failed for ${description}:`, err);
      
      if (attempt < maxAttempts) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 300;
        const backoffDelay = delay * Math.pow(1.5, attempt - 1) + jitter;
        authLog.debug(`Retrying in ${Math.round(backoffDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Auth state with initialization status
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs to track initialization and prevent duplicate work
  const authInitialized = useRef(false);
  const authInitializing = useRef(false);
  const sessionListenerSet = useRef(false);
  const sessionChangeCount = useRef(0);
  
  // Destructure for easier access
  const { user, session, initialized } = authState;

  // Update state and persist it
  const updateAuthState = useCallback((newState: Partial<AuthState>) => {
    setAuthState(prev => {
      const updatedState = { ...prev, ...newState, lastInitialized: Date.now() };
      
      // Selectively log state changes
      if (prev.user?.id !== updatedState.user?.id) {
        authLog.stateChange({
          action: !prev.user && updatedState.user ? "LOGIN" : 
                 prev.user && !updatedState.user ? "LOGOUT" : "UPDATE",
          user: updatedState.user ? 
                `${updatedState.user.username} (${updatedState.user.id})` : 
                "none",
          initialized: updatedState.initialized,
          timestamp: new Date().toISOString()
        });
      }
      
      // Don't persist during initialization to avoid race conditions
      if (updatedState.initialized) {
        storeAuthState(updatedState);
      }
      
      return updatedState;
    });
  }, []);

  // Create a session-only user if profile operations fail
  const createSessionOnlyUser = useCallback((session: Session): User => {
    const userId = session.user.id;
    const email = session.user.email;
    const username = email ? 
      email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') : 
      `user_${Math.floor(Math.random() * 10000)}`;
    
    authLog.warn("Creating SESSION-ONLY user (no profile DB access)", { userId, username });
    
    return {
      id: userId,
      username,
      email,
      first_name: undefined,
      last_name: undefined
    };
  }, []);

  // Get profile data for a Supabase user
  const getProfileForUser = useCallback(async (userId: string) => {
    try {
      // Try to get profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Row not found
          authLog.warn("No profile found for user", userId);
          return null;
        }
        throw error;
      }
      
      return profile;
    } catch (err) {
      authLog.error("Error getting profile", err);
      return null;
    }
  }, []);

  // Create a basic profile if missing
  const createProfileIfMissing = useCallback(async (userId: string, email?: string | null) => {
    try {
      // Minimal required profile data
      const username = email ? email.split('@')[0] : `user_${Math.floor(Math.random() * 10000)}`;
      
      const minimalProfile = {
        id: userId,
        username,
        email: email || null
      };
      
      // Insert profile
      const { error } = await supabase
        .from('profiles')
        .insert(minimalProfile);
      
      if (error) {
        authLog.error("Failed to create profile", error);
        return null;
      }
      
      // Get the newly created profile
      return await getProfileForUser(userId);
    } catch (err) {
      authLog.error("Profile creation error", err);
      return null;
    }
  }, [getProfileForUser]);

  // Process a Supabase session into User
  const processSession = useCallback(async (newSession: Session | null): Promise<User | null> => {
    if (!newSession?.user) {
      authLog.info("No session or user in session");
      return null;
    }
    
    try {
      // Get the user data from Supabase Auth (always reliable)
      const userId = newSession.user.id;
      const userEmail = newSession.user.email;
      
      // Generate a fallback username
      const fallbackUsername = userEmail ? 
        userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') : 
        `user_${Math.floor(Math.random() * 10000)}`;
      
      authLog.info("Processing session for user", userId);
      
      // Try to get profile with retry and timeout protection
      let profile = null;
      try {
        profile = await withRetry(
          async () => {
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            
            return await Promise.race([
              profilePromise,
              createTimeout(PROFILE_QUERY_TIMEOUT_MS, "Profile query timed out")
            ]);
          },
          3, // 3 retries
          "profile query"
        );
        
        // Explicitly cast the result to expected type
        const result = profile as any;
        const data = result.data;
        const error = result.error;
        
        if (error) {
          if (error.code === 'PGRST116') { // Row not found
            authLog.warn("No profile found for user", userId);
          } else {
            throw error;
          }
        } else {
          profile = data;
        }
      } catch (err) {
        // Check if it's a network error
        if (err instanceof Error && (
          err.message.includes("Failed to fetch") || 
          err.message.includes("Network") ||
          err.message.includes("timed out")
        )) {
          authLog.warn("Network error querying profile, using fallback", err);
          
          // Create a fallback user immediately without further database operations
          return createSessionOnlyUser(newSession);
        }
        
        authLog.error("Error querying profile", err);
        // Continue with profile creation as fallback
      }
      
      // If no profile exists and we can connect to the database, try to create one
      if (!profile) {
        authLog.info("Creating missing profile for user", userId);
        
        // First check if we can access the database before attempting creation
        try {
          // Simple quick health check query with proper typing
          const healthCheck = await Promise.race([
            supabase.from('profiles').select('count').limit(1),
            createTimeout(2000, "Database health check timed out")
          ]) as any;
          
          // Check if healthCheck has an error properly
          if (healthCheck && healthCheck.error) {
            throw new Error("Database appears to be unreachable");
          }
          
          // If health check passes, try to create profile
          const basicProfile = {
            id: userId,
            username: fallbackUsername,
            email: userEmail || null
          };
          
          try {
            // Try to create the profile directly instead of using createProfileWithRetry
            const { data, error } = await supabase
              .from('profiles')
              .insert(basicProfile)
              .select()
              .single();
              
            if (error) {
              authLog.warn("Failed to create profile during session processing", error);
            } else if (data) {
              profile = data;
              authLog.info("Created profile during session processing");
            }
          } catch (profileErr) {
            authLog.error("Error creating profile during session processing", profileErr);
          }
        } catch (healthErr) {
          authLog.warn("Database connectivity issues, skipping profile creation", healthErr);
          // Fall through to use fallback user
        }
      }
      
      // At this point, if we still don't have a profile, use a minimal local-only user object
      if (!profile) {
        authLog.warn("Could not create profile in database, using local-only user data");
        
        // Return minimal user data based on session (won't have database persistence)
        return createSessionOnlyUser(newSession);
      }
      
      // Ensure username exists, fallback to email or ID
      const username = profile.username || fallbackUsername;
      
      // If username was generated but not in profile, try to update it (but don't block on this)
      if (!profile.username && username) {
        authLog.info("Updating missing username", username);
        try {
          // Don't await this - fire and forget to avoid blocking auth flow
          // Use IIFE to handle the Promise chain without breaking TypeScript
          (async () => {
            try {
              await supabase
                .from('profiles')
                .update({ username })
                .eq('id', profile.id);
              authLog.debug("Username updated successfully");
            } catch (updateErr) {
              authLog.warn("Failed to update username, but continuing", updateErr);
            }
          })();
        } catch (err) {
          authLog.warn("Failed to update username, but continuing", err);
        }
      }
      
      // Return formatted user
      return {
        id: profile.id,
        username,
        email: profile.email || newSession.user.email,
        first_name: profile.first_name,
        last_name: profile.last_name
      };
    } catch (err) {
      authLog.error("Error processing session", err);
      
      // Even in case of errors, try to return a minimal user if we have session data
      if (newSession?.user?.id) {
        const userId = newSession.user.id;
        const userEmail = newSession.user.email;
        const fallbackUsername = userEmail ? 
          userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') : 
          `user_${Math.floor(Math.random() * 10000)}`;
          
        return createSessionOnlyUser({
          user: { id: userId, email: userEmail || undefined },
          session: null
        });
      }
      
      return null;
    }
  }, [createSessionOnlyUser]);

  // Initialize auth with timeout protection
  const initAuth = useCallback(async () => {
    // Prevent duplicate initialization
    if (authInitializing.current) {
      authLog.warn("Auth initialization already in progress");
      return;
    }
    
    // Already initialized? Skip
    if (authInitialized.current && authState.initialized) {
      authLog.info("Auth already initialized, skipping");
      return;
    }
    
    authInitializing.current = true;
    setIsLoading(true);
    authLog.info("Initializing auth");
    
    // Track initiation time for timeout handling
    const initStartTime = Date.now();
    
    try {
      // Use a more resilient approach with multiple retries for session retrieval
      let sessionResult;
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      // Try up to maxRetries times with increasing timeouts
      while (retryCount < maxRetries) {
        try {
          const timeout = 3000 + (retryCount * 2000); // 3s, 5s, 7s
          authLog.info(`Auth session check attempt ${retryCount + 1}/${maxRetries} (timeout: ${timeout}ms)`);
          
          sessionResult = await Promise.race([
            supabase.auth.getSession(),
            createTimeout(timeout, `Auth session check timed out (attempt ${retryCount + 1})`)
          ]) as { data: { session: Session | null }, error: Error | null };
          
          // If successful, break out of retry loop
          break;
        } catch (err) {
          lastError = err;
          retryCount++;
          authLog.warn(`Auth session check attempt ${retryCount} failed:`, err);
          
          // If we've exhausted retries, try to recover from localStorage
          if (retryCount >= maxRetries) {
            authLog.warn("All auth session attempts failed, checking for cached session");
            
            // Try to recover from localStorage as last resort
            try {
              const storedSession = localStorage.getItem(AUTH_SESSION_KEY);
              const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
              
              if (storedSession && storedUser) {
                const parsedSession = JSON.parse(storedSession);
                const parsedUser = JSON.parse(storedUser);
                
                // Check if token is not severely expired (within last 7 days)
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                
                if (parsedSession.expires_at && parsedSession.expires_at * 1000 > sevenDaysAgo) {
                  authLog.warn("Using cached session as network fallback");
                  
                  // Create minimal session object
                  const recoverySession = {
                    access_token: parsedSession.access_token,
                    refresh_token: parsedSession.refresh_token || "",
                    expires_at: parsedSession.expires_at,
                    user: { id: parsedUser.id, email: parsedUser.email }
                  } as unknown as Session;
                  
                  // Set as successful result to allow continuation
                  sessionResult = { 
                    data: { session: recoverySession }, 
                    error: null 
                  };
                  break;
                }
              }
            } catch (recoveryErr) {
              authLog.error("Failed to recover from cached session:", recoveryErr);
            }
          }
        }
      }
      
      // If we still don't have session result after all retries
      if (!sessionResult) {
        throw new Error("Failed to get auth session after multiple attempts");
      }
      
      if (sessionResult.error) {
        throw sessionResult.error;
      }
      
      const { data: { session: newSession } } = sessionResult;
      
      // Process session and get user
      if (newSession) {
        authLog.info("Session found", {
          userId: newSession.user?.id,
          expires: new Date((newSession.expires_at || 0) * 1000).toISOString(),
          isRecovery: !newSession.expires_at
        });
        
        try {
          // Process session to get user with timeout protection
          let userData = null;
          
          try {
            const userDataPromise = processSession(newSession);
            userData = await Promise.race([
              userDataPromise,
              createTimeout(5000, "User profile fetch timed out")
            ]) as User | null;
          } catch (profileTimeoutErr) {
            authLog.warn("Profile fetch timed out:", profileTimeoutErr);
            // Continue with fallback mechanisms
          }
          
          if (userData) {
            authLog.info("User authenticated", userData.username);
            // Update state with session and user
            updateAuthState({
              session: newSession,
              user: userData,
              initialized: true
            });
          } else {
            // If profile operations failed but we have a valid session, 
            // create a session-only user as last resort
            authLog.warn("Could not get/create user profile - creating fallback user");
            
            const fallbackUser = createSessionOnlyUser(newSession);
            updateAuthState({
              session: newSession,
              user: fallbackUser,
              initialized: true
            });
          }
        } catch (err) {
          authLog.error("Error processing user during init", err);
          
          // Last resort fallback - if session exists but everything else fails
          if (newSession?.user?.id) {
            const emergencyUser = createSessionOnlyUser(newSession);
            updateAuthState({
              session: newSession,
              user: emergencyUser,
              initialized: true
            });
            authLog.warn("Using emergency fallback user after error");
          } else {
            updateAuthState({
              session: null,
              user: null,
              initialized: true
            });
          }
        }
      } else {
        authLog.info("No active session found");
        updateAuthState({
          session: null, 
          user: null,
          initialized: true
        });
      }
    } catch (err) {
      authLog.error("Auth initialization failed", err);
      
      // Still mark as initialized to avoid endless loading state
      updateAuthState({
        session: null,
        user: null,
        initialized: true
      });
    } finally {
      const duration = Date.now() - initStartTime;
      authLog.info(`Auth initialization completed in ${duration}ms`);
      setIsLoading(false);
      authInitializing.current = false;
      authInitialized.current = true;
    }
  }, [authState.initialized, processSession, updateAuthState, createSessionOnlyUser]);

  // Set up auth state change listener
  const setupAuthListener = useCallback(() => {
    // Only set up listener once
    if (sessionListenerSet.current) return;
    
    authLog.info("Setting up auth state change listener");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      sessionChangeCount.current++; 
      const changeId = sessionChangeCount.current;
      
      authLog.info(`Auth state change #${changeId}:`, event, {
        hasSession: !!newSession,
        userId: newSession?.user?.id || "none"
      });
      
      // Handle auth events
      switch (event) {
        case 'SIGNED_IN': {
          if (newSession) {
            authLog.info("User signed in event");
            
            try {
              const userData = await processSession(newSession);
              
              if (userData) {
                updateAuthState({
                  session: newSession,
                  user: userData,
                  initialized: true
                });
              } else {
                // Fallback to session-only user if profile operations failed
                authLog.warn("Failed to get/create profile during sign-in event - using fallback");
                const fallbackUser = createSessionOnlyUser(newSession);
                
                updateAuthState({
                  user: fallbackUser,
                  session: newSession,
                  initialized: true
                });
              }
            } catch (err) {
              authLog.error("Error processing user after sign-in event", err);
              
              // Last resort fallback - always give access if auth is valid
              const emergencyUser = createSessionOnlyUser(newSession);
              updateAuthState({
                session: newSession,
                user: emergencyUser,
                initialized: true
              });
              authLog.warn("Using emergency fallback user after sign-in event error");
            }
          }
          break;
        }
          
        case 'SIGNED_OUT': {
          authLog.info("User signed out event");
          updateAuthState({
            session: null,
            user: null,
            initialized: true
          });
          break;
        }
          
        case 'TOKEN_REFRESHED': {
          authLog.info("Token refreshed event");
          
          // Re-validate user is still valid
          if (newSession?.user) {
            const stillValid = await supabase.auth.getUser();
            
            if (stillValid.error || !stillValid.data.user) {
              authLog.warn("Token refreshed but user invalid, clearing session");
              updateAuthState({
                session: null,
                user: null,
                initialized: true
              });
            } else {
              // Update session
              updateAuthState({
                session: newSession,
                initialized: true
              });
              authLog.info("Session refreshed successfully");
            }
          }
          break;
        }
          
        case 'USER_UPDATED': {
          authLog.info("User updated event");
          if (newSession?.user) {
            const userData = await processSession(newSession);
            if (userData) {
              updateAuthState({
                session: newSession,
                user: userData,
                initialized: true
              });
            }
          }
          break;
        }
          
        default:
          // Other events we don't need to handle
          break;
      }
    });
    
    sessionListenerSet.current = true;
    
    // Return cleanup function
    return () => {
      authLog.info("Cleaning up auth listener");
      subscription.unsubscribe();
      sessionListenerSet.current = false;
    };
  }, [processSession, updateAuthState]);

  // Main auth setup effect
  useEffect(() => {
    // Try to restore from localStorage first (for fast initial render)
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const storedSession = localStorage.getItem(AUTH_SESSION_KEY);
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        authLog.info("Restored user from localStorage", parsedUser.username);
        
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            
            // Check if token is expired
            if (parsedSession.expires_at && parsedSession.expires_at * 1000 > Date.now()) {
              authLog.info("Using stored token (not expired)");
              updateAuthState({ 
                user: parsedUser,
                // Partial session restoration (just to have access_token)
                session: parsedSession as Session
              });
            } else {
              authLog.warn("Stored token is expired, will refresh");
            }
          } catch (e) {
            authLog.warn("Failed to parse stored session", e);
          }
        }
      }
    } catch (err) {
      authLog.error("Error restoring auth from localStorage", err);
    }
    
    // Initialize auth (get fresh data from Supabase)
    initAuth().catch(err => {
      authLog.error("Error in auth initialization", err);
    });
    
    // Setup auth listener
    const cleanup = setupAuthListener();
    
    // Cleanup on unmount
    return () => {
      if (cleanup) cleanup();
    };
  }, [initAuth, setupAuthListener, updateAuthState]);

  // Manual auth refresh function
  const refreshAuth = useCallback(async () => {
    authLog.info("Manual auth refresh requested");
    await initAuth();
  }, [initAuth]);

  // Login function
  const login = async (identifier: string, password: string) => {
    authLog.info("Login attempt", { identifier });
    setIsLoading(true);
    
    try {
      // Clear any previous auth data
      if (user) {
        authLog.info("Clearing previous user before login");
        // Don't call logout to avoid Supabase signOut which could conflict
        updateAuthState({
          user: null,
          session: null
        });
      }

      // Attempt login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });
      
      authLog.info("Login result", { 
        success: !signInError, 
        userId: signInData?.user?.id || "none",
        error: signInError ? signInError.message : null 
      });
      
      if (signInError) {
        return { error: signInError.message || "Login failed" };
      }
      
      if (!signInData.user) {
        return { error: "Login succeeded but no user returned" };
      }
      
      try {
        // Process session to get user
        const userData = await processSession(signInData.session);
        
        if (userData) {
          // Update auth state
          updateAuthState({
            user: userData,
            session: signInData.session,
            initialized: true
          });
          
          return { user: userData };
        } else {
          // Fallback to session-only user if profile operations failed
          authLog.warn("Failed to get/create profile during login - using fallback");
          const fallbackUser = createSessionOnlyUser(signInData.session);
          
          updateAuthState({
            user: fallbackUser,
            session: signInData.session,
            initialized: true
          });
          
          return { user: fallbackUser };
        }
      } catch (err) {
        authLog.error("Error processing user after login", err);
        
        // Last resort fallback - always give access if auth succeeded
        if (signInData.session) {
          const emergencyUser = createSessionOnlyUser(signInData.session);
          updateAuthState({
            session: signInData.session,
            user: emergencyUser,
            initialized: true
          });
          authLog.warn("Using emergency fallback user after login error");
          
          return { user: emergencyUser };
        }
        
        return { error: "Login succeeded but profile creation failed" };
      }
    } catch (err: any) {
      authLog.error("Login error", err);
      return { error: err.message || "Login failed due to an unexpected error" };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    authLog.info("Register attempt", { username, email });
    setIsLoading(true);
    
    try {
      // Use Supabase's built-in signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            first_name: firstName,
            last_name: lastName
          }
        }
      });
      
      if (signUpError) {
        return { error: signUpError.message || "Registration failed" };
      }
      
      if (!signUpData.user) {
        return { error: "Signup succeeded but no user returned" };
      }
      
      // Create profile
      const profile = await createProfileIfMissing(signUpData.user.id, email);
      
      if (!profile) {
        return { error: "Failed to create user profile" };
      }
      
      // Create user data
      const userData: User = {
        id: profile.id,
        username: profile.username || username,
        email: profile.email || email,
        first_name: profile.first_name || firstName,
        last_name: profile.last_name || lastName
      };
      
      // Update auth state
      updateAuthState({
        user: userData,
        session: signUpData.session,
        initialized: true
      });
      
      return { user: userData };
    } catch (err: any) {
      authLog.error("Registration error", err);
      return { error: err.message || "Registration failed due to an unexpected error" };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    authLog.info("Logout requested");
    setIsLoading(true);
    
    try {
      // Clear client-side state before API call to ensure a responsive UX
      // Clear localStorage immediately to prevent race conditions
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_SESSION_KEY);
      
      // Update auth state first (don't wait for API)
      updateAuthState({
        user: null,
        session: null,
        initialized: true
      });
      
      // Then sign out from Supabase (can fail but user already logged out locally)
      await supabase.auth.signOut().catch(err => {
        // Just log the error, don't block logout
        authLog.error("Supabase signOut API error (user still logged out locally):", err);
      });
      
      // Final cleanup of any lingering data
      sessionStorage.clear(); // Clear any session storage data
      
      authLog.info("Logout successful");
    } catch (err) {
      authLog.error("Logout error", err);
      
      // Force clear auth state even if signOut API fails
      updateAuthState({
        user: null,
        session: null,
        initialized: true
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to get current session token
  const getSessionToken = useCallback(() => {
    return session?.access_token || null;
  }, [session]);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        register, 
        logout, 
        isLoading,
        isInitialized: initialized,
        refreshAuth,
        getSessionToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

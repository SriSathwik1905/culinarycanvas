import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("AuthCallback: Handling auth callback");
    
    const handleAuthCallback = async () => {
      try {
        // Get code and next path from URL params
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const redirectTo = params.get('from') || '/';
        
        console.log("AuthCallback: Code present:", !!code);
        
        if (code) {
          // Exchange code for session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error("Error exchanging code for session:", exchangeError);
            setError(exchangeError.message);
            return;
          }
          
          if (data.session) {
            console.log("AuthCallback: Session established successfully");
            
            // Wait a moment for the auth state to update
            setTimeout(() => {
              navigate(redirectTo);
            }, 500);
            return;
          }
        }
        
        // If no code or session established, check current auth state
        if (!isLoading) {
          if (user) {
            console.log("AuthCallback: User already authenticated, redirecting to home");
            navigate("/");
          } else {
            console.log("AuthCallback: No user found, redirecting to auth page");
            navigate("/auth");
          }
        }
      } catch (err) {
        console.error("Error in auth callback:", err);
        setError("An unexpected error occurred during authentication");
      }
    };

    handleAuthCallback();
  }, [navigate, user, isLoading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      {error ? (
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-red-600">{error}</div>
          <button 
            onClick={() => navigate("/auth")}
            className="rounded-lg bg-sage px-4 py-2 text-white hover:bg-sage/90"
          >
            Back to login
          </button>
        </div>
      ) : (
        <div className="text-lg text-gray-600">Finalizing your login...</div>
      )}
    </div>
  );
};

export default AuthCallback;

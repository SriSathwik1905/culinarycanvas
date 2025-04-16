import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Auth = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submissionTimeoutRef = useRef<number | null>(null);
  
  // Get enhanced auth with initialization status
  const { login, register, user, isLoading: authLoading, isInitialized, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from URL search params
  const from = new URLSearchParams(location.search).get('from') || '/';
  
  // Clear submission timeout on unmount
  useEffect(() => {
    return () => {
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
    };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (isInitialized && !authLoading && user) {
      console.log('Auth page: User authenticated, redirecting to', from);
      navigate(from, { replace: true });
    }
  }, [user, navigate, authLoading, from, isInitialized]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    
    // Set a timeout to prevent indefinite submission state
    submissionTimeoutRef.current = window.setTimeout(() => {
      if (isSubmitting) {
        console.warn("Auth submission timeout reached");
        setIsSubmitting(false);
        setErrorMessage("Request timed out. Please try again.");
        // Try refreshing auth state
        refreshAuth().catch(err => {
          console.error("Error refreshing auth:", err);
        });
      }
    }, 10000); // 10 second timeout

    try {
      if (isSignUp) {
        // Handle sign up
        if (!username || !password || !email) {
          setErrorMessage("Please fill in all required fields");
          setIsSubmitting(false);
          clearTimeout(submissionTimeoutRef.current!);
          return;
        }

        const result = await register(username, email, password, firstName, lastName);
        
        // Clear timeout since we got a response
        if (submissionTimeoutRef.current) {
          clearTimeout(submissionTimeoutRef.current);
        }
        
        if (result.error) {
          setErrorMessage(result.error);
          setIsSubmitting(false);
        } else {
          toast.success("Account created successfully!");
          // Redirect happens in useEffect when user state updates
        }
      } else {
        // Handle sign in
        if ((!username && !email) || !password) {
          setErrorMessage("Please enter your username/email and password");
          setIsSubmitting(false);
          clearTimeout(submissionTimeoutRef.current!);
          return;
        }

        const identifier = email || username;
        console.log('Attempting login with:', identifier);
        const result = await login(identifier, password);
        
        // Clear timeout since we got a response
        if (submissionTimeoutRef.current) {
          clearTimeout(submissionTimeoutRef.current);
        }
        
        if (result.error) {
          console.error('Login error:', result.error);
          setErrorMessage(result.error);
          setIsSubmitting(false);
        } else {
          toast.success("Welcome back!");
          // Navigate happens in the useEffect when user state updates
        }
      }
    } catch (error: unknown) {
      // Clear timeout
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
      
      console.error("Auth error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setErrorMessage(errorMessage);
      setIsSubmitting(false);
    }
  };

  // If auth is still loading and not yet initialized, show loading state
  if (!isInitialized || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-lg text-gray-600">Preparing login page...</div>
      </div>
    );
  }

  // If user is already logged in, don't render the auth form
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-lg text-gray-600">Already logged in, redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="mx-auto mt-20 max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-[8px_8px_16px_#d4d1cd,-8px_-8px_16px_#ffffff]">
          <Link
            to="/"
            className="mx-auto mb-8 block text-2xl font-bold text-sage"
          >
            CulinaryCanvas
          </Link>
          <h2 className="mb-6 text-center text-2xl font-semibold text-gray-900">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h2>

          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
                disabled={isSubmitting}
              />
            </div>
            {isSignUp && (
              <div>
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}
            {!isSignUp && (
              <div>
                <Input
                  type="text"
                  placeholder="Username (if you prefer to login with username)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
                  disabled={isSubmitting}
                />
              </div>
            )}
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
                required
                disabled={isSubmitting}
              />
            </div>
            {isSignUp && (
              <>
                <div>
                  <Input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
            <Button
              type="submit"
              className="w-full rounded-xl bg-sage p-4 font-semibold text-white hover:bg-sage/90"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : isSignUp
                ? "Create account"
                : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage("");
              }}
              className="font-semibold text-sage hover:underline"
              disabled={isSubmitting}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

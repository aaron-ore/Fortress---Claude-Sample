import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { showSuccess, showError } from "@/utils/toast";
import { useLocation } from "react-router-dom"; // Removed useNavigate
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { logActivity } from "@/utils/logActivity";
import { useProfile } from "@/context/ProfileContext";

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [loading, setLoading] = useState(false);
  // Removed: const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const { profile } = useProfile();

  const [selectedPlanFromUrl, setSelectedPlanFromUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const plan = params.get('plan');
    if (plan) {
      setSelectedPlanFromUrl(plan);
      setIsLogin(false);
      showSuccess(`Selected ${plan} plan! Sign up.`);
    }
  }, [location.search]);

  // The global redirect logic for authenticated users is now handled in AppContent.tsx.
  // This useEffect is no longer needed here as the `if (!isLoading && user) { return null; }`
  // at the top of the component already prevents rendering, and AppContent.tsx will
  // handle the actual navigation.
  /*
  useEffect(() => {
    if (!isLoading && user) {
      console.log("[Auth.tsx] User already authenticated, redirecting to dashboard.");
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);
  */

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showError(error.message);
        await logActivity("Login Failed", `User ${email} failed to log in.`, profile, { error_message: error.message }, true);
      } else {
        showSuccess("Logged in!");
        await logActivity("Login Success", `User ${email} logged in successfully.`, profile);
        // No explicit navigate here, let the useEffect in AppContent handle it
      }
    } else {
      const options = {
        data: {
          full_name: fullName.trim() || null,
          company_code: companyCode.trim() || null,
          plan: selectedPlanFromUrl,
        },
        redirectTo: window.location.origin + '/auth', // Keep this for email confirmation flow
      };
      const { error } = await supabase.auth.signUp({ email, password, options });
      if (error) {
        showError(error.message);
        await logActivity("Signup Failed", `User ${email} failed to sign up.`, profile, { error_message: error.message, full_name: fullName, company_code: companyCode, plan: selectedPlanFromUrl }, true);
      } else {
        showSuccess("Account created! Check email to confirm.");
        await logActivity("Signup Success", `User ${email} signed up successfully.`, profile, { full_name: fullName, company_code: companyCode, plan: selectedPlanFromUrl });
        setIsLogin(true);
        setFullName("");
        setCompanyCode("");
        setSelectedPlanFromUrl(null);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showError("Enter email to reset password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) {
      showError(error.message);
      await logActivity("Forgot Password Failed", `Password reset request failed for ${email}.`, profile, { error_message: error.message }, true);
    } else {
      showSuccess("Password reset email sent! Check inbox.");
      await logActivity("Forgot Password Request", `Password reset email sent to ${email}.`, profile);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Ensure the redirect is clean to avoid issues with hash/query params being misinterpreted
        redirectTo: window.location.origin, 
      },
    });

    if (error) {
      showError(error.message);
      await logActivity("Google Sign-in Failed", `User failed to sign in with Google.`, profile, { error_message: error.message }, true);
    } else {
      // No explicit navigate here, let the useEffect in AppContent handle it
    }
    setLoading(false);
  };

  // If user is already authenticated, render nothing from Auth component
  // The useEffect in AppContent.tsx will handle the navigation.
  if (!isLoading && user) {
    return null; // Render nothing if authenticated, let the redirect happen
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground mt-2">Checking authentication status.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: `url('/932271.jpg')` }}
    >
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-lg border border-white/30 shadow-lg text-white">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary"
            >
              <path
                d="M12 2L2 12L12 22L22 12L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 2L2 12L12 22L22 12L12 2Z"
                fill="currentColor"
                fillOpacity="0.2"
            />
          </svg>
            <span className="text-3xl font-bold text-white">Fortress</span>
          </div>
          <CardTitle className="text-3xl font-bold text-white">
            {isLogin ? "Welcome Back!" : "Join Fortress"}
          </CardTitle>
          <CardDescription className="text-white/80">
            {isLogin ? "Sign in to your account" : "Create a new account to get started"}
          </CardDescription>
          {selectedPlanFromUrl && !isLogin && (
            <p className="text-sm text-primary font-semibold mt-2">
              Signing up for: {selectedPlanFromUrl.charAt(0).toUpperCase() + selectedPlanFromUrl.slice(1)} Plan
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/20 border-white/30 text-white placeholder:text-white/70 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-black/20 border-white/30 text-white placeholder:text-white/70 focus:ring-primary focus:border-primary"
              />
            </div>
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-black/20 border-white/30 text-white placeholder:text-white/70 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyCode" className="text-white">Company Code (Optional)</Label>
                  <Input
                    id="companyCode"
                    type="text"
                    placeholder="Enter company code (e.g., FORTRESS123)"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    className="bg-black/20 border-white/30 text-white placeholder:text-white/70 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-white/70">
                    If you have a company code, enter it to join your organization.
                  </p>
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : (isLogin ? "Sign In" : "Sign Up")}
            </Button>
          </form>
          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/20 px-2 text-white/80">
                Or
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2045C17.64 8.5645 17.58 7.9545 17.47 7.3845H9.00V10.8245H13.87C13.66 11.9845 13.01 12.9945 12.00 13.6645V16.0145H15.18C17.07 14.2945 18.12 11.7045 17.64 9.2045Z" fill="#4285F4"/>
                <path d="M9.00 18.0005C11.43 18.0005 13.46 17.2205 15.18 16.0105L12.00 13.6605C11.15 14.2305 10.13 14.5905 9.00 14.5905C6.81 14.5905 4.99 13.1405 4.34 11.1805H1.09V13.8305C1.76 15.1605 2.86 16.2705 4.24 17.0005C5.62 17.7305 7.25 18.0005 9.00 18.0005Z" fill="#34A853"/>
                <path d="M4.34 11.1805C4.19 10.7405 4.11 10.2705 4.11 9.8105C4.11 9.3505 4.19 8.8805 4.34 8.4405V5.7905H1.09C0.54 6.8605 0.25 8.0905 0.25 9.3105C0.25 10.5305 0.54 11.7605 1.09 12.8305L4.34 11.1805Z" fill="#FBBC05"/>
                <path d="M9.00 5.4105C10.17 5.4105 11.22 5.8105 12.09 6.5405L15.25 3.3805C13.46 1.6605 11.43 0.8805 9.00 0.8805C7.25 0.8805 5.62 1.1505 4.24 1.8805C2.86 2.6105 1.76 3.7205 1.09 5.0505L4.34 7.7005C4.99 5.7405 6.81 4.3005 9.00 4.3005V5.4105Z" fill="#EA4335"/>
              </svg>
              Sign {isLogin ? "In" : "Up"} with Google
            </Button>
            <div className="text-center text-sm">
              {isLogin ? (
                <>
                  <span className="text-white/80">Don't have an account?{" "}</span>
                  <Button variant="link" onClick={() => setIsLogin(false)} className="p-0 h-auto text-primary hover:text-primary/80">
                    Sign Up
                  </Button>
                  <div className="mt-2">
                    <Button variant="link" onClick={handleForgotPassword} className="p-0 h-auto text-white/80 hover:text-primary" disabled={loading}>
                      Forgot Password?
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-white/80">Already have an account?{" "}</span>
                  <Button variant="link" onClick={() => setIsLogin(true)} className="p-0 h-auto text-primary hover:text-primary/80">
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { showError } from '@/utils/toast';
import { logActivity } from '@/utils/logActivity'; // NEW: Import logActivity
// Removed: import { useProfile } from './ProfileContext'; // No longer needed here

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Removed: const { profile } = useProfile(); // This caused the context order error

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);

      // For logging in AuthContext, we don't have the full profile, so we pass null.
      // The logActivity utility is designed to handle this gracefully.
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem("onboarding_skipped");
        console.log("User signed out. Local storage cleared.");
        await logActivity("Logout Success", `User ${user?.email || 'unknown'} signed out.`, null); // Pass null for profile
      }
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error("Error getting initial session:", error);
        showError("Failed to load session: " + error.message);
        await logActivity("Session Load Failed", `Failed to load initial session.`, null, { error_message: error.message }, true); // Pass null for profile
      }
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // Dependency array changed from [user] to []
  // This ensures the effect runs only once on mount, preventing re-subscription loops.

  return (
    <AuthContext.Provider value={{ user, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
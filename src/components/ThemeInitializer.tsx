"use client";

import React, { useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "next-themes";

interface ThemeInitializerProps {
  children: React.ReactNode;
}

const ThemeInitializer: React.FC<ThemeInitializerProps> = ({ children }) => {
  const { profile, isLoadingProfile } = useProfile();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    if (!isLoadingProfile && profile?.companyProfile?.organizationTheme && theme !== profile.companyProfile.organizationTheme) { // Corrected access
      console.log(`[ThemeInitializer] Setting theme to: ${profile.companyProfile.organizationTheme}`); // Corrected access
      setTheme(profile.companyProfile.organizationTheme); // Corrected access
    }
  }, [isLoadingProfile, profile?.companyProfile?.organizationTheme, setTheme, theme]); // Corrected dependency

  return <>{children}</>;
};

export default ThemeInitializer;
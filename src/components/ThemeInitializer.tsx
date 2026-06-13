"use client";

import React, { useEffect, useRef } from "react";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "next-themes";

interface ThemeInitializerProps {
  children: React.ReactNode;
}

const ThemeInitializer: React.FC<ThemeInitializerProps> = ({ children }) => {
  const { profile, isLoadingProfile } = useProfile();
  const { setTheme, theme } = useTheme();
  // Apply the org theme once after load. Without this guard, a manual
  // dark/light toggle would be instantly reverted on the next render.
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!isLoadingProfile && profile?.companyProfile?.organizationTheme && !appliedRef.current) {
      appliedRef.current = true;
      if (theme !== profile.companyProfile.organizationTheme) {
        setTheme(profile.companyProfile.organizationTheme);
      }
    }
  }, [isLoadingProfile, profile?.companyProfile?.organizationTheme, setTheme, theme]);

  return <>{children}</>;
};

export default ThemeInitializer;
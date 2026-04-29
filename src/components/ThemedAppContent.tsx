"use client";

import React from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppContent from "@/AppContent";
import ThemeInitializer from "@/components/ThemeInitializer";

const ThemedAppContent: React.FC = () => {
  // The ThemeProvider will now always initialize with 'dark'
  // ThemeInitializer will handle setting the actual theme from the profile once loaded.

  return (
    <ThemeProvider defaultTheme="dark"> {/* Set a static defaultTheme */}
        <ThemeInitializer>
          <AppContent />
        </ThemeInitializer>
    </ThemeProvider>
  );
};

export default ThemedAppContent;
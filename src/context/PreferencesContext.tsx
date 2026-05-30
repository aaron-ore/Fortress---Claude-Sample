"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// Local (per-browser) workspace preferences. Kept out of the DB so it works
// without a migration; can be promoted to an org-level setting later.
const WAREHOUSE_KEY = "warehouseFeaturesEnabled";

interface PreferencesContextType {
  /** When false (default), warehouse-only features are hidden — restaurant-first. */
  warehouseEnabled: boolean;
  setWarehouseEnabled: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [warehouseEnabled, setWarehouseEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(WAREHOUSE_KEY) === "true";
  });

  const setWarehouseEnabled = (value: boolean) => {
    setWarehouseEnabledState(value);
    try {
      window.localStorage.setItem(WAREHOUSE_KEY, String(value));
    } catch {
      /* ignore storage failures */
    }
  };

  return (
    <PreferencesContext.Provider value={{ warehouseEnabled, setWarehouseEnabled }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
};

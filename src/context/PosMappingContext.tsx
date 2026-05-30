"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export type MatchMethod = "exact" | "fuzzy" | "manual";

export interface PosItemMapping {
  id: string;
  organizationId: string;
  posItemName: string;
  recipeId: string;
  matchMethod: MatchMethod;
  createdAt: string;
}

interface PosMappingContextType {
  mappings: PosItemMapping[];
  isLoading: boolean;
  /** Upsert a POS-name -> recipe mapping and resolve any matching imported sales rows. */
  saveMapping: (posItemName: string, recipeId: string, matchMethod: MatchMethod) => Promise<void>;
  deleteMapping: (id: string) => Promise<void>;
  refreshMappings: () => Promise<void>;
}

const PosMappingContext = createContext<PosMappingContextType | undefined>(undefined);

const mapRow = (row: any): PosItemMapping => ({
  id: row.id,
  organizationId: row.organization_id,
  posItemName: row.pos_item_name,
  recipeId: row.recipe_id,
  matchMethod: (row.match_method as MatchMethod) || "manual",
  createdAt: row.created_at,
});

export const PosMappingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, isLoadingProfile } = useProfile();
  const [mappings, setMappings] = useState<PosItemMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMappings = useCallback(async () => {
    setIsLoading(true);
    if (!profile?.organizationId) {
      setMappings([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("pos_item_mappings")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("pos_item_name");
    if (error) {
      console.error("Error fetching POS mappings:", error);
      showError("Failed to load POS mappings.");
      setMappings([]);
    } else {
      setMappings((data || []).map(mapRow));
    }
    setIsLoading(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) fetchMappings();
  }, [isLoadingProfile, fetchMappings]);

  const saveMapping = async (posItemName: string, recipeId: string, matchMethod: MatchMethod) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login required to save a mapping.");
      return;
    }
    const name = posItemName.trim();

    // Upsert on (organization_id, pos_item_name)
    const { data, error } = await supabase
      .from("pos_item_mappings")
      .upsert(
        {
          organization_id: profile.organizationId,
          user_id: session.user.id,
          pos_item_name: name,
          recipe_id: recipeId,
          match_method: matchMethod,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,pos_item_name" },
      )
      .select()
      .single();

    if (error) {
      showError(`Failed to save mapping: ${error.message}`);
      return;
    }

    // Resolve all imported sales rows for this POS name across the org.
    const { error: resolveError } = await supabase
      .from("menu_item_sales")
      .update({ recipe_id: recipeId })
      .eq("organization_id", profile.organizationId)
      .eq("pos_item_name", name);
    if (resolveError) {
      showError(`Mapping saved, but failed to resolve existing sales: ${resolveError.message}`);
    }

    const mapped = mapRow(data);
    setMappings((prev) => {
      const without = prev.filter((m) => m.id !== mapped.id && m.posItemName.toLowerCase() !== name.toLowerCase());
      return [...without, mapped].sort((a, b) => a.posItemName.localeCompare(b.posItemName));
    });
    showSuccess(`Mapped "${name}".`);
  };

  const deleteMapping = async (id: string) => {
    if (!profile?.organizationId) return;
    const { error } = await supabase
      .from("pos_item_mappings")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organizationId);
    if (error) {
      showError(`Failed to delete mapping: ${error.message}`);
      return;
    }
    setMappings((prev) => prev.filter((m) => m.id !== id));
    showSuccess("Mapping removed.");
  };

  return (
    <PosMappingContext.Provider value={{ mappings, isLoading, saveMapping, deleteMapping, refreshMappings: fetchMappings }}>
      {children}
    </PosMappingContext.Provider>
  );
};

export const usePosMappings = () => {
  const ctx = useContext(PosMappingContext);
  if (!ctx) throw new Error("usePosMappings must be used within PosMappingProvider");
  return ctx;
};

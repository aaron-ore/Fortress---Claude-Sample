"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { useRecipes } from "./RecipeContext";
import { ParsedSalesRow } from "@/lib/salesCsvParser";

export interface MenuItemSale {
  id: string;
  organizationId: string;
  periodId: string;
  posItemName: string;
  recipeId?: string;
  qtySold: number;
  saleDate: string;
  sourceFilename?: string;
  createdAt: string;
}

export interface SalesImportSummary {
  inserted: number;
  matched: number;
  unmatched: number;
}

interface SalesImportContextType {
  importSales: (periodId: string, rows: ParsedSalesRow[], sourceFilename?: string) => Promise<SalesImportSummary | null>;
  fetchSalesForPeriod: (periodId: string) => Promise<MenuItemSale[]>;
  clearSalesForPeriod: (periodId: string) => Promise<void>;
  setSaleRecipe: (saleId: string, recipeId: string | null) => Promise<void>;
}

const SalesImportContext = createContext<SalesImportContextType | undefined>(undefined);

const mapRow = (row: any): MenuItemSale => ({
  id: row.id,
  organizationId: row.organization_id,
  periodId: row.period_id,
  posItemName: row.pos_item_name,
  recipeId: row.recipe_id || undefined,
  qtySold: parseFloat(row.qty_sold) || 0,
  saleDate: row.sale_date,
  sourceFilename: row.source_filename || undefined,
  createdAt: row.created_at,
});

export const SalesImportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  const { recipes } = useRecipes();
  const [, setLastSummary] = useState<SalesImportSummary | null>(null);

  const fetchSalesForPeriod = useCallback(async (periodId: string): Promise<MenuItemSale[]> => {
    if (!profile?.organizationId) return [];
    const { data, error } = await supabase
      .from("menu_item_sales")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .eq("period_id", periodId)
      .order("pos_item_name");
    if (error) {
      console.error("Error fetching sales:", error);
      showError("Failed to load sales for this period.");
      return [];
    }
    return (data || []).map(mapRow);
  }, [profile?.organizationId]);

  const importSales = async (
    periodId: string,
    rows: ParsedSalesRow[],
    sourceFilename?: string,
  ): Promise<SalesImportSummary | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login required to import sales.");
      return null;
    }
    if (rows.length === 0) {
      showError("No valid sales rows to import.");
      return null;
    }

    // Deterministic exact-name auto-resolution to a recipe (case-insensitive).
    // Fuzzy / saved POS-name mappings are layered on in the mapping step.
    const recipeByName = new Map<string, string>();
    for (const r of recipes) recipeByName.set(r.name.trim().toLowerCase(), r.id);

    let matched = 0;
    const payload = rows.map((row) => {
      const recipeId = recipeByName.get(row.menuItemName.trim().toLowerCase()) || null;
      if (recipeId) matched++;
      return {
        organization_id: profile.organizationId,
        user_id: session.user.id,
        period_id: periodId,
        pos_item_name: row.menuItemName,
        recipe_id: recipeId,
        qty_sold: row.qtySold,
        sale_date: row.saleDate,
        source_filename: sourceFilename || null,
      };
    });

    const { error } = await supabase.from("menu_item_sales").insert(payload);
    if (error) {
      showError(`Failed to import sales: ${error.message}`);
      return null;
    }

    const summary: SalesImportSummary = {
      inserted: payload.length,
      matched,
      unmatched: payload.length - matched,
    };
    setLastSummary(summary);
    showSuccess(`Imported ${summary.inserted} sales rows (${summary.matched} auto-matched to recipes).`);
    return summary;
  };

  const clearSalesForPeriod = async (periodId: string) => {
    if (!profile?.organizationId) return;
    const { error } = await supabase
      .from("menu_item_sales")
      .delete()
      .eq("organization_id", profile.organizationId)
      .eq("period_id", periodId);
    if (error) {
      showError(`Failed to clear sales: ${error.message}`);
      return;
    }
    showSuccess("Cleared imported sales for this period.");
  };

  const setSaleRecipe = async (saleId: string, recipeId: string | null) => {
    if (!profile?.organizationId) return;
    const { error } = await supabase
      .from("menu_item_sales")
      .update({ recipe_id: recipeId })
      .eq("id", saleId)
      .eq("organization_id", profile.organizationId);
    if (error) showError(`Failed to update sale mapping: ${error.message}`);
  };

  return (
    <SalesImportContext.Provider value={{ importSales, fetchSalesForPeriod, clearSalesForPeriod, setSaleRecipe }}>
      {children}
    </SalesImportContext.Provider>
  );
};

export const useSalesImport = () => {
  const ctx = useContext(SalesImportContext);
  if (!ctx) throw new Error("useSalesImport must be used within SalesImportProvider");
  return ctx;
};

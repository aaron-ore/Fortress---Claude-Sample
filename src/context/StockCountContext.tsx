"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

// A stock count is a dated snapshot of on-hand quantities. Consecutive counts
// auto-chain: usage between them = previous count + purchases - this count.
// No periods, no beginning/ending — see src/pages/FoodCost.tsx.
export interface StockCount {
  id: string;
  organizationId: string;
  locationId: string | null;
  countDate: string; // YYYY-MM-DD
  note: string | null;
  salesTotal: number | null; // total food sales for the window ending at this count
  createdAt: string;
}

export interface StockCountLine {
  inventoryItemId: string;
  quantity: number;
}

interface StockCountContextType {
  stockCounts: StockCount[];
  isLoading: boolean;
  createStockCount: (input: {
    locationId: string | null;
    countDate: string;
    note?: string;
    lines: StockCountLine[];
  }) => Promise<StockCount | null>;
  fetchCountLines: (stockCountId: string) => Promise<StockCountLine[]>;
  updateSalesTotal: (id: string, salesTotal: number | null) => Promise<void>;
  deleteStockCount: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const StockCountContext = createContext<StockCountContextType | undefined>(undefined);

const mapRow = (row: any): StockCount => ({
  id: row.id,
  organizationId: row.organization_id,
  locationId: row.location_id || null,
  countDate: row.count_date,
  note: row.note || null,
  salesTotal: row.sales_total != null ? parseFloat(row.sales_total) : null,
  createdAt: row.created_at,
});

export const StockCountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, isLoadingProfile } = useProfile();
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStockCounts = useCallback(async () => {
    setIsLoading(true);
    if (!profile?.organizationId) {
      setStockCounts([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("stock_counts")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("count_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching stock counts:", error);
      setStockCounts([]);
    } else {
      setStockCounts((data || []).map(mapRow));
    }
    setIsLoading(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) fetchStockCounts();
  }, [isLoadingProfile, fetchStockCounts]);

  const createStockCount: StockCountContextType["createStockCount"] = async (input) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login required to save a count.");
      return null;
    }

    const { data: header, error } = await supabase
      .from("stock_counts")
      .insert({
        organization_id: profile.organizationId,
        user_id: session.user.id,
        location_id: input.locationId || null,
        count_date: input.countDate,
        note: input.note || null,
      })
      .select()
      .single();

    if (error || !header) {
      console.error("stock_counts insert failed:", error);
      showError(`Failed to save count: ${error?.message || "unknown error"}`);
      return null;
    }

    const lines = input.lines.filter((l) => l.inventoryItemId);
    if (lines.length > 0) {
      const rows = lines.map((l) => ({
        stock_count_id: header.id,
        organization_id: profile.organizationId,
        inventory_item_id: l.inventoryItemId,
        quantity: l.quantity,
      }));
      const { error: lineErr } = await supabase.from("stock_count_lines").insert(rows);
      if (lineErr) {
        console.error("stock_count_lines insert failed:", lineErr);
        showError(`Count saved but items failed: ${lineErr.message}`);
      }
    }

    const sc = mapRow(header);
    setStockCounts((prev) => [sc, ...prev].sort((a, b) => b.countDate.localeCompare(a.countDate)));
    showSuccess("Stock count saved.");
    return sc;
  };

  const fetchCountLines = useCallback(async (stockCountId: string): Promise<StockCountLine[]> => {
    if (!profile?.organizationId) return [];
    const { data, error } = await supabase
      .from("stock_count_lines")
      .select("inventory_item_id, quantity")
      .eq("stock_count_id", stockCountId);
    if (error) {
      console.error("Error fetching count lines:", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      inventoryItemId: r.inventory_item_id,
      quantity: parseFloat(r.quantity) || 0,
    }));
  }, [profile?.organizationId]);

  const updateSalesTotal = async (id: string, salesTotal: number | null) => {
    if (!profile?.organizationId) return;
    const { error } = await supabase
      .from("stock_counts")
      .update({ sales_total: salesTotal })
      .eq("id", id)
      .eq("organization_id", profile.organizationId);
    if (error) {
      console.error("stock_counts sales_total update failed:", error);
      showError(`Failed to save food sales: ${error.message}`);
      return;
    }
    setStockCounts((prev) => prev.map((c) => (c.id === id ? { ...c, salesTotal } : c)));
    showSuccess("Food sales saved.");
  };

  const deleteStockCount = async (id: string) => {
    if (!profile?.organizationId) return;
    const { error } = await supabase
      .from("stock_counts")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organizationId);
    if (error) {
      showError(`Failed to delete count: ${error.message}`);
      return;
    }
    setStockCounts((prev) => prev.filter((c) => c.id !== id));
    showSuccess("Count deleted.");
  };

  return (
    <StockCountContext.Provider
      value={{ stockCounts, isLoading, createStockCount, fetchCountLines, updateSalesTotal, deleteStockCount, refresh: fetchStockCounts }}
    >
      {children}
    </StockCountContext.Provider>
  );
};

export const useStockCounts = () => {
  const ctx = useContext(StockCountContext);
  if (!ctx) throw new Error("useStockCounts must be used within StockCountProvider");
  return ctx;
};

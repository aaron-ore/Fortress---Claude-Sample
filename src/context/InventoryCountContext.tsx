"use client";

import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export type CountType = "beginning" | "ending";

export interface InventoryCount {
  id: string;
  organizationId: string;
  periodId: string;
  locationId: string;
  countType: CountType;
  inventoryItemId: string;
  countedQty: number;
  countedAt: string;
}

export interface CountUpsert {
  inventoryItemId: string;
  countedQty: number;
}

interface InventoryCountContextType {
  fetchCountsForPeriod: (periodId: string) => Promise<InventoryCount[]>;
  saveCounts: (
    periodId: string,
    locationId: string,
    countType: CountType,
    counts: CountUpsert[],
  ) => Promise<boolean>;
}

const InventoryCountContext = createContext<InventoryCountContextType | undefined>(undefined);

const mapRow = (row: any): InventoryCount => ({
  id: row.id,
  organizationId: row.organization_id,
  periodId: row.period_id,
  locationId: row.location_id,
  countType: row.count_type === "ending" ? "ending" : "beginning",
  inventoryItemId: row.inventory_item_id,
  countedQty: parseFloat(row.counted_qty) || 0,
  countedAt: row.counted_at,
});

export const InventoryCountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useProfile();

  const fetchCountsForPeriod = useCallback(async (periodId: string): Promise<InventoryCount[]> => {
    if (!profile?.organizationId) return [];
    const { data, error } = await supabase
      .from("inventory_counts")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .eq("period_id", periodId);
    if (error) {
      console.error("Error fetching counts:", error);
      showError("Failed to load counts for this period.");
      return [];
    }
    return (data || []).map(mapRow);
  }, [profile?.organizationId]);

  const saveCounts = async (
    periodId: string,
    locationId: string,
    countType: CountType,
    counts: CountUpsert[],
  ): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login required to save counts.");
      return false;
    }
    if (counts.length === 0) return true;

    const rows = counts.map((c) => ({
      organization_id: profile.organizationId,
      user_id: session.user.id,
      period_id: periodId,
      location_id: locationId,
      count_type: countType,
      inventory_item_id: c.inventoryItemId,
      counted_qty: c.countedQty,
      counted_at: new Date().toISOString(),
    }));

    // Unique on (period_id, count_type, inventory_item_id) -> upsert.
    const { error } = await supabase
      .from("inventory_counts")
      .upsert(rows, { onConflict: "period_id,count_type,inventory_item_id" });

    if (error) {
      showError(`Failed to save counts: ${error.message}`);
      return false;
    }
    showSuccess(`Saved ${rows.length} ${countType} count(s).`);
    return true;
  };

  return (
    <InventoryCountContext.Provider value={{ fetchCountsForPeriod, saveCounts }}>
      {children}
    </InventoryCountContext.Provider>
  );
};

export const useInventoryCounts = () => {
  const ctx = useContext(InventoryCountContext);
  if (!ctx) throw new Error("useInventoryCounts must be used within InventoryCountProvider");
  return ctx;
};

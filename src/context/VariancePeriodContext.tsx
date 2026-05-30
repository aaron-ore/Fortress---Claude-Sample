"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

// A variance period scopes all four inputs (sales, counts, purchases, recipes)
// to a single location and date range. See src/lib/varianceEngine.ts.
export interface VariancePeriod {
  id: string;
  organizationId: string;
  userId: string;
  locationId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

export type VariancePeriodInput = {
  locationId: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: "open" | "closed";
};

interface VariancePeriodContextType {
  periods: VariancePeriod[];
  isLoading: boolean;
  createPeriod: (input: VariancePeriodInput) => Promise<VariancePeriod | null>;
  updatePeriod: (id: string, input: Partial<VariancePeriodInput>) => Promise<void>;
  deletePeriod: (id: string) => Promise<void>;
  refreshPeriods: () => Promise<void>;
}

const VariancePeriodContext = createContext<VariancePeriodContextType | undefined>(undefined);

const mapRow = (row: any): VariancePeriod => ({
  id: row.id,
  organizationId: row.organization_id,
  userId: row.user_id,
  locationId: row.location_id,
  name: row.name,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status === "closed" ? "closed" : "open",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const VariancePeriodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, isLoadingProfile } = useProfile();
  const [periods, setPeriods] = useState<VariancePeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPeriods = useCallback(async () => {
    setIsLoading(true);
    if (!profile?.organizationId) {
      setPeriods([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("variance_periods")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching variance periods:", error);
      showError("Failed to load variance periods.");
      setPeriods([]);
    } else {
      setPeriods((data || []).map(mapRow));
    }
    setIsLoading(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) fetchPeriods();
  }, [isLoadingProfile, fetchPeriods]);

  const createPeriod = async (input: VariancePeriodInput): Promise<VariancePeriod | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login required to create a period.");
      return null;
    }
    const { data, error } = await supabase
      .from("variance_periods")
      .insert({
        organization_id: profile.organizationId,
        user_id: session.user.id,
        location_id: input.locationId,
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        status: input.status || "open",
      })
      .select()
      .single();

    if (error) {
      showError(`Failed to create period: ${error.message}`);
      return null;
    }
    const period = mapRow(data);
    setPeriods((prev) => [period, ...prev]);
    showSuccess(`Period "${period.name}" created.`);
    return period;
  };

  const updatePeriod = async (id: string, input: Partial<VariancePeriodInput>) => {
    if (!profile?.organizationId) return;
    const payload: Record<string, any> = {};
    if (input.locationId !== undefined) payload.location_id = input.locationId;
    if (input.name !== undefined) payload.name = input.name;
    if (input.startDate !== undefined) payload.start_date = input.startDate;
    if (input.endDate !== undefined) payload.end_date = input.endDate;
    if (input.status !== undefined) payload.status = input.status;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("variance_periods")
      .update(payload)
      .eq("id", id)
      .eq("organization_id", profile.organizationId)
      .select()
      .single();

    if (error) {
      showError(`Failed to update period: ${error.message}`);
      return;
    }
    setPeriods((prev) => prev.map((p) => (p.id === id ? mapRow(data) : p)));
    showSuccess(`Period "${data.name}" updated.`);
  };

  const deletePeriod = async (id: string) => {
    if (!profile?.organizationId) return;
    const { error } = await supabase
      .from("variance_periods")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organizationId);

    if (error) {
      showError(`Failed to delete period: ${error.message}`);
      return;
    }
    setPeriods((prev) => prev.filter((p) => p.id !== id));
    showSuccess("Period deleted.");
  };

  return (
    <VariancePeriodContext.Provider
      value={{ periods, isLoading, createPeriod, updatePeriod, deletePeriod, refreshPeriods: fetchPeriods }}
    >
      {children}
    </VariancePeriodContext.Provider>
  );
};

export const useVariancePeriods = () => {
  const ctx = useContext(VariancePeriodContext);
  if (!ctx) throw new Error("useVariancePeriods must be used within VariancePeriodProvider");
  return ctx;
};

"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export interface UnitOfMeasure {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  abbreviation: string;
  category: 'weight' | 'volume' | 'count' | 'length' | 'area';
  createdAt: string;
}

const DEFAULT_UNITS: Omit<UnitOfMeasure, 'id' | 'organizationId' | 'userId' | 'createdAt'>[] = [
  { name: "Each", abbreviation: "ea", category: "count" },
  { name: "Case", abbreviation: "cs", category: "count" },
  { name: "Dozen", abbreviation: "dz", category: "count" },
  { name: "Gram", abbreviation: "g", category: "weight" },
  { name: "Kilogram", abbreviation: "kg", category: "weight" },
  { name: "Ounce", abbreviation: "oz", category: "weight" },
  { name: "Pound", abbreviation: "lb", category: "weight" },
  { name: "Milliliter", abbreviation: "ml", category: "volume" },
  { name: "Liter", abbreviation: "L", category: "volume" },
  { name: "Fluid Ounce", abbreviation: "fl oz", category: "volume" },
  { name: "Cup", abbreviation: "cup", category: "volume" },
  { name: "Gallon", abbreviation: "gal", category: "volume" },
  { name: "Tablespoon", abbreviation: "tbsp", category: "volume" },
  { name: "Teaspoon", abbreviation: "tsp", category: "volume" },
];

interface UnitOfMeasureContextType {
  units: UnitOfMeasure[];
  isLoading: boolean;
  addUnit: (unit: Omit<UnitOfMeasure, 'id' | 'createdAt' | 'userId' | 'organizationId'>) => Promise<UnitOfMeasure | null>;
  updateUnit: (unit: Omit<UnitOfMeasure, 'createdAt' | 'userId' | 'organizationId'>) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<void>;
  seedDefaultUnits: () => Promise<void>;
  getUnitById: (id: string) => UnitOfMeasure | undefined;
  getUnitsByCategory: (category: UnitOfMeasure['category']) => UnitOfMeasure[];
}

const UnitOfMeasureContext = createContext<UnitOfMeasureContextType | undefined>(undefined);

const mapRow = (row: any): UnitOfMeasure => ({
  id: row.id,
  organizationId: row.organization_id,
  userId: row.user_id,
  name: row.name,
  abbreviation: row.abbreviation,
  category: row.category,
  createdAt: row.created_at,
});

export const UnitOfMeasureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, isLoadingProfile } = useProfile();
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    if (!profile?.organizationId) {
      setUnits([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("units_of_measure")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("category")
      .order("name");

    if (error) {
      console.error("Error fetching units of measure:", error);
      showError("Failed to load units of measure.");
      setUnits([]);
    } else {
      setUnits(data.map(mapRow));
    }
    setIsLoading(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile && profile?.organizationId) {
      fetchUnits();
    } else if (!isLoadingProfile) {
      setUnits([]);
      setIsLoading(false);
    }
  }, [isLoadingProfile, profile?.organizationId, fetchUnits]);

  const addUnit = async (unit: Omit<UnitOfMeasure, 'id' | 'createdAt' | 'userId' | 'organizationId'>): Promise<UnitOfMeasure | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login required to add units.");
      return null;
    }

    const { data, error } = await supabase
      .from("units_of_measure")
      .insert({
        organization_id: profile.organizationId,
        user_id: session.user.id,
        name: unit.name.trim(),
        abbreviation: unit.abbreviation.trim(),
        category: unit.category,
      })
      .select()
      .single();

    if (error) {
      showError(`Failed to add unit: ${error.message}`);
      return null;
    }

    const newUnit = mapRow(data);
    setUnits(prev => [...prev, newUnit].sort((a, b) => a.name.localeCompare(b.name)));
    showSuccess(`Unit "${unit.name}" added.`);
    return newUnit;
  };

  const updateUnit = async (unit: Omit<UnitOfMeasure, 'createdAt' | 'userId' | 'organizationId'>) => {
    if (!profile?.organizationId) return;

    const { data, error } = await supabase
      .from("units_of_measure")
      .update({ name: unit.name, abbreviation: unit.abbreviation, category: unit.category })
      .eq("id", unit.id)
      .eq("organization_id", profile.organizationId)
      .select()
      .single();

    if (error) {
      showError(`Failed to update unit: ${error.message}`);
      return;
    }

    setUnits(prev => prev.map(u => u.id === unit.id ? mapRow(data) : u));
    showSuccess(`Unit "${unit.name}" updated.`);
  };

  const deleteUnit = async (unitId: string) => {
    if (!profile?.organizationId) return;

    const { error } = await supabase
      .from("units_of_measure")
      .delete()
      .eq("id", unitId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      showError(`Failed to delete unit: ${error.message}`);
      return;
    }

    setUnits(prev => prev.filter(u => u.id !== unitId));
    showSuccess("Unit deleted.");
  };

  const seedDefaultUnits = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) return;

    const rows = DEFAULT_UNITS.map(u => ({
      organization_id: profile.organizationId,
      user_id: session.user.id,
      name: u.name,
      abbreviation: u.abbreviation,
      category: u.category,
    }));

    const { error } = await supabase
      .from("units_of_measure")
      .upsert(rows, { onConflict: "organization_id,name", ignoreDuplicates: true });

    if (error) {
      showError(`Failed to seed default units: ${error.message}`);
      return;
    }

    await fetchUnits();
    showSuccess("Default units of measure added.");
  };

  const getUnitById = (id: string) => units.find(u => u.id === id);
  const getUnitsByCategory = (category: UnitOfMeasure['category']) => units.filter(u => u.category === category);

  return (
    <UnitOfMeasureContext.Provider value={{
      units,
      isLoading,
      addUnit,
      updateUnit,
      deleteUnit,
      seedDefaultUnits,
      getUnitById,
      getUnitsByCategory,
    }}>
      {children}
    </UnitOfMeasureContext.Provider>
  );
};

export const useUnitOfMeasure = () => {
  const ctx = useContext(UnitOfMeasureContext);
  if (!ctx) throw new Error("useUnitOfMeasure must be used within UnitOfMeasureProvider");
  return ctx;
};

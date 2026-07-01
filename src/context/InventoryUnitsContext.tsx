import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { logActivity } from "@/utils/logActivity";
import { UnitStatus, DEFAULT_UNIT_STATUS } from "@/lib/warehouseStatuses";

export interface InventoryUnit {
  id: string;
  organizationId: string | null;
  productId: string;
  serialNumber: string;
  unitStatus: UnitStatus;
  vendorId?: string;
  folderId?: string;
  merchantId?: string;
  receivedDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Shape the Bulk Intake screen sends per scanned serial in a batch. */
export interface NewUnitInput {
  productId: string;
  serialNumber: string;
  vendorId?: string;
  folderId?: string;
  receivedDate?: string;
  notes?: string;
  unitStatus?: UnitStatus;
}

interface InventoryUnitsContextType {
  units: InventoryUnit[];
  isLoadingUnits: boolean;
  refreshUnits: () => Promise<void>;
  /** Bulk-insert a batch of serialized units. Throws on failure so the caller can surface it. */
  addUnitsBatch: (units: NewUnitInput[]) => Promise<InventoryUnit[]>;
  updateUnitStatus: (unitId: string, status: UnitStatus) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<void>;
}

const InventoryUnitsContext = createContext<InventoryUnitsContextType | undefined>(undefined);

const mapRow = (u: any): InventoryUnit => ({
  id: u.id,
  organizationId: u.organization_id,
  productId: u.product_id,
  serialNumber: u.serial_number,
  unitStatus: u.unit_status,
  vendorId: u.vendor_id || undefined,
  folderId: u.folder_id || undefined,
  merchantId: u.merchant_id || undefined,
  receivedDate: u.received_date,
  notes: u.notes || undefined,
  createdAt: u.created_at,
  updatedAt: u.updated_at,
});

export const InventoryUnitsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const fetchUnits = useCallback(async () => {
    setIsLoadingUnits(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setUnits([]);
      setIsLoadingUnits(false);
      return;
    }

    const { data, error } = await supabase
      .from("inventory_units")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching inventory units:", error);
      showError("Failed to load serialized units.");
      setUnits([]);
    } else {
      setUnits((data || []).map(mapRow));
    }
    setIsLoadingUnits(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchUnits();
    }
  }, [fetchUnits, isLoadingProfile]);

  const addUnitsBatch = async (newUnits: NewUnitInput[]): Promise<InventoryUnit[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const msg = "Login/org ID required.";
      showError(msg);
      throw new Error(msg);
    }
    if (newUnits.length === 0) return [];

    const rows = newUnits.map((u) => ({
      organization_id: profile.organizationId,
      user_id: session.user.id,
      product_id: u.productId,
      serial_number: u.serialNumber.trim(),
      unit_status: u.unitStatus || DEFAULT_UNIT_STATUS,
      vendor_id: u.vendorId || null,
      folder_id: u.folderId || null,
      received_date: u.receivedDate || new Date().toISOString().split("T")[0],
      notes: u.notes || null,
    }));

    const { data, error } = await supabase.from("inventory_units").insert(rows).select();

    if (error) {
      console.error("Error adding inventory units:", error);
      await logActivity("Bulk Intake Failed", `Failed to add ${rows.length} unit(s).`, profile, { error_message: error.message }, true);
      // 23505 = unique_violation (a serial already exists for this org).
      if (error.code === "23505") {
        throw new Error("One or more serials already exist. Remove duplicates and try again.");
      }
      throw new Error(error.message);
    }

    const inserted = (data || []).map(mapRow);
    setUnits((prev) => [...inserted, ...prev]);
    await logActivity("Bulk Intake Success", `Added ${inserted.length} serialized unit(s).`, profile, { count: inserted.length });
    return inserted;
  };

  const updateUnitStatus = async (unitId: string, status: UnitStatus) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }

    const { data, error } = await supabase
      .from("inventory_units")
      .update({ unit_status: status })
      .eq("id", unitId)
      .eq("organization_id", profile.organizationId)
      .select();

    if (error) {
      console.error("Error updating unit status:", error);
      showError(`Failed to update unit: ${error.message}`);
      return;
    }
    if (data && data.length > 0) {
      const updated = mapRow(data[0]);
      setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    }
  };

  const deleteUnit = async (unitId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }

    const { error } = await supabase
      .from("inventory_units")
      .delete()
      .eq("id", unitId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error deleting unit:", error);
      showError(`Failed to delete unit: ${error.message}`);
      return;
    }
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
    showSuccess("Unit deleted.");
  };

  return (
    <InventoryUnitsContext.Provider
      value={{ units, isLoadingUnits, refreshUnits: fetchUnits, addUnitsBatch, updateUnitStatus, deleteUnit }}
    >
      {children}
    </InventoryUnitsContext.Provider>
  );
};

export const useInventoryUnits = () => {
  const context = useContext(InventoryUnitsContext);
  if (context === undefined) {
    throw new Error("useInventoryUnits must be used within an InventoryUnitsProvider");
  }
  return context;
};

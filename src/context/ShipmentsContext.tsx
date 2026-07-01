import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export interface Shipment {
  id: string;
  organizationId: string | null;
  merchantId?: string;
  shipDate: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  createdAt: string;
}

export interface NewShipment {
  merchantId: string;
  shipDate: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
}

interface ShipmentsContextType {
  shipments: Shipment[];
  isLoadingShipments: boolean;
  refreshShipments: () => Promise<void>;
  createShipment: (shipment: NewShipment) => Promise<Shipment>;
}

const ShipmentsContext = createContext<ShipmentsContextType | undefined>(undefined);

const mapRow = (s: any): Shipment => ({
  id: s.id,
  organizationId: s.organization_id,
  merchantId: s.merchant_id || undefined,
  shipDate: s.ship_date,
  trackingNumber: s.tracking_number || undefined,
  carrier: s.carrier || undefined,
  notes: s.notes || undefined,
  createdAt: s.created_at,
});

export const ShipmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const fetchShipments = useCallback(async () => {
    setIsLoadingShipments(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setShipments([]);
      setIsLoadingShipments(false);
      return;
    }
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching shipments:", error);
      showError("Failed to load shipments.");
      setShipments([]);
    } else {
      setShipments((data || []).map(mapRow));
    }
    setIsLoadingShipments(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) fetchShipments();
  }, [fetchShipments, isLoadingProfile]);

  const createShipment = async (shipment: NewShipment): Promise<Shipment> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const msg = "Login/org ID required.";
      showError(msg);
      throw new Error(msg);
    }
    const { data, error } = await supabase
      .from("shipments")
      .insert({
        merchant_id: shipment.merchantId,
        ship_date: shipment.shipDate,
        tracking_number: shipment.trackingNumber || null,
        carrier: shipment.carrier || null,
        notes: shipment.notes || null,
        user_id: session.user.id,
        organization_id: profile.organizationId,
      })
      .select();
    if (error) {
      console.error("Error creating shipment:", error);
      throw new Error(error.message);
    }
    const created = mapRow(data[0]);
    setShipments((prev) => [created, ...prev]);
    return created;
  };

  return (
    <ShipmentsContext.Provider value={{ shipments, isLoadingShipments, refreshShipments: fetchShipments, createShipment }}>
      {children}
    </ShipmentsContext.Provider>
  );
};

export const useShipments = () => {
  const context = useContext(ShipmentsContext);
  if (context === undefined) throw new Error("useShipments must be used within a ShipmentsProvider");
  return context;
};

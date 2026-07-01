import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export type PaymentStatus = "paid" | "pending";

export interface Merchant {
  id: string;
  organizationId: string | null;
  name: string;
  partnerId?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  shippingAddress?: string;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
}

export type NewMerchant = Omit<Merchant, "id" | "organizationId" | "createdAt">;

interface MerchantsContextType {
  merchants: Merchant[];
  isLoadingMerchants: boolean;
  refreshMerchants: () => Promise<void>;
  addMerchant: (merchant: NewMerchant) => Promise<Merchant | null>;
  updateMerchant: (merchant: Merchant) => Promise<void>;
  setMerchantPaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  deleteMerchant: (id: string) => Promise<void>;
}

const MerchantsContext = createContext<MerchantsContextType | undefined>(undefined);

const mapRow = (m: any): Merchant => ({
  id: m.id,
  organizationId: m.organization_id,
  name: m.name,
  partnerId: m.partner_id || undefined,
  contactName: m.contact_name || undefined,
  email: m.email || undefined,
  phone: m.phone || undefined,
  shippingAddress: m.shipping_address || undefined,
  paymentStatus: m.payment_status,
  notes: m.notes || undefined,
  createdAt: m.created_at,
});

export const MerchantsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const fetchMerchants = useCallback(async () => {
    setIsLoadingMerchants(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setMerchants([]);
      setIsLoadingMerchants(false);
      return;
    }
    const { data, error } = await supabase
      .from("merchants")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("name", { ascending: true });
    if (error) {
      console.error("Error fetching merchants:", error);
      showError("Failed to load merchants.");
      setMerchants([]);
    } else {
      setMerchants((data || []).map(mapRow));
    }
    setIsLoadingMerchants(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) fetchMerchants();
  }, [fetchMerchants, isLoadingProfile]);

  const buildRow = (m: NewMerchant) => ({
    name: m.name,
    partner_id: m.partnerId || null,
    contact_name: m.contactName || null,
    email: m.email || null,
    phone: m.phone || null,
    shipping_address: m.shippingAddress || null,
    payment_status: m.paymentStatus,
    notes: m.notes || null,
  });

  const addMerchant = async (merchant: NewMerchant): Promise<Merchant | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return null;
    }
    const { data, error } = await supabase
      .from("merchants")
      .insert({ ...buildRow(merchant), user_id: session.user.id, organization_id: profile.organizationId })
      .select();
    if (error) {
      console.error("Error adding merchant:", error);
      showError(`Failed to add merchant: ${error.message}`);
      return null;
    }
    const created = mapRow(data[0]);
    setMerchants((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    showSuccess(`Merchant "${created.name}" added!`);
    return created;
  };

  const updateMerchant = async (merchant: Merchant) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }
    const { data, error } = await supabase
      .from("merchants")
      .update(buildRow(merchant))
      .eq("id", merchant.id)
      .eq("organization_id", profile.organizationId)
      .select();
    if (error) {
      console.error("Error updating merchant:", error);
      showError(`Failed to update merchant: ${error.message}`);
      return;
    }
    const updated = mapRow(data[0]);
    setMerchants((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    showSuccess(`Merchant "${updated.name}" updated!`);
  };

  const setMerchantPaymentStatus = async (id: string, status: PaymentStatus) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }
    const { data, error } = await supabase
      .from("merchants")
      .update({ payment_status: status })
      .eq("id", id)
      .eq("organization_id", profile.organizationId)
      .select();
    if (error) {
      console.error("Error updating payment status:", error);
      showError(`Failed to update payment status: ${error.message}`);
      return;
    }
    if (data && data.length > 0) {
      const updated = mapRow(data[0]);
      setMerchants((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }
  };

  const deleteMerchant = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }
    const { error } = await supabase.from("merchants").delete().eq("id", id).eq("organization_id", profile.organizationId);
    if (error) {
      console.error("Error deleting merchant:", error);
      showError(`Failed to delete merchant: ${error.message}`);
      return;
    }
    setMerchants((prev) => prev.filter((m) => m.id !== id));
    showSuccess("Merchant deleted.");
  };

  return (
    <MerchantsContext.Provider value={{ merchants, isLoadingMerchants, refreshMerchants: fetchMerchants, addMerchant, updateMerchant, setMerchantPaymentStatus, deleteMerchant }}>
      {children}
    </MerchantsContext.Provider>
  );
};

export const useMerchants = () => {
  const context = useContext(MerchantsContext);
  if (context === undefined) throw new Error("useMerchants must be used within a MerchantsProvider");
  return context;
};

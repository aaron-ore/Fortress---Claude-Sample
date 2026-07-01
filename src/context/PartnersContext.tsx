import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export type PartnerType = "iso" | "isv";

export interface Partner {
  id: string;
  organizationId: string | null;
  name: string;
  partnerType: PartnerType;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export type NewPartner = Omit<Partner, "id" | "organizationId" | "createdAt">;

interface PartnersContextType {
  partners: Partner[];
  isLoadingPartners: boolean;
  refreshPartners: () => Promise<void>;
  addPartner: (partner: NewPartner) => Promise<Partner | null>;
  updatePartner: (partner: Partner) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
}

const PartnersContext = createContext<PartnersContextType | undefined>(undefined);

const mapRow = (p: any): Partner => ({
  id: p.id,
  organizationId: p.organization_id,
  name: p.name,
  partnerType: p.partner_type,
  contactName: p.contact_name || undefined,
  email: p.email || undefined,
  phone: p.phone || undefined,
  notes: p.notes || undefined,
  createdAt: p.created_at,
});

export const PartnersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const fetchPartners = useCallback(async () => {
    setIsLoadingPartners(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setPartners([]);
      setIsLoadingPartners(false);
      return;
    }
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("name", { ascending: true });
    if (error) {
      console.error("Error fetching partners:", error);
      showError("Failed to load partners.");
      setPartners([]);
    } else {
      setPartners((data || []).map(mapRow));
    }
    setIsLoadingPartners(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) fetchPartners();
  }, [fetchPartners, isLoadingProfile]);

  const addPartner = async (partner: NewPartner): Promise<Partner | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return null;
    }
    const { data, error } = await supabase
      .from("partners")
      .insert({
        name: partner.name,
        partner_type: partner.partnerType,
        contact_name: partner.contactName || null,
        email: partner.email || null,
        phone: partner.phone || null,
        notes: partner.notes || null,
        user_id: session.user.id,
        organization_id: profile.organizationId,
      })
      .select();
    if (error) {
      console.error("Error adding partner:", error);
      showError(`Failed to add partner: ${error.message}`);
      return null;
    }
    const created = mapRow(data[0]);
    setPartners((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    showSuccess(`Partner "${created.name}" added!`);
    return created;
  };

  const updatePartner = async (partner: Partner) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }
    const { data, error } = await supabase
      .from("partners")
      .update({
        name: partner.name,
        partner_type: partner.partnerType,
        contact_name: partner.contactName || null,
        email: partner.email || null,
        phone: partner.phone || null,
        notes: partner.notes || null,
      })
      .eq("id", partner.id)
      .eq("organization_id", profile.organizationId)
      .select();
    if (error) {
      console.error("Error updating partner:", error);
      showError(`Failed to update partner: ${error.message}`);
      return;
    }
    const updated = mapRow(data[0]);
    setPartners((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showSuccess(`Partner "${updated.name}" updated!`);
  };

  const deletePartner = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }
    const { error } = await supabase.from("partners").delete().eq("id", id).eq("organization_id", profile.organizationId);
    if (error) {
      console.error("Error deleting partner:", error);
      showError(`Failed to delete partner: ${error.message}`);
      return;
    }
    setPartners((prev) => prev.filter((p) => p.id !== id));
    showSuccess("Partner deleted.");
  };

  return (
    <PartnersContext.Provider value={{ partners, isLoadingPartners, refreshPartners: fetchPartners, addPartner, updatePartner, deletePartner }}>
      {children}
    </PartnersContext.Provider>
  );
};

export const usePartners = () => {
  const context = useContext(PartnersContext);
  if (context === undefined) throw new Error("usePartners must be used within a PartnersProvider");
  return context;
};

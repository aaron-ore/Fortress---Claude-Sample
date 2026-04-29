import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { logActivity } from "@/utils/logActivity";

export interface Customer {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  organizationId: string | null;
  createdAt: string;
}

interface CustomerContextType {
  customers: Customer[];
  isLoadingCustomers: boolean;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "organizationId">) => Promise<void>;
  updateCustomer: (updatedCustomer: Customer) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  refreshCustomers: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const fetchCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setCustomers([]);
      setIsLoadingCustomers(false);
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching customers:", error);
      showError("Failed to load customers.");
      await logActivity("Customer Fetch Failed", `Failed to load customers for organization ${profile.organizationId}.`, profile, { error_message: error.message }, true);
      setCustomers([]);
    } else {
      const fetchedCustomers: Customer[] = data.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contactPerson: customer.contact_person || undefined,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        address: customer.address || undefined,
        notes: customer.notes || undefined,
        organizationId: customer.organization_id,
        createdAt: customer.created_at,
      }));
      setCustomers(fetchedCustomers);
    }
    setIsLoadingCustomers(false);
  }, [profile?.organizationId, profile]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchCustomers();
    }
  }, [fetchCustomers, isLoadingProfile]);

  const addCustomer = async (customer: Omit<Customer, "id" | "createdAt" | "organizationId">) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required.";
      await logActivity("Add Customer Failed", errorMessage, profile, { customer_name: customer.name }, true);
      showError(errorMessage);
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: customer.name,
        contact_person: customer.contactPerson,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        user_id: session.user.id,
        organization_id: profile.organizationId,
      })
      .select();

    if (error) {
      console.error("Error adding customer:", error);
      await logActivity("Add Customer Failed", `Failed to add customer: ${customer.name}.`, profile, { error_message: error.message, customer_details: customer }, true);
      showError(`Failed to add customer: ${error.message}`);
    } else if (data && data.length > 0) {
      const newCustomer: Customer = {
        id: data[0].id,
        name: data[0].name,
        contactPerson: data[0].contact_person || undefined,
        email: data[0].email || undefined,
        phone: data[0].phone || undefined,
        address: data[0].address || undefined,
        notes: data[0].notes || undefined,
        organizationId: data[0].organization_id,
        createdAt: data[0].created_at,
      };
      setCustomers((prevCustomers) => [...prevCustomers, newCustomer]);
      showSuccess(`Customer "${customer.name}" added!`);
      await logActivity("Add Customer Success", `Added new customer: ${customer.name}.`, profile, { customer_id: data[0].id, customer_name: data[0].name });
    }
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required.";
      await logActivity("Update Customer Failed", errorMessage, profile, { customer_id: updatedCustomer.id, customer_name: updatedCustomer.name }, true);
      showError(errorMessage);
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: updatedCustomer.name,
        contact_person: updatedCustomer.contactPerson,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address,
        notes: updatedCustomer.notes,
      })
      .eq("id", updatedCustomer.id)
      .eq("organization_id", profile.organizationId)
      .select();

    if (error) {
      console.error("Error updating customer:", error);
      await logActivity("Update Customer Failed", `Failed to update customer: ${updatedCustomer.name} (ID: ${updatedCustomer.id}).`, profile, { error_message: error.message, customer_id: updatedCustomer.id, customer_name: updatedCustomer.name, updated_fields: updatedCustomer }, true);
      showError(`Failed to update customer: ${error.message}`);
    } else if (data && data.length > 0) {
      const updatedCustomerFromDB: Customer = {
        id: data[0].id,
        name: data[0].name,
        contactPerson: data[0].contact_person || undefined,
        email: data[0].email || undefined,
        phone: data[0].phone || undefined,
        address: data[0].address || undefined,
        notes: data[0].notes || undefined,
        organizationId: data[0].organization_id,
        createdAt: data[0].created_at,
      };
      setCustomers((prevCustomers) =>
        prevCustomers.map((customer) =>
          customer.id === updatedCustomerFromDB.id ? updatedCustomerFromDB : customer,
        ),
      );
      showSuccess(`Customer "${updatedCustomer.name}" updated!`);
      await logActivity("Update Customer Success", `Updated customer: ${updatedCustomer.name} (ID: ${updatedCustomer.id}).`, profile, { customer_id: updatedCustomer.id, customer_name: updatedCustomer.name, updated_fields: updatedCustomer });
    }
  };

  const deleteCustomer = async (customerId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required.";
      await logActivity("Delete Customer Failed", errorMessage, profile, { customer_id: customerId }, true);
      showError(errorMessage);
      return;
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error deleting customer:", error);
      await logActivity("Delete Customer Failed", `Failed to delete customer with ID: ${customerId}.`, profile, { error_message: error.message, customer_id: customerId }, true);
      showError(`Failed to delete customer: ${error.message}`);
    } else {
      setCustomers((prevCustomers) => prevCustomers.filter(customer => customer.id !== customerId));
      showSuccess("Customer deleted!");
      await logActivity("Delete Customer Success", `Deleted customer with ID: ${customerId}.`, profile, { customer_id: customerId });
    }
  };

  const refreshCustomers = async () => {
    await fetchCustomers();
  };

  return (
    <CustomerContext.Provider value={{ customers, isLoadingCustomers, addCustomer, updateCustomer, deleteCustomer, refreshCustomers }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error("useCustomers must be used within a CustomerProvider");
  }
  return context;
};
"use client";

import React,
{
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile, type UserProfile } from "./ProfileContext";
import { useOrders } from "./OrdersContext";
import { useVendors } from "./VendorContext";
import { processAutoReorder } from "@/utils/autoReorderLogic";
import { useNotifications } from "./NotificationContext";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { logActivity } from "@/utils/logActivity";
import { getPublicUrlFromSupabase } from "@/integrations/supabase/storage";


export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  pickingBinQuantity: number;
  overstockQuantity: number;
  quantity: number;
  reorderLevel: number;
  pickingReorderLevel: number;
  committedStock: number;
  incomingStock: number;
  unitCost: number;
  retailPrice: number;
  folderId: string;
  pickingBinFolderId: string;
  tags?: string[];
  notes?: string;
  status: string;
  lastUpdated: string;
  imageUrl: string | null | undefined; // Changed to explicitly include null and undefined
  vendorId?: string;
  barcodeUrl?: string;
  organizationId: string | null;
  autoReorderEnabled: boolean;
  autoReorderQuantity: number;
  createdAt: string; // Added createdAt
  shopifyProductId?: string; // NEW: Shopify Product ID
  shopifyVariantId?: string; // NEW: Shopify Shopify Variant ID
}

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  isLoadingInventory: boolean;
  addInventoryItem: (item: Omit<InventoryItem, "id" | "status" | "lastUpdated" | "organizationId" | "quantity" | "createdAt" | "imageUrl"> & { vendorId?: string; imageUrl: string | null | undefined }) => Promise<void>;
  updateInventoryItem: (updatedItem: Omit<InventoryItem, "quantity" | "createdAt" | "imageUrl"> & { id: string; imageUrl: string | null | undefined }) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  refreshInventory: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined,
);

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const { profile, isLoadingProfile } = useProfile();
  const { addOrder } = useOrders();
  const { vendors } = useVendors();
  const { addNotification } = useNotifications();

  const isInitialLoadComplete = useRef(false);
  const hasLoggedDisabledRef = useRef(false);

  const mapSupabaseItemToInventoryItem = (item: any): InventoryItem => {
    const pickingBinQuantity = parseInt(item.picking_bin_quantity || '0');
    const overstockQuantity = parseInt(item.overstock_quantity || '0');
    const reorderLevel = parseInt(item.reorder_level || '0');
    const pickingReorderLevel = parseInt(item.picking_reorder_level || '0');
    const committedStock = parseInt(item.committed_stock || '0');
    const incomingStock = parseInt(item.incoming_stock || '0');
    const unitCost = parseFloat(item.unit_cost || '0');
    const retailPrice = parseFloat(item.retail_price || '0');
    const autoReorderQuantity = parseInt(item.auto_reorder_quantity || '0');

    const validatedLastUpdated = parseAndValidateDate(item.last_updated);
    const lastUpdatedString = validatedLastUpdated ? validatedLastUpdated.toISOString() : new Date().toISOString();
    const validatedCreatedAt = parseAndValidateDate(item.created_at);
    const createdAtString = validatedCreatedAt ? validatedCreatedAt.toISOString() : new Date().toISOString();

    console.log(`[InventoryContext] mapSupabaseItemToInventoryItem: Processing item ID: ${item.id}, Raw image_url from DB: "${item.image_url}" (Type: ${typeof item.image_url})`);

    // NEW: Check if image_url is already a public URL before converting
    const finalImageUrl = item.image_url
      ? (item.image_url.startsWith('http') ? item.image_url : getPublicUrlFromSupabase(item.image_url, 'inventory-images'))
      : null;
    
    console.log(`[InventoryContext] mapSupabaseItemToInventoryItem: Final imageUrl for context: "${finalImageUrl}" (Type: ${typeof finalImageUrl})`);

    return {
      id: item.id,
      name: item.name || "",
      description: item.description || "",
      sku: item.sku || "",
      category: item.category || "",
      pickingBinQuantity: isNaN(pickingBinQuantity) ? 0 : pickingBinQuantity,
      overstockQuantity: isNaN(overstockQuantity) ? 0 : overstockQuantity,
      quantity: (isNaN(pickingBinQuantity) ? 0 : pickingBinQuantity) + (isNaN(overstockQuantity) ? 0 : overstockQuantity),
      reorderLevel: isNaN(reorderLevel) ? 0 : reorderLevel,
      pickingReorderLevel: isNaN(pickingReorderLevel) ? 0 : pickingReorderLevel,
      committedStock: isNaN(committedStock) ? 0 : committedStock,
      incomingStock: isNaN(incomingStock) ? 0 : incomingStock,
      unitCost: isNaN(unitCost) ? 0 : unitCost,
      retailPrice: isNaN(retailPrice) ? 0 : retailPrice,
      folderId: item.folder_id || "",
      pickingBinFolderId: item.picking_bin_folder_id || item.folder_id || "",
      tags: item.tags || undefined,
      notes: item.notes || undefined,
      status: item.status || "In Stock",
      lastUpdated: lastUpdatedString,
      imageUrl: finalImageUrl, // Use the intelligently determined URL
      vendorId: item.vendor_id || undefined,
      barcodeUrl: item.barcode_url || undefined,
      organizationId: item.organization_id,
      autoReorderEnabled: item.auto_reorder_enabled || false,
      autoReorderQuantity: isNaN(autoReorderQuantity) ? 0 : autoReorderQuantity,
      createdAt: createdAtString,
      shopifyProductId: item.shopify_product_id || undefined, // NEW: Map Shopify Product ID
      shopifyVariantId: item.shopify_variant_id || undefined, // NEW: Map Shopify Variant ID
    };
  };

  const fetchInventoryItems = useCallback(async (): Promise<InventoryItem[]> => {
    if (!isInitialLoadComplete.current) {
      setIsLoadingInventory(true);
    }
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !profile?.organizationId) {
      setInventoryItems([]);
      setIsLoadingInventory(false);
      isInitialLoadComplete.current = true;
      return [];
    }

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching inventory items:", error);
      setInventoryItems([]);
      showError("Failed to load inventory items.");
      await logActivity("Inventory Fetch Failed", `Failed to load inventory items for organization ${profile.organizationId}.`, profile, { error_message: error.message }, true);
      setIsLoadingInventory(false);
      isInitialLoadComplete.current = true;
      return [];
    } else {
      const fetchedItems: InventoryItem[] = data.map(mapSupabaseItemToInventoryItem);
      setInventoryItems(fetchedItems);
      setIsLoadingInventory(false);
      isInitialLoadComplete.current = true;
      return fetchedItems;
    }
  }, [profile]); // Changed dependency to just 'profile'

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchInventoryItems();
    } else if (!isLoadingProfile && !profile?.organizationId) {
      setInventoryItems([]);
      setIsLoadingInventory(false);
      isInitialLoadComplete.current = true;
    }
  }, [fetchInventoryItems, isLoadingProfile, profile?.organizationId]);

  useEffect(() => {
    if (!profile?.organizationId) return;

    console.log(`[InventoryContext] Subscribing to real-time changes for organization: ${profile.organizationId}`);

    const channel = supabase
      .channel(`inventory_items_org_${profile.organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `organization_id=eq.${profile.organizationId}`,
        },
        (payload) => {
          console.log('[InventoryContext] Realtime change received:', payload);
          setInventoryItems(prevItems => {
            const newItem = mapSupabaseItemToInventoryItem(payload.new || payload.old);
            switch (payload.eventType) {
              case 'INSERT':
                if (!prevItems.some(item => item.id === newItem.id)) {
                  return [...prevItems, newItem].sort((a, b) => a.name.localeCompare(b.name));
                }
                return prevItems;
              case 'UPDATE':
                return prevItems.map(item => item.id === newItem.id ? newItem : item).sort((a, b) => a.name.localeCompare(b.name));
              case 'DELETE':
                return prevItems.filter(item => item.id !== newItem.id).sort((a, b) => a.name.localeCompare(b.name));
              default:
                return prevItems;
            }
          });
        }
      )
      .subscribe();

    return () => {
      console.log(`[InventoryContext] Unsubscribing from real-time changes for organization: ${profile.organizationId}`);
      supabase.removeChannel(channel);
    };
  }, [profile?.organizationId]);

  useEffect(() => {
    const isAutoReorderGloballyEnabled = profile?.companyProfile?.enableAutoReorder || false; // Corrected typo here

    if (!isAutoReorderGloballyEnabled) {
      if (!hasLoggedDisabledRef.current) {
        console.log("[InventoryContext] Auto-reorder is globally disabled. Skipping auto-reorder check.");
        hasLoggedDisabledRef.current = true;
      }
      return;
    }

    hasLoggedDisabledRef.current = false;

    if (isInitialLoadComplete.current && profile?.organizationId && inventoryItems.length > 0) {
      console.log("[InventoryContext] Auto-reorder is globally enabled. Triggering check due to inventory/vendor/profile change.");
      processAutoReorder(inventoryItems, addOrder, vendors, profile as UserProfile, addNotification);
    }
  }, [inventoryItems, vendors, profile, addOrder, addNotification]);

  const addInventoryItem = async (item: Omit<InventoryItem, "id" | "status" | "lastUpdated" | "organizationId" | "quantity" | "createdAt" | "imageUrl"> & { vendorId?: string; imageUrl: string | null | undefined }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required to add items.";
      await logActivity("Add Inventory Item Failed", errorMessage, profile, { item_name: item.name, sku: item.sku }, true);
      showError(errorMessage);
      return;
    }

    const totalQuantity = item.pickingBinQuantity + item.overstockQuantity;
    const status = totalQuantity > item.reorderLevel ? "In Stock" : (totalQuantity > 0 ? "Low Stock" : "Out of Stock");
    const lastUpdated = new Date().toISOString().split('T')[0];
    const createdAt = new Date().toISOString();

    // item.imageUrl is expected to be the INTERNAL PATH from uploadFileToSupabase
    const internalImageUrl = item.imageUrl; 
    console.log("[InventoryContext] addInventoryItem: Image URL for DB (internal path):", internalImageUrl);

    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        name: item.name,
        description: item.description,
        sku: item.sku,
        category: item.category,
        picking_bin_quantity: item.pickingBinQuantity,
        overstock_quantity: item.overstockQuantity,
        quantity: totalQuantity, // Explicitly set total quantity
        reorder_level: item.reorderLevel,
        picking_reorder_level: item.pickingReorderLevel,
        committed_stock: 0,
        incoming_stock: 0,
        unit_cost: item.unitCost,
        retail_price: item.retailPrice,
        folder_id: item.folderId,
        picking_bin_folder_id: item.pickingBinFolderId,
        tags: item.tags,
        notes: item.notes,
        status: status,
        last_updated: lastUpdated,
        image_url: internalImageUrl, // Store internal path
        vendor_id: item.vendorId, // Corrected to item.vendorId
        barcode_url: item.barcodeUrl,
        user_id: session.user.id,
        organization_id: profile.organizationId,
        auto_reorder_enabled: item.autoReorderEnabled,
        auto_reorder_quantity: item.autoReorderQuantity,
        created_at: createdAt,
        shopify_product_id: item.shopifyProductId, // NEW: Insert Shopify Product ID
        shopify_variant_id: item.shopifyVariantId, // NEW: Insert Shopify Variant ID
      })
      .select();

    if (error) {
      console.error("Error adding inventory item:", error);
      await logActivity("Add Inventory Item Failed", `Failed to add inventory item: ${item.name} (SKU: ${item.sku}).`, profile, { error_message: error.message, item_details: item }, true);
      throw new Error(error.message || 'Failed to add item: Unknown error.');
    } else if (data && data.length > 0) {
      const newItem: InventoryItem = mapSupabaseItemToInventoryItem(data[0]);
      setInventoryItems((prevItems) => [...prevItems, newItem].sort((a, b) => a.name.localeCompare(b.name)));

      showSuccess(`Added new item: ${data[0].name}.`);
      await logActivity("Add Inventory Item Success", `Added new inventory item: ${data[0].name} (SKU: ${data[0].sku}).`, profile, { item_id: data[0].id, item_name: data[0].name, sku: data[0].sku });
    } else {
      const errorMessage = "Failed to add item: No data returned after insert.";
      console.error(errorMessage);
      await logActivity("Add Inventory Item Failed", errorMessage, profile, { item_name: item.name, sku: item.sku }, true);
      throw new Error(errorMessage);
    }
  };

  const updateInventoryItem = async (updatedItem: Omit<InventoryItem, "quantity" | "createdAt" | "imageUrl"> & { id: string; imageUrl: string | null | undefined }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required to update items.";
      await logActivity("Update Inventory Item Failed", errorMessage, profile, { item_id: updatedItem.id, item_name: updatedItem.name, sku: updatedItem.sku }, true);
      showError(errorMessage);
      return;
    }

    const totalQuantity = updatedItem.pickingBinQuantity + updatedItem.overstockQuantity;
    const newStatus = totalQuantity > updatedItem.reorderLevel ? "In Stock" : (totalQuantity > 0 ? "Low Stock" : "Out of Stock");
    const lastUpdated = new Date().toISOString().split('T')[0];

    // updatedItem.imageUrl is expected to be the INTERNAL PATH or null
    const internalImageUrl = updatedItem.imageUrl;
    console.log("[InventoryContext] updateInventoryItem: Image URL for DB (internal path):", internalImageUrl);

    const { data, error } = await supabase
      .from("inventory_items")
      .update({
        name: updatedItem.name,
        description: updatedItem.description,
        sku: updatedItem.sku,
        category: updatedItem.category,
        picking_bin_quantity: updatedItem.pickingBinQuantity,
        overstock_quantity: updatedItem.overstockQuantity,
        quantity: totalQuantity, // Explicitly set total quantity
        reorder_level: updatedItem.reorderLevel,
        picking_reorder_level: updatedItem.pickingReorderLevel,
        committed_stock: updatedItem.committedStock,
        incoming_stock: updatedItem.incomingStock,
        unit_cost: updatedItem.unitCost,
        retail_price: updatedItem.retailPrice,
        folder_id: updatedItem.folderId,
        picking_bin_folder_id: updatedItem.pickingBinFolderId,
        tags: updatedItem.tags,
        notes: updatedItem.notes,
        status: newStatus,
        last_updated: lastUpdated,
        image_url: internalImageUrl, // Store internal path
        vendor_id: updatedItem.vendorId,
        barcode_url: updatedItem.barcodeUrl,
        auto_reorder_enabled: updatedItem.autoReorderEnabled,
        auto_reorder_quantity: updatedItem.autoReorderQuantity,
        shopify_product_id: updatedItem.shopifyProductId, // NEW: Update Shopify Product ID
        shopify_variant_id: updatedItem.shopifyVariantId, // NEW: Update Shopify Variant ID
      })
      .eq("id", updatedItem.id)
      .eq("organization_id", profile.organizationId)
      .select();

    if (error) {
      console.error("Error updating inventory item:", error);
      await logActivity("Update Inventory Item Failed", `Failed to update inventory item: ${updatedItem.name} (SKU: ${updatedItem.sku}).`, profile, { error_message: error.message, item_id: updatedItem.id, item_name: updatedItem.name, sku: updatedItem.sku, updated_fields: updatedItem }, true);
      showError(`Failed to update item: ${error.message}`);
    } else if (data && data.length > 0) {
      showSuccess(`Item updated: ${data[0].name}.`);
      await logActivity("Update Inventory Item Success", `Updated inventory item: ${data[0].name} (SKU: ${data[0].sku}).`, profile, { item_id: data[0].id, item_name: data[0].name, sku: data[0].sku, updated_fields: updatedItem });
    } else {
      const errorMessage = "Update might not have been saved. Check database permissions.";
      console.error(errorMessage);
      await logActivity("Update Inventory Item Failed", errorMessage, profile, { item_id: updatedItem.id, item_name: updatedItem.name, sku: updatedItem.sku }, true);
      throw new Error(errorMessage);
    }
  };

  const deleteInventoryItem = async (itemId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required to delete items.";
      await logActivity("Delete Inventory Item Failed", errorMessage, profile, { item_id: itemId }, true);
      showError(errorMessage);
      return;
    }

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", itemId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error deleting inventory item:", error);
      await logActivity("Delete Inventory Item Failed", `Failed to delete inventory item with ID: ${itemId}.`, profile, { error_message: error.message, item_id: itemId }, true);
      showError(`Failed to delete item: ${error.message}`);
    } else {
      showSuccess("Item deleted!");
      await logActivity("Delete Inventory Item Success", `Deleted inventory item with ID: ${itemId}.`, profile, { item_id: itemId });
    }
  };

  const refreshInventory = async () => {
    await fetchInventoryItems();
  };

  return (
    <InventoryContext.Provider
      value={{ inventoryItems, isLoadingInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, refreshInventory }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
};
"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { generateSequentialNumber } from "@/utils/numberGenerator";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { logActivity } from "@/utils/logActivity";

export interface POItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  inventoryItemId?: string;
}

export interface OrderItem {
  id: string;
  type: "Sales" | "Purchase";
  customerSupplier: string;
  date: string;
  status: "New Order" | "Processing" | "Packed" | "Shipped" | "On Hold / Problem" | "Archived";
  totalAmount: number;
  dueDate: string;
  itemCount: number;
  notes: string;
  orderType: "Retail" | "Wholesale";
  shippingMethod: "Standard" | "Express";
  deliveryRoute?: string;
  items: POItem[];
  organizationId: string | null;
  terms?: string;
  putawayStatus?: "Pending" | "Completed" | "N/A" | null;
}

interface OrdersContextType {
  orders: OrderItem[];
  isLoadingOrders: boolean;
  updateOrder: (updatedOrder: OrderItem) => Promise<void>;
  addOrder: (newOrder: Omit<OrderItem, "id" | "organizationId"> & { id?: string }) => Promise<void>;
  archiveOrder: (orderId: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

const initialOrders: OrderItem[] = [];

export const OrdersProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const mapSupabaseOrderItemToOrderItem = (order: any): OrderItem => {
    const totalAmount = parseFloat(order.total_amount || '0');
    const itemCount = parseInt(order.item_count || '0');
    const items: POItem[] = (order.items || []).map((item: any) => ({
      id: item.id,
      itemName: item.itemName || "",
      quantity: parseInt(item.quantity || '0'),
      unitPrice: parseFloat(item.unitPrice || '0'),
      inventoryItemId: item.inventoryItemId || undefined,
    }));

    const validatedCreatedAt = parseAndValidateDate(order.created_at);
    const createdAtString = validatedCreatedAt ? validatedCreatedAt.toISOString() : new Date().toISOString();

    const validatedDueDate = parseAndValidateDate(order.due_date);
    const dueDateString = validatedDueDate ? validatedDueDate.toISOString() : new Date().toISOString();

    return {
      id: order.id || "",
      type: order.type || "Sales",
      customerSupplier: order.customer_supplier || "",
      date: createdAtString,
      status: order.status || "New Order",
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
      dueDate: dueDateString,
      itemCount: isNaN(itemCount) ? 0 : itemCount,
      notes: order.notes || "",
      orderType: order.order_type || "Retail",
      shippingMethod: order.shipping_method || "Standard",
      deliveryRoute: order.delivery_route || undefined,
      items: items,
      organizationId: order.organization_id,
      terms: order.terms || undefined,
      putawayStatus: order.putaway_status || undefined,
    };
  };

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setOrders([]);
      setIsLoadingOrders(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      showError("Failed to load orders.");
      await logActivity("Order Fetch Failed", `Failed to load orders for organization ${profile.organizationId}.`, profile, { error_message: error.message }, true);
      setOrders([]);
    } else {
      const fetchedOrders: OrderItem[] = data.map(mapSupabaseOrderItemToOrderItem);
      setOrders(fetchedOrders);
    }
    setIsLoadingOrders(false);
  }, [profile?.organizationId, profile]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchOrders();
    }
  }, [fetchOrders, isLoadingProfile]);

  const updateOrder = async (updatedOrder: OrderItem) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required.";
      await logActivity("Update Order Failed", errorMessage, profile, { order_id: updatedOrder.id, order_type: updatedOrder.type }, true);
      showError(errorMessage);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .update({
        type: updatedOrder.type,
        customer_supplier: updatedOrder.customerSupplier,
        status: updatedOrder.status,
        total_amount: updatedOrder.totalAmount,
        due_date: updatedOrder.dueDate,
        item_count: updatedOrder.itemCount,
        notes: updatedOrder.notes,
        order_type: updatedOrder.orderType,
        shipping_method: updatedOrder.shippingMethod,
        delivery_route: updatedOrder.deliveryRoute,
        items: updatedOrder.items,
        terms: updatedOrder.terms,
        putaway_status: updatedOrder.putawayStatus,
      })
      .eq("id", updatedOrder.id)
      .eq("organization_id", profile.organizationId)
      .select();

    if (error) {
      console.error("Error updating order:", error);
      await logActivity("Update Order Failed", `Failed to update order: ${updatedOrder.id}.`, profile, { error_message: error.message, order_details: updatedOrder }, true);
      showError(`Failed to update order: ${error.message}`);
    } else if (data && data.length > 0) {
      const addedOrder: OrderItem = mapSupabaseOrderItemToOrderItem(data[0]);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? addedOrder : order,
        ),
      );
      showSuccess(`Order ${updatedOrder.id} updated!`);
      await logActivity("Update Order Success", `Order ${updatedOrder.id} updated to status: ${updatedOrder.status}.`, profile, { order_id: updatedOrder.id, new_status: updatedOrder.status });
    }
  };

  const addOrder = async (newOrder: Omit<OrderItem, "id" | "organizationId"> & { id?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required.";
      await logActivity("Add Order Failed", errorMessage, profile, { order_type: newOrder.type, customer_supplier: newOrder.customerSupplier }, true);
      showError(errorMessage);
      return;
    }

    const finalOrderId = newOrder.id || generateSequentialNumber(newOrder.type === "Sales" ? "SO" : "PO");

    const { data, error } = await supabase
      .from("orders")
      .insert({
        id: finalOrderId,
        type: newOrder.type,
        customer_supplier: newOrder.customerSupplier,
        created_at: newOrder.date,
        status: "New Order",
        total_amount: newOrder.totalAmount,
        due_date: newOrder.dueDate,
        item_count: newOrder.itemCount,
        notes: newOrder.notes,
        order_type: newOrder.orderType,
        shipping_method: newOrder.shippingMethod,
        delivery_route: newOrder.deliveryRoute,
        items: newOrder.items,
        terms: newOrder.terms,
        user_id: session.user.id,
        organization_id: profile.organizationId,
        putaway_status: newOrder.type === "Purchase" ? "Pending" : null,
      })
      .select();

    if (error) {
      console.error("Error adding order:", error);
      await logActivity("Add Order Failed", `Failed to add new ${newOrder.type} order for ${newOrder.customerSupplier}.`, profile, { error_message: error.message, order_details: newOrder }, true);
      showError(`Failed to add order: ${error.message}`);
    } else if (data && data.length > 0) {
      const addedOrder: OrderItem = mapSupabaseOrderItemToOrderItem(data[0]);
      setOrders((prevOrders) => [...prevOrders, addedOrder]);
      showSuccess(`Order ${addedOrder.id} created!`);
      await logActivity("Add Order Success", `New ${addedOrder.type} order ${addedOrder.id} created for ${addedOrder.customerSupplier}.`, profile, { order_id: addedOrder.id, order_type: addedOrder.type, customer_supplier: addedOrder.customerSupplier });
    }
  };

  const archiveOrder = async (orderId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      const errorMessage = "Login/org ID required.";
      await logActivity("Archive Order Failed", errorMessage, profile, { order_id: orderId }, true);
      showError(errorMessage);
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "Archived" })
      .eq("id", orderId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error archiving order:", error);
      await logActivity("Archive Order Failed", `Failed to archive order: ${orderId}.`, profile, { error_message: error.message, order_id: orderId }, true);
      showError(`Failed to archive order: ${error.message}`);
    } else {
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: "Archived" } : order,
        ),
      );
      showSuccess(`Order ${orderId} archived.`);
      await logActivity("Archive Order Success", `Order ${orderId} archived.`, profile, { order_id: orderId });
    }
  };

  return (
    <OrdersContext.Provider value={{ orders, isLoadingOrders, updateOrder, addOrder, archiveOrder, fetchOrders }}>
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrdersProvider");
  }
  return context;
};
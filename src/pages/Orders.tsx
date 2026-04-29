"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PlusCircle, PackageCheck, PackagePlus, ChevronDown, Loader2, Plug, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useOrders } from "@/context/OrdersContext";
import { useProfile } from "@/context/ProfileContext";
import { showError, showSuccess } from "@/utils/toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import OrderFulfillmentDialog from "@/components/orders/OrderFulfillmentDialog";
import OrderReceiveShipmentDialog from "@/components/orders/OrderReceiveShipmentDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabaseClient";
import { createOrderColumns } from "@/components/orders/orders-table-columns";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardTitle } from "@/components/ui/card"; // Import Card components

const Orders: React.FC = () => {
  const { orders, fetchOrders, archiveOrder } = useOrders();
  const { profile, fetchProfile } = useProfile();
  const [searchTerm, setSearchTerm] = useState("");
  // Removed isAddOrderDialogOpen state
  const [activeTab, setActiveTab] = useState("all");

  const [isOrderFulfillmentDialogOpen, setIsOrderFulfillmentDialogOpen] = useState(false);
  const [isOrderReceiveShipmentDialogOpe, setIsOrderReceiveShipmentDialogOpe] = useState(false);
  const [isSyncingQuickBooks, setIsSyncingQuickBooks] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    let currentOrders = orders;

    if (activeTab === "sales") {
      currentOrders = currentOrders.filter(order => order.type === "Sales");
    } else if (activeTab === "purchase") {
      currentOrders = currentOrders.filter(order => order.type === "Purchase");
    } else if (activeTab === "archived") {
      currentOrders = currentOrders.filter(order => order.status === "Archived");
    } else {
      currentOrders = currentOrders.filter(order => order.status !== "Archived");
    }

    const searchFiltered = currentOrders.filter(order =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerSupplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return searchFiltered;
  }, [orders, searchTerm, activeTab]);

  // NEW: Role-based permissions
  const canViewOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';
  const canManageOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canArchiveOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canSyncQuickBooks = profile?.role === 'admin'; // Only admins can sync QuickBooks

  const columns = useMemo(() => createOrderColumns(archiveOrder, canArchiveOrders), [archiveOrder, canArchiveOrders]);

  const handleSyncSalesOrders = async () => {
    if (!canSyncQuickBooks) { // NEW: Check permission before syncing
      showError("No permission to sync QuickBooks.");
      return;
    }
    if (!profile?.quickbooksAccessToken || !profile?.quickbooksRealmId) {
      showError("QuickBooks not fully connected.");
      return;
    }
    setIsSyncingQuickBooks(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showError("Login required to sync QuickBooks.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-sales-orders-to-quickbooks', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      showSuccess(data.message || "Sales orders synced!");
      console.log("QuickBooks Sync Results:", data.results);
      await fetchProfile();
    } catch (error: any) {
      console.error("Error syncing sales orders to QuickBooks:", error);
      showError(`Failed to sync sales orders: ${error.message}`);
    } finally {
      setIsSyncingQuickBooks(false);
    }
  };

  const isQuickBooksConnected = profile?.quickbooksAccessToken && profile?.quickbooksRefreshToken && profile?.quickbooksRealmId;
  const isAdmin = profile?.role === 'admin';

  if (!canViewOrders) { // NEW: Check permission for viewing page
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to view orders.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6 flex-grow">
      <h1 className="text-3xl font-bold">Order Management</h1>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs flex-grow"
        />
        <div className="flex items-center gap-2">
          {canManageOrders && ( // NEW: Only show if user can manage orders
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Order Actions <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsOrderReceiveShipmentDialogOpe(true)}>
                  <PackagePlus className="h-4 w-4 mr-2" /> Receive Shipment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsOrderFulfillmentDialogOpen(true)}>
                  <PackageCheck className="h-4 w-4 mr-2" /> Fulfill Order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {isAdmin && isQuickBooksConnected && canSyncQuickBooks && ( // NEW: Check permission for QuickBooks sync
          <Button onClick={handleSyncSalesOrders} disabled={isSyncingQuickBooks}>
            {isSyncingQuickBooks ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...
              </>
            ) : (
              <>
                <Plug className="h-4 w-4 mr-2" /> Sync to QuickBooks
              </>
            )}
          </Button>
        )}

        {canManageOrders && ( // NEW: Only show if user can manage orders
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Order <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>New Order Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/create-invoice")}>
                <Receipt className="h-4 w-4 mr-2" /> Sales Order (Invoice)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/create-po")}>
                <PackagePlus className="h-4 w-4 mr-2" /> Purchase Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-grow">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Active Orders</TabsTrigger>
          <TabsTrigger value="sales">Sales Orders</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Orders</TabsTrigger>
          <TabsTrigger value="archived">Archived Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="flex-grow overflow-y-auto">
          <div className="h-full">
            <DataTable columns={columns} data={filteredOrders} />
          </div>
        </TabsContent>
        <TabsContent value="sales" className="flex-grow overflow-y-auto">
          <div className="h-full">
            <DataTable columns={columns} data={filteredOrders} />
          </div>
        </TabsContent>
        <TabsContent value="purchase" className="flex-grow overflow-y-auto">
          <div className="h-full">
            <DataTable columns={columns} data={filteredOrders} />
          </div>
        </TabsContent>
        <TabsContent value="archived" className="flex-grow overflow-y-auto">
          <div className="h-full">
            <DataTable columns={columns} data={filteredOrders} />
          </div>
        </TabsContent>
      </Tabs>

      <OrderFulfillmentDialog
        isOpen={isOrderFulfillmentDialogOpen}
        onClose={() => setIsOrderFulfillmentDialogOpen(false)}
      />
      <OrderReceiveShipmentDialog
        isOpen={isOrderReceiveShipmentDialogOpe}
        onClose={() => setIsOrderReceiveShipmentDialogOpe(false)}
      />
    </div>
  );
};

export default Orders;
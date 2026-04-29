"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import CreatePurchaseOrderPageContent from "@/components/orders/CreatePurchaseOrderPageContent"; // Import the new component
import { useProfile } from "@/context/ProfileContext";
import { Card, CardContent, CardTitle } from "@/components/ui/card"; // NEW: Import Card components

const CreatePurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useProfile(); // NEW: Get profile for role checks

  // NEW: Role-based permission
  const canManageOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  if (!canManageOrders) { // NEW: Check permission for viewing page
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to create purchase orders.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col flex-grow h-full p-6"> {/* Added p-6 for consistent page padding */}
      <h1 className="text-3xl font-bold flex-shrink-0">Create New Purchase Order</h1>
      <p className="text-muted-foreground flex-shrink-0">
        Fill in the details to create a new purchase order.
      </p>
      <CreatePurchaseOrderPageContent onClose={() => navigate("/orders")} />
    </div>
  );
};

export default CreatePurchaseOrder;
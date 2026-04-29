import React from "react";
import InventoryCard from "@/components/InventoryCard"; // Assuming this component exists and is suitable
import { InventoryItem } from "@/context/InventoryContext";
import { useProfile } from "@/context/ProfileContext";

interface InventoryCardGridProps {
  items: InventoryItem[];
  onAdjustStock: (item: InventoryItem) => void;
  onCreateOrder: (item: InventoryItem) => void;
  onViewDetails: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
  isSidebarCollapsed: boolean; // NEW: Add isSidebarCollapsed prop
}

const InventoryCardGrid: React.FC<InventoryCardGridProps> = ({
  items,
  onAdjustStock,
  onCreateOrder,
  onViewDetails,
  onDeleteItem,
  isSidebarCollapsed, // NEW: Destructure isSidebarCollapsed
}) => {
  const { profile } = useProfile(); // NEW: Get profile for role checks

  // NEW: Role-based permissions
  const canManageInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canDeleteInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  if (items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No inventory items found.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item: InventoryItem) => ( // Explicitly type item
        <InventoryCard
          key={item.id}
          item={item}
          onAdjustStock={onAdjustStock}
          onCreateOrder={onCreateOrder}
          onViewDetails={onViewDetails}
          onDeleteItem={onDeleteItem}
          isSidebarCollapsed={isSidebarCollapsed} // NEW: Pass isSidebarCollapsed
          canManageInventory={canManageInventory} // Pass to InventoryCard
          canDeleteInventory={canDeleteInventory} // Pass to InventoryCard
        />
      ))}
    </div>
  );
};

export default InventoryCardGrid;
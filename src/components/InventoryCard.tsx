import React from "react";
import { Package, Tag, MapPin, Eye, PlusCircle, MinusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryItem } from "@/context/InventoryContext";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "@/context/OnboardingContext"; // Now imports InventoryFolder
import { useNavigate } from "react-router-dom"; // Import useNavigate
// Removed: import { showError } from "@/utils/toast"; // Import showError

interface InventoryCardProps {
  item: InventoryItem;
  onAdjustStock: (item: InventoryItem) => void;
  onCreateOrder: (item: InventoryItem) => void;
  onViewDetails: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
  isSidebarCollapsed: boolean;
  canManageInventory: boolean; // NEW: Add canManageInventory prop
  canDeleteInventory: boolean; // NEW: Add canDeleteInventory prop
}

const InventoryCard: React.FC<InventoryCardProps> = ({
  item,
  onAdjustStock,
  onCreateOrder,
  onViewDetails,
  onDeleteItem,
  isSidebarCollapsed,
  canManageInventory, // NEW: Destructure canManageInventory
  canDeleteInventory, // NEW: Destructure canDeleteInventory
}) => {
  const { inventoryFolders } = useOnboarding(); // Renamed from locations
  const navigate = useNavigate(); // Initialize useNavigate

  let statusVariant: "success" | "warning" | "destructive" | "info" | "muted" = "info";
  switch (item.status) {
    case "In Stock":
      statusVariant = "success";
      break;
    case "Low Stock":
      statusVariant = "warning";
      break;
    case "Out of Stock":
      statusVariant = "destructive";
      break;
  }

  // Function to get folder display name
  const getFolderDisplayName = (folderId: string) => {
    const foundFolder = inventoryFolders.find(folder => folder.id === folderId);
    return foundFolder?.name || "Unknown Folder";
  };

  const handleFolderClick = (folderId: string) => {
    navigate(`/folders/${folderId}`);
  };

  return (
    <Card className="group relative bg-card border-border rounded-lg shadow-sm transition-all duration-200 hover:shadow-lg flex flex-col"> {/* Removed overflow-hidden and aspect-square */}
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="text-base font-semibold text-foreground truncate">
          {item.name}
        </CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-grow flex flex-col justify-between"> {/* Adjusted padding */}
        {isSidebarCollapsed && (
          <div className="flex items-center justify-center h-24 bg-muted/30 rounded-md mb-3 overflow-hidden flex-shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-muted-foreground text-sm text-center">No Image</span>
            )}
          </div>
        )}
        <div className="text-sm text-muted-foreground mb-2 flex-shrink-0">
          <p className="flex items-center gap-1">
            <Tag className="h-3 w-3" /> SKU: {item.sku}
          </p>
          <p className="flex items-center gap-1">
            <Button variant="link" className="p-0 h-auto text-left text-muted-foreground hover:text-primary" onClick={() => handleFolderClick(item.folderId)}>
              <MapPin className="h-3 w-3 mr-1" /> Folder: {getFolderDisplayName(item.folderId)} {/* Updated to folderId */}
            </Button>
          </p>
        </div>
        <div className="flex items-center justify-between mt-3 flex-shrink-0"> {/* Changed items-baseline to items-center */}
          <span className="text-3xl font-bold text-foreground">{item.quantity}</span> {/* Reduced font size */}
          <Badge variant={statusVariant} className="text-xs">
            {item.status}
          </Badge>
        </div>
      </CardContent>

      <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-6 space-y-3"> {/* Increased padding and space-y */}
        <Button className="w-full" onClick={() => onAdjustStock(item)} disabled={!canManageInventory}>
          <PlusCircle className="h-4 w-4 mr-2" /> Adjust Stock
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onCreateOrder(item)} disabled={!canManageInventory}>
          <MinusCircle className="h-4 w-4 mr-2" /> Create Order
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => onViewDetails(item)}>
          <Eye className="h-4 w-4 mr-2" /> View Details
        </Button>
        <Button variant="destructive" className="w-full" onClick={() => onDeleteItem(item.id, item.name)} disabled={!canDeleteInventory}>
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </Button>
      </div>
    </Card>
  );
};

export default InventoryCard;
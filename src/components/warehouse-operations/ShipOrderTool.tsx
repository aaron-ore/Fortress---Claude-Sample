"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Barcode, ShoppingCart, CheckCircle, Folder } from "lucide-react"; // Changed MapPin to Folder
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Import useOnboarding for folder names
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface PickedItemDisplay extends POItem {
  pickedQuantity: number;
  inventoryItemDetails?: InventoryItem;
}

interface ShipOrderToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const ShipOrderTool: React.FC<ShipOrderToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { orders, fetchOrders, updateOrder } = useOrders();
  const { inventoryItems, refreshInventory, updateInventoryItem } = useInventory();
  const { addStockMovement } = useStockMovement();
  const { inventoryFolders } = useOnboarding(); // Get inventory folders
  const { profile } = useProfile(); // NEW: Import useProfile

  // NEW: Role-based permissions
  const canShipOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [soNumberInput, setSoNumberInput] = useState("");
  const [selectedSO, setSelectedSO] = useState<OrderItem | null>(null);
  const [pickedItems, setPickedItems] = useState<PickedItemDisplay[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    setSelectedSO(null);
    setPickedItems([]);
  }, [soNumberInput]);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning) {
      if (selectedSO) {
        handleScannedBarcode(scannedDataFromGlobal);
      }
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, isScanning, onScannedDataProcessed, selectedSO]);

  // Helper to get folder name from ID
  const getFolderName = (folderId: string) => {
    const folder = inventoryFolders.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  const handleSoNumberSubmit = async () => {
    if (!canShipOrders) { // NEW: Check permission before submitting SO
      showError("No permission to ship orders.");
      return;
    }
    if (!soNumberInput.trim()) {
      showError("Enter Sales Order Number.");
      return;
    }

    await fetchOrders();

    const foundSO = orders.find(
      (order) => order.id.toLowerCase() === soNumberInput.trim().toLowerCase() && order.type === "Sales"
    );

    if (foundSO) {
      setSelectedSO(foundSO);
      const itemsWithDetails: PickedItemDisplay[] = foundSO.items.map((soItem) => {
        const inventoryItem = inventoryItems.find(inv => inv.id === soItem.inventoryItemId);
        return {
          ...soItem,
          pickedQuantity: 0,
          inventoryItemDetails: inventoryItem,
        };
      });
      setPickedItems(itemsWithDetails);
      showSuccess(`SO ${foundSO.id} loaded.`);
    } else {
      showError(`SO "${soNumberInput.trim()}" not found.`);
      setSelectedSO(null);
      setPickedItems([]);
    }
  };

  const handlePickedQuantityChange = (itemId: number, quantity: string) => {
    if (!canShipOrders) { // NEW: Check permission before changing quantity
      showError("No permission to ship orders.");
      return;
    }
    setPickedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, pickedQuantity: parseInt(quantity) || 0 } : item
      )
    );
  };

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    if (!canShipOrders) { // NEW: Check permission before scanning
      showError("No permission to ship orders.");
      return;
    }
    if (!selectedSO) {
      showError("Load SO before scanning items.");
      return;
    }

    const lowerCaseScannedData = scannedData.toLowerCase();
    const itemToPick = pickedItems.find(item => 
      item.inventoryItemDetails?.sku.toLowerCase() === lowerCaseScannedData ||
      item.inventoryItemDetails?.barcodeUrl?.toLowerCase().includes(lowerCaseScannedData)
    );

    if (itemToPick) {
      if (itemToPick.pickedQuantity < itemToPick.quantity) {
        setPickedItems(prev => prev.map(item =>
          item.id === itemToPick.id ? { ...item, pickedQuantity: item.pickedQuantity + 1 } : item
        ));
        showSuccess(`Scanned: ${itemToPick.itemName}.`);
      } else {
        showError(`${itemToPick.itemName} fully picked.`);
      }
    } else {
      showError(`Scanned item not in SO.`);
    }
  };

  const handleScanItemClick = () => {
    if (!canShipOrders) { // NEW: Check permission before scanning
      showError("No permission to ship orders.");
      return;
    }
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handleCompleteShipment = async () => {
    if (!canShipOrders) { // NEW: Check permission before completing shipment
      showError("No permission to ship orders.");
      return;
    }
    if (!selectedSO) {
      showError("No SO selected to complete.");
      return;
    }

    let allItemsPicked = true;
    let updatesSuccessful = true;

    for (const item of pickedItems) {
      if (item.pickedQuantity > 0) {
        const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId);
        if (inventoryItem) {
          if (inventoryItem.quantity < item.pickedQuantity) {
            showError(`Not enough stock for ${inventoryItem.name}.`);
            updatesSuccessful = false;
            break;
          }
          const oldQuantity = inventoryItem.quantity;
          const newQuantity = oldQuantity - item.pickedQuantity;
          const updatedInventoryItem = {
            ...inventoryItem,
            quantity: newQuantity,
            committedStock: Math.max(0, inventoryItem.committedStock - item.pickedQuantity),
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await updateInventoryItem(updatedInventoryItem);
          await addStockMovement({
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            type: "subtract",
            amount: item.pickedQuantity,
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            reason: `Fulfilled for SO ${selectedSO.id} (Mobile)`,
            folderId: inventoryItem.folderId, // Pass folderId
          });
        } else {
          showError(`Item for ${item.itemName} not found.`);
          updatesSuccessful = false;
        }
      }
      if (item.pickedQuantity < item.quantity) {
        allItemsPicked = false;
      }
    }

    if (updatesSuccessful) {
      const newStatus = allItemsPicked ? "Shipped" : "Packed";
      const updatedSO = { ...selectedSO, status: newStatus as OrderItem['status'] };
      await updateOrder(updatedSO);
      showSuccess(`Shipment for SO ${selectedSO.id} completed.`);
      refreshInventory();
      setSoNumberInput("");
      setSelectedSO(null);
      setPickedItems([]);
    } else {
      showError("Some items could not be updated.");
    }
  };

  const isCompleteButtonDisabled = !selectedSO || pickedItems.every(item => item.pickedQuantity === 0) || !canShipOrders; // NEW: Disable if no permission

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Ship Order</h2>

      <div className="space-y-4">
        <Label htmlFor="soNumber" className="text-lg font-semibold">Sales Order Number</Label>
        <div className="flex gap-2">
          <Input
            id="soNumber"
            placeholder="Enter SO Number"
            value={soNumberInput}
            onChange={(e) => setSoNumberInput(e.target.value)}
            className="flex-grow"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSoNumberSubmit();
              }
            }}
            disabled={!canShipOrders} // NEW: Disable input if no permission
          />
          <Button onClick={handleSoNumberSubmit} disabled={!soNumberInput.trim() || !canShipOrders}>Load SO</Button>
        </div>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleScanItemClick}
          disabled={isScanning || !canShipOrders} // NEW: Disable input if no permission
        >
          <Barcode className="h-6 w-6" />
          {isScanning ? "Scanning..." : "Scan Item"}
        </Button>
      </div>

      <div className="flex-grow space-y-4 overflow-hidden">
        {selectedSO ? (
          <>
            <h3 className="text-lg font-semibold">Items for SO: {selectedSO.id}</h3>
            <ScrollArea className="h-full max-h-[calc(100vh-400px)]">
              <div className="space-y-3 pr-2">
                {pickedItems.map((item) => (
                  <Card key={item.id} className="bg-card border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-lg">{item.itemName}</h4>
                        <span className="text-sm text-muted-foreground">SKU: {item.inventoryItemDetails?.sku}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1">
                        <Folder className="h-4 w-4" /> Folder: {getFolderName(item.inventoryItemDetails?.folderId || "")} {/* Display folder name */}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-muted-foreground text-sm">Required: {item.quantity}</p>
                        <Input
                          type="number"
                          value={item.pickedQuantity === 0 ? "" : item.pickedQuantity}
                          onChange={(e) => handlePickedQuantityChange(item.id, e.target.value)}
                          className="w-24 text-right"
                          min="0"
                          max={item.quantity}
                          disabled={!canShipOrders} // NEW: Disable input if no permission
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <ShoppingCart className="h-12 w-12 mb-4" />
            <p className="text-lg">Enter a SO number to begin shipping.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleCompleteShipment}
          disabled={isCompleteButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Complete Shipment
        </Button>
      </div>
    </div>
  );
};

export default ShipOrderTool;
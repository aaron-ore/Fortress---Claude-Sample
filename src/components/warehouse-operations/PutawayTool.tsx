"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package, Folder, ListOrdered, Scan } from "lucide-react"; // Changed MapPin to Folder
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now imports InventoryFolder
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface PutawayItemDisplay extends POItem {
  inventoryItemDetails?: InventoryItem;
  suggestedPutawayFolderId: string; // Changed from suggestedPutawayLocation to suggestedPutawayFolderId
  isPutAway: boolean;
}

interface PutawayToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const PutawayTool: React.FC<PutawayToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { orders, updateOrder } = useOrders();
  const { inventoryItems, refreshInventory, updateInventoryItem } = useInventory();
  const { addStockMovement } = useStockMovement();
  const { inventoryFolders } = useOnboarding(); // Renamed from structuredLocations
  const { profile } = useProfile(); // NEW: Import useProfile

  // NEW: Role-based permissions
  const canPutaway = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [poNumberInput, setPoNumberInput] = useState("");
  const [selectedPO, setSelectedPO] = useState<OrderItem | null>(null);
  const [itemsToPutAway, setItemsToPutAway] = useState<PutawayItemDisplay[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanMode, setCurrentScanMode] = useState<"po" | "folder" | "item">("po"); // Changed from location to folder
  const [scannedFolderId, setScannedFolderId] = useState<string | null>(null); // State to hold the scanned folder ID

  const receivedPOs = useMemo(() => {
    return orders.filter(order => order.type === "Purchase" && order.putawayStatus === "Pending");
  }, [orders]);

  useEffect(() => {
    // Reset state when component mounts or PO input changes
    setSelectedPO(null);
    setItemsToPutAway([]);
    setScannedFolderId(null);
    setCurrentScanMode("po");
  }, [poNumberInput]);

  useEffect(() => {
    if (scannedDataFromGlobal) {
      handleScannedData(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, onScannedDataProcessed]);

  // Helper to get folder name from ID
  const getFolderName = (folderId: string) => {
    const folder = inventoryFolders.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  const handleScannedData = (scannedData: string) => {
    setIsScanning(false);
    if (!canPutaway) { // NEW: Check permission before processing scanned data
      showError("No permission to use Putaway.");
      return;
    }
    const lowerCaseScannedData = scannedData.toLowerCase();

    if (currentScanMode === "po") {
      const foundPO = receivedPOs.find(po => po.id.toLowerCase() === lowerCaseScannedData);
      if (foundPO) {
        handlePoSelect(foundPO.id);
        showSuccess(`PO ${foundPO.id} loaded. Scan folder.`); // Updated text
        setCurrentScanMode("folder"); // Next step is to scan folder
      } else {
        showError(`PO "${scannedData}" not found.`); // Updated text
      }
    } else if (currentScanMode === "folder") { // Changed from location to folder
      const foundFolder = inventoryFolders.find(folder => folder.name.toLowerCase() === lowerCaseScannedData); // Find folder by name
      if (foundFolder) {
        setScannedFolderId(foundFolder.id); // Set folderId
        showSuccess(`Folder ${foundFolder.name} scanned. Scan item.`); // Updated text
        setCurrentScanMode("item");
      } else {
        showError(`Folder "${scannedData}" not recognized.`); // Updated text
      }
    } else if (currentScanMode === "item") {
      if (!selectedPO || !scannedFolderId) {
        showError("Load PO and scan folder first."); // Updated text
        return;
      }

      const itemToPutAway = itemsToPutAway.find(item =>
        !item.isPutAway && (
          item.inventoryItemDetails?.sku.toLowerCase() === lowerCaseScannedData ||
          (item.inventoryItemDetails?.barcodeUrl && item.inventoryItemDetails.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
        )
      );

      if (itemToPutAway) {
        // Check if the scanned folder matches the suggested folder for this item
        if (itemToPutAway.suggestedPutawayFolderId === scannedFolderId) {
          confirmPutaway(itemToPutAway);
        } else {
          // Allow override, but warn
          showError(`Item suggested for ${getFolderName(itemToPutAway.suggestedPutawayFolderId)}, scanned ${getFolderName(scannedFolderId)}. Confirm to override.`); // Updated text
          // For now, we'll just confirm, but a real system might ask for explicit confirmation
          confirmPutaway(itemToPutAway);
        }
      } else {
        showError(`Scanned item not in PO.`);
      }
    }
  };

  const handleScanClick = (_mode: "po" | "folder" | "item") => { // Changed from location to folder
    if (!canPutaway) { // NEW: Check permission before scanning
      showError("No permission to use Putaway.");
      return;
    }
    setIsScanning(true);
    onScanRequest(handleScannedData);
  };

  const handlePoSelect = async (orderId: string) => {
    if (!canPutaway) { // NEW: Check permission before selecting PO
      showError("No permission to use Putaway.");
      return;
    }
    const foundPO = orders.find(
      (order) => order.id === orderId && order.type === "Purchase" && order.putawayStatus === "Pending"
    );

    if (foundPO) {
      setSelectedPO(foundPO);
      const itemsWithDetails: PutawayItemDisplay[] = foundPO.items.map((poItem) => {
        const inventoryItem = inventoryItems.find(inv => inv.id === poItem.inventoryItemId);
        return {
          ...poItem,
          inventoryItemDetails: inventoryItem,
          suggestedPutawayFolderId: inventoryItem ? getSuggestedPutawayFolderId(inventoryItem.category) : "Unassigned", // Use item's current folderId as suggested
          isPutAway: false,
        };
      });
      setItemsToPutAway(itemsWithDetails);
      showSuccess(`PO ${foundPO.id} loaded. Ready for putaway.`);
      setCurrentScanMode("folder"); // Next step is to scan folder
    } else {
      showError(`PO "${orderId}" not found.`);
      setSelectedPO(null);
      setItemsToPutAway([]);
      setCurrentScanMode("po");
    }
  };

  const confirmPutaway = async (itemToPutAway: PutawayItemDisplay) => {
    if (!canPutaway) { // NEW: Check permission before confirming putaway
      showError("No permission to use Putaway.");
      return;
    }
    if (!selectedPO || !scannedFolderId || !itemToPutAway.inventoryItemDetails) {
      showError("Missing data for putaway.");
      return;
    }

    const inventoryItem = itemToPutAway.inventoryItemDetails;
    const newFolderId = scannedFolderId;

    // Update inventory item's folderId
    const updatedInventoryItem = {
      ...inventoryItem,
      folderId: newFolderId,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    await updateInventoryItem(updatedInventoryItem);

    // Log stock movement
    await addStockMovement({
      itemId: inventoryItem.id,
      itemName: inventoryItem.name,
      type: "add", // Conceptually, it's being added to a new specific folder
      amount: itemToPutAway.quantity,
      oldQuantity: inventoryItem.quantity, // Total quantity before this putaway
      newQuantity: inventoryItem.quantity, // Total quantity remains same, only folder changes
      reason: `Putaway from PO ${selectedPO.id} to ${getFolderName(newFolderId)}`, // Use folder name
      folderId: newFolderId, // Log the destination folder
    });

    setItemsToPutAway(prev => prev.map(item =>
      item.id === itemToPutAway.id ? { ...item, isPutAway: true } : item
    ));
    showSuccess(`Put away ${itemToPutAway.itemName} to ${getFolderName(newFolderId)}.`); // Use folder name

    // Check if all items from the PO are put away
    const allItemsPutAway = itemsToPutAway.every(item => item.isPutAway || item.id === itemToPutAway.id);
    if (allItemsPutAway) {
      await updateOrder({ ...selectedPO, putawayStatus: "Completed" });
      showSuccess(`All items from PO ${selectedPO.id} put away!`);
      setSelectedPO(null);
      setItemsToPutAway([]);
      setScannedFolderId(null);
      setPoNumberInput("");
      setCurrentScanMode("po");
    }
    refreshInventory();
  };

  // Helper to get folder display name
  const getSuggestedPutawayFolderId = (itemCategory: string): string => {
    if (inventoryFolders.length === 0) return "Unassigned";

    const mainWarehouse = inventoryFolders.find(folder => folder.name === "Main Warehouse");
    const coldStorage = inventoryFolders.find(folder => folder.name === "Cold Storage");
    const storeFront = inventoryFolders.find(folder => folder.name === "Store Front");

    if (itemCategory === "Electronics" && mainWarehouse) return mainWarehouse.id;
    if (itemCategory === "Office Supplies" && storeFront) return storeFront.id;
    if (itemCategory === "Perishables" && coldStorage) return coldStorage.id;

    return inventoryFolders[Math.floor(Math.random() * inventoryFolders.length)].id;
  };

  const isCompleteButtonDisabled = !selectedPO || itemsToPutAway.some(item => !item.isPutAway) || !canPutaway; // NEW: Disable if no permission

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Putaway Inventory</h2>

      <div className="space-y-4">
        <Label htmlFor="poSelect" className="text-lg font-semibold">Select Purchase Order</Label>
        <div className="flex gap-2">
          <Select value={selectedPO?.id || ""} onValueChange={handlePoSelect} disabled={isScanning || !canPutaway}> {/* NEW: Disable if no permission */}
            <SelectTrigger id="poSelect">
              <SelectValue placeholder="Select a received PO" />
            </SelectTrigger>
            <SelectContent>
              {receivedPOs.length > 0 ? (
                receivedPOs.map(po => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.id} - {po.customerSupplier} (Due: {po.dueDate})
                  </SelectItem>
                ))
              ) : (
                  <SelectItem value="no-pos" disabled>No POs ready for putaway</SelectItem>
                )}
            </SelectContent>
          </Select>
          <Button onClick={() => handleScanClick("po")} disabled={isScanning || !canPutaway}> {/* NEW: Disable if no permission */}
            <Scan className="h-4 w-4 mr-2" /> Scan PO
          </Button>
        </div>
      </div>

      {selectedPO && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">PO: {selectedPO.id} - {selectedPO.customerSupplier}</h3>
          <div className="flex gap-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
              onClick={() => handleScanClick("folder")} // Changed to folder
              disabled={isScanning || !canPutaway} // NEW: Disable if no permission
            >
              <Folder className="h-6 w-6" /> {/* Updated icon */}
              {isScanning && currentScanMode === "folder" ? "Scanning Folder..." : "Scan Folder"} {/* Updated text */}
            </Button>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
              onClick={() => handleScanClick("item")}
              disabled={isScanning || !scannedFolderId || !canPutaway} // NEW: Disable if no permission
            >
              <Package className="h-6 w-6" />
              {isScanning && currentScanMode === "item" ? "Scanning Item..." : "Scan Item"}
            </Button>
          </div>
          {scannedFolderId && (
            <p className="text-sm text-muted-foreground text-center">
              Current Putaway Folder: <span className="font-semibold text-primary">{getFolderName(scannedFolderId)}</span> {/* Updated to folder name */}
            </p>
          )}
        </div>
      )}

      <div className="flex-grow space-y-4 overflow-hidden">
        {selectedPO ? (
          <>
            <h3 className="text-lg font-semibold">Items to Put Away</h3>
            <ScrollArea className="h-full max-h-[calc(100vh-400px)]">
              <div className="space-y-3 pr-2">
                {itemsToPutAway.map((item) => (
                  <Card key={item.id} className="bg-card border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-lg">{item.itemName}</h4>
                        <span className="text-sm text-muted-foreground">SKU: {item.inventoryItemDetails?.sku}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1">
                        <Folder className="h-4 w-4" /> Suggested: <span className="font-semibold text-primary">{getFolderName(item.suggestedPutawayFolderId)}</span> {/* Updated to folder name */}
                      </p>
                      {item.isPutAway ? (
                        <div className="flex items-center text-green-500 font-semibold mt-2">
                          <CheckCircle className="h-5 w-5 mr-2" /> Put Away!
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => confirmPutaway(item)}
                          disabled={!scannedFolderId || !canPutaway} // NEW: Disable if no permission
                        >
                          Confirm Putaway to {scannedFolderId ? getFolderName(scannedFolderId) : "Scanned Folder"} {/* Updated to folder name */}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <ListOrdered className="h-12 w-12 mb-4" />
            <p className="text-lg">Select a received PO to begin putaway.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={() => {
            setSelectedPO(null);
            setItemsToPutAway([]);
            setScannedFolderId(null);
            setPoNumberInput("");
            setCurrentScanMode("po");
            showSuccess("Putaway session cleared.");
          }}
          disabled={isCompleteButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Complete Putaway Session
        </Button>
      </div>
    </div>
  );
};

export default PutawayTool;
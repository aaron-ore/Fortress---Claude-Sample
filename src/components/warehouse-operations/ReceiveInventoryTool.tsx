"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Barcode, CheckCircle, Package, Folder, Printer } from "lucide-react"; // Changed MapPin to Folder
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Updated to inventoryFolders and addInventoryFolder
import { usePrint } from "@/context/PrintContext";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import { format } from "date-fns";
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface ReceivedItemDisplay extends POItem {
  receivedQuantity: number;
  inventoryItemDetails?: InventoryItem;
  suggestedPutawayFolderId: string; // Changed from suggestedPutawayLocation to suggestedPutawayFolderId
  lotNumber?: string;
  expirationDate?: string;
  serialNumber?: string; // Added for future use
}

interface ReceiveInventoryToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void; // Added this prop
}

const ReceiveInventoryTool: React.FC<ReceiveInventoryToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { orders, fetchOrders, updateOrder } = useOrders();
  const { inventoryItems, refreshInventory, updateInventoryItem } = useInventory();
  const { addStockMovement } = useStockMovement();
  const { inventoryFolders } = useOnboarding(); // Updated to inventoryFolders and addInventoryFolder
  const { initiatePrint } = usePrint();
  const { profile } = useProfile(); // NEW: Import useProfile

  // NEW: Role-based permissions
  const canReceiveInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [poNumberInput, setPoNumberInput] = useState("");
  const [selectedPO, setSelectedPO] = useState<OrderItem | null>(null);
  const [receivedItems, setReceivedItems] = useState<ReceivedItemDisplay[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const availableFolders = useMemo(() => inventoryFolders.filter(folder => folder.name !== "Returns Area"), [inventoryFolders]); // Filter out Returns Area

  useEffect(() => {
    setSelectedPO(null);
    setReceivedItems([]);
  }, [poNumberInput]);

  useEffect(() => {
    if (scannedDataFromGlobal) {
      if (!selectedPO) {
        setPoNumberInput(scannedDataFromGlobal);
        handlePoNumberSubmit(scannedDataFromGlobal);
      } else {
        handleScannedBarcode(scannedDataFromGlobal);
      }
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, selectedPO, onScannedDataProcessed]);

  // Helper to get folder name from ID
  const getFolderName = (folderId: string) => {
    const folder = inventoryFolders.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  const getSuggestedPutawayFolderId = (itemCategory: string): string => {
    if (availableFolders.length === 0) return "Unassigned";

    // Find folder objects by name
    const mainWarehouse = availableFolders.find(folder => folder.name === "Main Warehouse");
    const coldStorage = availableFolders.find(folder => folder.name === "Cold Storage");
    const storeFront = availableFolders.find(folder => folder.name === "Store Front");

    if (itemCategory === "Electronics" && mainWarehouse) return mainWarehouse.id;
    if (itemCategory === "Office Supplies" && storeFront) return storeFront.id;
    if (itemCategory === "Perishables" && coldStorage) return coldStorage.id;

    // Fallback to a random available folder's ID
    return availableFolders[Math.floor(Math.random() * availableFolders.length)].id;
  };

  const handlePoNumberSubmit = async (poNum?: string) => {
    if (!canReceiveInventory) { // NEW: Check permission before submitting PO
      showError("No permission to receive inventory.");
      return;
    }
    const currentPoNum = poNum || poNumberInput.trim();
    if (!currentPoNum) {
      showError("Enter PO Number.");
      return;
    }

    await fetchOrders();

    const foundPO = orders.find(
      (order) => order.id.toLowerCase() === currentPoNum.toLowerCase() && order.type === "Purchase"
    );

    if (foundPO) {
      setSelectedPO(foundPO);
      const itemsWithDetails: ReceivedItemDisplay[] = foundPO.items.map((poItem) => {
        const inventoryItem = inventoryItems.find(inv => inv.id === poItem.inventoryItemId);
        return {
          ...poItem,
          receivedQuantity: 0,
          inventoryItemDetails: inventoryItem,
          suggestedPutawayFolderId: inventoryItem ? getSuggestedPutawayFolderId(inventoryItem.category) : "Unassigned", // Updated to folderId
          lotNumber: undefined,
          expirationDate: undefined,
          serialNumber: undefined,
        };
      });
      setReceivedItems(itemsWithDetails);
      showSuccess(`PO ${foundPO.id} loaded.`);
    } else {
      showError(`PO "${currentPoNum}" not found.`);
      setSelectedPO(null);
      setReceivedItems([]);
    }
  };

  const handleReceivedQuantityChange = (itemId: number, quantity: string) => {
    if (!canReceiveInventory) { // NEW: Check permission before changing quantity
      showError("No permission to receive inventory.");
      return;
    }
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, receivedQuantity: parseInt(quantity || '0') } : item
      )
    );
  };

  const handleLotNumberChange = (itemId: number, lot: string) => {
    if (!canReceiveInventory) { // NEW: Check permission before changing lot number
      showError("No permission to receive inventory.");
      return;
    }
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, lotNumber: lot } : item
      )
    );
  };

  const handleExpirationDateChange = (itemId: number, date: string) => {
    if (!canReceiveInventory) { // NEW: Check permission before changing expiration date
      showError("No permission to receive inventory.");
      return;
    }
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, expirationDate: date } : item
      )
    );
  };

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    if (!canReceiveInventory) { // NEW: Check permission before scanning
      showError("No permission to receive inventory.");
      return;
    }
    if (!selectedPO) {
      showError("Load PO before scanning items.");
      return;
    }

    const lowerCaseScannedData = scannedData.toLowerCase();
    const itemToReceive = receivedItems.find(item =>
      item.inventoryItemDetails?.sku.toLowerCase() === lowerCaseScannedData ||
      item.inventoryItemDetails?.barcodeUrl && item.inventoryItemDetails.barcodeUrl.toLowerCase().includes(lowerCaseScannedData)
    );

    if (itemToReceive) {
      if (itemToReceive.receivedQuantity < itemToReceive.quantity) {
        setReceivedItems(prev => prev.map(item =>
          item.id === itemToReceive.id ? { ...item, receivedQuantity: item.receivedQuantity + 1 } : item
        ));
        showSuccess(`Scanned: ${itemToReceive.itemName}.`);
      } else {
        showError(`${itemToReceive.itemName} fully received.`);
      }
    } else {
      showError(`Scanned item not in PO.`);
    }
  };

  const handleScanClick = () => {
    if (!canReceiveInventory) { // NEW: Check permission before scanning
      showError("No permission to receive inventory.");
      return;
    }
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handlePrintPutawayLabel = async (item: ReceivedItemDisplay) => {
    if (!canReceiveInventory) { // NEW: Check permission before printing label
      showError("No permission to print labels.");
      return;
    }
    if (!item.inventoryItemDetails || !item.suggestedPutawayFolderId) {
      showError("Missing item/folder details.");
      return;
    }

    try {
      const qrCodeValue = JSON.stringify({
        sku: item.inventoryItemDetails.sku,
        qty: item.receivedQuantity,
        folder: getFolderName(item.suggestedPutawayFolderId), // Use folder name
        lot: item.lotNumber,
        exp: item.expirationDate,
        sn: item.serialNumber,
      });
      const qrCodeSvg = await generateQrCodeSvg(qrCodeValue, 128);

      const labelProps = {
        itemName: item.itemName,
        itemSku: item.inventoryItemDetails.sku,
        receivedQuantity: item.receivedQuantity,
        suggestedLocation: getFolderName(item.suggestedPutawayFolderId), // Use folder name
        lotNumber: item.lotNumber,
        expirationDate: item.expirationDate,
        serialNumber: item.serialNumber,
        qrCodeSvg: qrCodeSvg,
        printDate: format(new Date(), "MMM dd, yyyy HH:mm"),
        structuredLocations: inventoryFolders, // Pass inventoryFolders
      };

      initiatePrint({ type: "putaway-label", props: labelProps });
      showSuccess(`Label for ${item.itemName} sent.`);
    } catch (error: any) {
      showError(`Failed to generate/print label: ${error.message}`);
    }
  };

  const handleCompleteReceive = async () => {
    if (!canReceiveInventory) { // NEW: Check permission before completing receive
      showError("No permission to complete receiving.");
      return;
    }
    if (!selectedPO) {
      showError("No PO selected to complete.");
      return;
    }

    let updatesSuccessful = true;

    for (const item of receivedItems) {
      if (item.receivedQuantity > 0) {
        const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId);
        if (inventoryItem) {
          const oldQuantity = inventoryItem.quantity;
          const newQuantity = oldQuantity + item.receivedQuantity;
          const updatedInventoryItem = {
            ...inventoryItem,
            quantity: newQuantity,
            incomingStock: Math.max(0, inventoryItem.incomingStock - item.receivedQuantity),
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await updateInventoryItem(updatedInventoryItem);
          await addStockMovement({
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            type: "add",
            amount: item.receivedQuantity,
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            reason: `Received from PO ${selectedPO.id} (Mobile)`,
            folderId: inventoryItem.folderId, // Pass folderId
          });
        } else {
          showError(`Item for ${item.itemName} not found.`);
          updatesSuccessful = false;
        }
      }
    }

    if (updatesSuccessful) {
      // Update PO status (e.g., to 'Shipped' or 'Partially Received')
      const updatedPO = {
        ...selectedPO,
        status: "Shipped" as OrderItem['status'],
        putawayStatus: "Pending" as OrderItem['putawayStatus'],
        notes: selectedPO.notes
      };
      await updateOrder(updatedPO);
      showSuccess(`PO ${selectedPO.id} received!`);
      refreshInventory();
      setPoNumberInput("");
      setSelectedPO(null);
      setReceivedItems([]);
    } else {
      showError("Some items could not be updated.");
    }
  };

  const isCompleteButtonDisabled = !selectedPO || receivedItems.every(item => item.receivedQuantity === 0) || !canReceiveInventory; // NEW: Disable if no permission

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Receive Inventory</h2>

      <div className="space-y-4">
        <Label htmlFor="poNumber" className="text-lg font-semibold">Purchase Order Number</Label>
        <div className="flex gap-2">
          <Input
            id="poNumber"
            placeholder="Enter PO Number"
            value={poNumberInput}
            onChange={(e) => setPoNumberInput(e.target.value)}
            className="flex-grow"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePoNumberSubmit();
              }
            }}
            disabled={!canReceiveInventory} // NEW: Disable input if no permission
          />
          <Button onClick={() => handlePoNumberSubmit()} disabled={!poNumberInput.trim() || !canReceiveInventory}>Load PO</Button>
        </div>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleScanClick}
          disabled={isScanning || !canReceiveInventory} // NEW: Disable input if no permission
        >
          <Barcode className="h-6 w-6" />
          {isScanning ? "Scanning..." : "Scan Item"}
        </Button>
      </div>

      <div className="flex-grow space-y-4 overflow-hidden">
        {selectedPO ? (
          <>
            <h3 className="text-lg font-semibold">Items for PO: {selectedPO.id}</h3>
            <ScrollArea className="h-full max-h-[calc(100vh-400px)]">
              <div className="space-y-3 pr-2">
                {receivedItems.map((item) => (
                  <Card key={item.id} className="bg-card border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-lg">{item.itemName}</h4>
                        <span className="text-sm text-muted-foreground">SKU: {item.inventoryItemDetails?.sku}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1">
                        <Folder className="h-4 w-4" /> Suggested Putaway: {getFolderName(item.suggestedPutawayFolderId) || "N/A"} {/* Updated to folder name */}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-muted-foreground text-sm">Expected: {item.quantity}</p>
                        <Input
                          type="number"
                          value={item.receivedQuantity === 0 ? "" : item.receivedQuantity}
                          onChange={(e) => handleReceivedQuantityChange(item.id, e.target.value)}
                          className="w-24 text-right"
                          min="0"
                          max={item.quantity}
                          disabled={!canReceiveInventory} // NEW: Disable input if no permission
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-1">
                          <Label htmlFor={`lot-${item.id}`} className="text-xs">Lot # (Optional)</Label>
                          <Input
                            id={`lot-${item.id}`}
                            value={item.lotNumber || ""}
                            onChange={(e) => handleLotNumberChange(item.id, e.target.value)}
                            placeholder="Lot number"
                            className="h-8 text-xs"
                            disabled={!canReceiveInventory} // NEW: Disable input if no permission
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`exp-${item.id}`} className="text-xs">Exp. Date (Optional)</Label>
                          <Input
                            id={`exp-${item.id}`}
                            type="date"
                            value={item.expirationDate || ""}
                            onChange={(e) => handleExpirationDateChange(item.id, e.target.value)}
                            className="h-8 text-xs"
                            disabled={!canReceiveInventory} // NEW: Disable input if no permission
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => handlePrintPutawayLabel(item)}
                        disabled={item.receivedQuantity === 0 || !item.suggestedPutawayFolderId || !canReceiveInventory} // NEW: Disable button if no permission
                      >
                        <Printer className="h-4 w-4 mr-2" /> Print Putaway Label
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <Package className="h-12 w-12 mb-4" />
            <p className="text-lg">Enter a Purchase Order number to begin receiving.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleCompleteReceive}
          disabled={isCompleteButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Complete Receiving
        </Button>
      </div>
    </div>
  );
};

export default ReceiveInventoryTool;
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Undo2, Scan, Package, Folder, CheckCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useProfile } from "@/context/ProfileContext";

interface ReturnsProcessingToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const ReturnsProcessingTool: React.FC<ReturnsProcessingToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { inventoryFolders, addInventoryFolder } = useOnboarding();
  const { addStockMovement } = useStockMovement();
  const { profile } = useProfile();

  const canProcessReturns = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnDestinationFolderId, setReturnDestinationFolderId] = useState("");
  const [notes, setNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const returnReasons = ["Damaged", "Customer Return (Resalable)", "Customer Return (Defective)", "Wrong Item Shipped", "Other"];

  useEffect(() => {
    const returnsAreaName = "Returns Area";
    const existingReturnsArea = inventoryFolders.find(folder => folder.name === returnsAreaName);
    if (!existingReturnsArea) {
      addInventoryFolder({
        name: returnsAreaName,
        color: "#F44336",
      });
    }
  }, [inventoryFolders, addInventoryFolder]);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning) {
      handleScannedBarcode(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, isScanning, onScannedDataProcessed]);

  const getFolderName = (folderId: string | undefined) => {
    if (!folderId) return "N/A";
    const folder = inventoryFolders.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    if (!canProcessReturns) {
      showError("No permission to process returns.");
      return;
    }
    const lowerCaseScannedData = scannedData.toLowerCase();
    const foundItem = inventoryItems.find(
      (item) =>
        item.sku.toLowerCase() === lowerCaseScannedData ||
        (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
    );

    if (foundItem) {
      setScannedItem(foundItem);
      setReturnQuantity("1");
      setReturnDestinationFolderId(foundItem.folderId);
      showSuccess(`Scanned: ${foundItem.name}.`);
    } else {
      showError(`Item not found.`);
    }
  };

  const handleScanClick = () => {
    if (!canProcessReturns) {
      showError("No permission to process returns.");
      return;
    }
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handleProcessReturn = async () => {
    if (!canProcessReturns) {
      showError("No permission to process returns.");
      return;
    }
    if (!scannedItem || !returnQuantity || !returnReason || !returnDestinationFolderId) {
      showError("Scan item and fill details.");
      return;
    }

    const quantity = parseInt(returnQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      showError("Enter valid positive quantity.");
      return;
    }

    const oldQuantity = scannedItem.quantity;
    let newPickingBinQuantity = scannedItem.pickingBinQuantity;
    let newOverstockQuantity = scannedItem.overstockQuantity;

    const returnsAreaFolder = inventoryFolders.find(folder => folder.name === "Returns Area");
    const returnsAreaFolderId = returnsAreaFolder?.id;

    if (returnDestinationFolderId === scannedItem.folderId) {
      newPickingBinQuantity += quantity;
    } else if (returnsAreaFolderId && returnDestinationFolderId === returnsAreaFolderId) {
      newOverstockQuantity += quantity;
    } else {
      newOverstockQuantity += quantity;
    }

    const updatedItem = {
      ...scannedItem,
      pickingBinQuantity: newPickingBinQuantity,
      overstockQuantity: newOverstockQuantity,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    await updateInventoryItem(updatedItem);

    await addStockMovement({
      itemId: scannedItem.id,
      itemName: scannedItem.name,
      type: "add",
      amount: quantity,
      oldQuantity: oldQuantity,
      newQuantity: newPickingBinQuantity + newOverstockQuantity,
      reason: `Return: ${returnReason} to ${getFolderName(returnDestinationFolderId)}`,
      folderId: returnDestinationFolderId,
    });

    await refreshInventory();
    showSuccess(`Processed ${quantity} units.`);

    setScannedItem(null);
    setReturnQuantity("");
    setReturnReason("");
    setReturnDestinationFolderId("");
    setNotes("");
  };

  const isProcessButtonDisabled = !scannedItem || !returnQuantity || !returnReason || !returnDestinationFolderId || parseInt(returnQuantity) <= 0 || !canProcessReturns;

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Returns Processing</h2>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary" /> Scan Returned Item
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
            onClick={handleScanClick}
            disabled={isScanning || !canProcessReturns}
          >
            <Scan className="h-6 w-6" />
            {isScanning ? "Scanning..." : "Scan Item Barcode"}
          </Button>
          {scannedItem && (
            <div className="space-y-2">
              <Label className="font-semibold">Scanned Item</Label>
              <p className="text-sm text-foreground">{scannedItem.name} (SKU: {scannedItem.sku})</p>
              <p className="text-xs text-muted-foreground">Current Stock: {scannedItem.quantity} units</p>
            </div>
          )}
        </CardContent>
      </Card>

      {scannedItem && (
        <Card className="bg-card border-border shadow-sm flex-grow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" /> Return Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-grow flex flex-col">
            <div className="space-y-2">
              <Label htmlFor="returnQuantity">Quantity to Return</Label>
              <Input
                id="returnQuantity"
                type="number"
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(e.target.value)}
                placeholder="e.g., 1"
                min="1"
                disabled={!canProcessReturns}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnReason">Reason for Return</Label>
              <Select value={returnReason} onValueChange={(value) => {
                setReturnReason(value);
                const returnsAreaFolder = inventoryFolders.find(folder => folder.name === "Returns Area");
                const returnsAreaFolderId = returnsAreaFolder?.id;
                if (value.includes("Damaged") || value.includes("Defective")) {
                  setReturnDestinationFolderId(returnsAreaFolderId || "");
                } else {
                  setReturnDestinationFolderId(scannedItem.folderId);
                }
              }} disabled={!canProcessReturns}>
                <SelectTrigger id="returnReason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {returnReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnDestinationFolderId">Direct to Folder</Label>
              <Select value={returnDestinationFolderId} onValueChange={setReturnDestinationFolderId} disabled={!canProcessReturns}>
                <SelectTrigger id="returnDestinationFolderId">
                  <SelectValue placeholder="Select destination folder" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Folder className="h-3 w-3" /> Suggested: {returnReason.includes("Damaged") || returnReason.includes("Defective") ? "Returns Area" : getFolderName(scannedItem.folderId)}
              </p>
            </div>
            <div className="space-y-2 flex-grow">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this return..."
                rows={3}
                className="flex-grow"
                disabled={!canProcessReturns}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleProcessReturn}
          disabled={isProcessButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Process Return
        </Button>
      </div>
    </div>
  );
};

export default ReturnsProcessingTool;
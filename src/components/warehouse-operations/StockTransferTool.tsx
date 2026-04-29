import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck, Package, ArrowRight, Barcode } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "@/context/ProfileContext";

interface StockTransferToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const StockTransferTool: React.FC<StockTransferToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { inventoryFolders } = useOnboarding();
  const { addStockMovement } = useStockMovement();
  const { profile } = useProfile();

  const canTransferStock = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [fromFolderId, setFromFolderId] = useState("");
  const [toFolderId, setToFolderId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const selectedItem = useMemo(() => {
    return inventoryItems.find(item => item.id === selectedItemId);
  }, [inventoryItems, selectedItemId]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return inventoryItems;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.sku.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [inventoryItems, searchTerm]);

  const getFolderName = (folderId: string) => {
    const folder = inventoryFolders.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  useEffect(() => {
    if (selectedItem) {
      setFromFolderId(selectedItem.folderId);
      setTransferQuantity("");
      setNotes("");
      setToFolderId("");
    } else {
      setFromFolderId("");
      setTransferQuantity("");
      setNotes("");
      setToFolderId("");
    }
  }, [selectedItem]);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning) {
      handleScannedBarcode(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, isScanning, onScannedDataProcessed]);

  const handleItemSelect = (itemId: string) => {
    if (!canTransferStock) {
      showError("No permission to transfer stock.");
      return;
    }
    setSelectedItemId(itemId);
    setSearchTerm(inventoryItems.find(item => item.id === itemId)?.name || "");
  };

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    if (!canTransferStock) {
      showError("No permission to transfer stock.");
      return;
    }
    const lowerCaseScannedData = scannedData.toLowerCase();
    const foundItem = inventoryItems.find(
      (item) =>
        item.sku.toLowerCase() === lowerCaseScannedData ||
        (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
    );

    if (foundItem) {
      handleItemSelect(foundItem.id);
      showSuccess(`Scanned item: ${foundItem.name}.`);
    } else {
      showError(`No item found with SKU/Barcode.`);
    }
  };

  const handleScanClick = () => {
    if (!canTransferStock) {
      showError("No permission to transfer stock.");
      return;
    }
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handleSubmitTransfer = async () => {
    if (!canTransferStock) {
      showError("No permission to transfer stock.");
      return;
    }
    if (!selectedItem || !fromFolderId || !toFolderId || !transferQuantity) {
      showError("Fill all required fields.");
      return;
    }
    if (fromFolderId === toFolderId) {
      showError("Source and destination folders cannot be the same.");
      return;
    }

    const quantity = parseInt(transferQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      showError("Enter valid positive quantity.");
      return;
    }
    if (!selectedItem) {
      showError("Selected item not found.");
      return;
    }
    if (selectedItem.quantity < quantity) {
      showError(`Not enough stock at ${getFolderName(fromFolderId)}.`);
      return;
    }

    const oldQuantity = selectedItem.quantity;
    const newQuantity = selectedItem.quantity - quantity;
    const updatedItem = {
      ...selectedItem,
      quantity: newQuantity,
      folderId: toFolderId,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    try {
      await updateInventoryItem(updatedItem);

      await addStockMovement({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        type: "subtract",
        amount: quantity,
        oldQuantity: oldQuantity,
        newQuantity: newQuantity,
        reason: `Transferred from ${getFolderName(fromFolderId)} to ${getFolderName(toFolderId)}`,
        folderId: fromFolderId,
      });

      showSuccess(`Transferred ${quantity} units of ${selectedItem.name}.`);
      refreshInventory();
      setSearchTerm("");
      setSelectedItemId("");
      setFromFolderId("");
      setToFolderId("");
      setTransferQuantity("");
      setNotes("");
    } catch (error: any) {
      showError(`Failed to transfer stock: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Stock Transfer</h2>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Select Item
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Label htmlFor="itemSearch" className="font-semibold">Search Item</Label>
          <Input
            id="itemSearch"
            placeholder="Name or SKU"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={!canTransferStock}
          />
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
            onClick={handleScanClick}
            disabled={isScanning || !canTransferStock}
          >
            <Barcode className="h-6 w-6" />
            {isScanning ? "Scanning..." : "Scan Item"}
          </Button>
          <ScrollArea className="h-32 border border-border rounded-md">
            <div className="p-2 space-y-1">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <Button
                    key={item.id}
                    variant={selectedItemId === item.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm"
                    onClick={() => handleItemSelect(item.id)}
                    disabled={!canTransferStock}
                  >
                    {item.name} (SKU: {item.sku}) - Qty: {item.quantity}
                  </Button>
                ))
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">No items found.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedItem && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-accent" /> Transfer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromFolderId" className="font-semibold">From Folder</Label>
              <Input id="fromFolderId" value={getFolderName(fromFolderId)} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toFolderId">To Folder</Label>
              <Select value={toFolderId} onValueChange={setToFolderId} disabled={!canTransferStock}>
                <SelectTrigger id="toFolderId">
                  <SelectValue placeholder="Select destination folder" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryFolders.filter(folder => folder.id !== fromFolderId).map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferQuantity" className="font-semibold">Quantity to Transfer</Label>
              <Input
                id="transferQuantity"
                type="number"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                placeholder="e.g., 50"
                min="1"
                max={selectedItem.quantity}
                disabled={!canTransferStock}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-semibold">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this transfer..."
                rows={2}
                disabled={!canTransferStock}
              />
            </div>
            <Button onClick={handleSubmitTransfer} className="w-full" disabled={!selectedItem || !toFolderId || !transferQuantity || fromFolderId === toFolderId || !canTransferStock}>
              <ArrowRight className="h-4 w-4 mr-2" /> Confirm Transfer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockTransferTool;
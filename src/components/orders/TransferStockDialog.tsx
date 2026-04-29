import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now imports InventoryFolder
import { useStockMovement } from "@/context/StockMovementContext";
import { Truck } from "lucide-react";

interface TransferStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferStockDialog: React.FC<TransferStockDialogProps> = ({ isOpen, onClose }) => {
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { inventoryFolders } = useOnboarding(); // Updated to inventoryFolders
  const { addStockMovement } = useStockMovement();

  const [selectedItemId, setSelectedItemId] = useState("");
  const [fromFolderId, setFromFolderId] = useState(""); // Changed from fromLocation to fromFolderId
  const [toFolderId, setToFolderId] = useState(""); // Changed from toLocation to toFolderId
  const [transferQuantity, setTransferQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const selectedItem = useMemo(() => {
    return inventoryItems.find(item => item.id === selectedItemId);
  }, [inventoryItems, selectedItemId]);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedItemId("");
      setFromFolderId("");
      setToFolderId("");
      setTransferQuantity("");
      setNotes("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (selectedItem) {
      setFromFolderId(selectedItem.folderId); // Use item's current folderId
    } else {
      setFromFolderId("");
    }
  }, [selectedItem]);

  const handleSubmit = async () => {
    if (!selectedItemId || !fromFolderId || !toFolderId || !transferQuantity) {
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
    const newQuantity = selectedItem.quantity - quantity; // Deduct from source
    const updatedItem = {
      ...selectedItem,
      quantity: newQuantity, // Update quantity at the source (conceptually, the item is moving)
      folderId: toFolderId, // Update the item's primary folder to the destination
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    await updateInventoryItem(updatedItem);

    // Log stock movement for the transfer
    await addStockMovement({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: "subtract", // Log as subtract from old folder
      amount: quantity,
      oldQuantity: oldQuantity,
      newQuantity: newQuantity,
      reason: `Transferred from ${getFolderName(fromFolderId)} to ${getFolderName(toFolderId)}`,
      folderId: fromFolderId, // Log the folder from which it was transferred
    });

    // For a full transfer, you might also need to add to the destination folder's stock.
    // In this simplified model, we're just moving the item's folder and updating its quantity.
    // If items were truly separate entities per folder, this would be more complex.

    showSuccess(`Transferred ${quantity} units of ${selectedItem.name}.`);
    refreshInventory(); // Ensure inventory context is refreshed
    onClose();
  };

  // Helper to get folder name from ID
  const getFolderName = (folderId: string) => {
    const folder = inventoryFolders.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Transfer Stock
          </DialogTitle>
          <DialogDescription>
            Move inventory items between different storage folders.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemSelect">Select Item</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger id="itemSelect">
                <SelectValue placeholder="Select an inventory item" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (SKU: {item.sku}) - Qty: {item.quantity}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-items" disabled>No inventory items available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromFolderId">From Folder</Label>
                  <Input id="fromFolderId" value={getFolderName(fromFolderId)} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toFolderId">To Folder</Label>
                  <Select value={toFolderId} onValueChange={setToFolderId}>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferQuantity">Quantity to Transfer</Label>
                <Input
                  id="transferQuantity"
                  type="number"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  placeholder="e.g., 50"
                  min="1"
                  max={selectedItem.quantity}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this transfer..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedItemId || !fromFolderId || !toFolderId || !transferQuantity || fromFolderId === toFolderId}>
            Transfer Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferStockDialog;
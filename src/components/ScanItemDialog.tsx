import React, { useState } from "react";
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
import { showSuccess, showError } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";
import { useProfile } from "@/context/ProfileContext";

interface ScanItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScanItemDialog: React.FC<ScanItemDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { inventoryItems } = useInventory();
  const { profile } = useProfile(); // NEW: Get profile for role checks

  // NEW: Role-based permissions
  const canUseTools = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [barcode, setBarcode] = useState("");

  const handleScan = () => {
    if (!canUseTools) { // NEW: Check permission before scanning
      showError("No permission to scan items.");
      return;
    }
    if (!barcode) {
      showError("Enter barcode or SKU.");
      return;
    }

    const foundItem = inventoryItems.find(
      (item) => item.sku === barcode || item.id === barcode,
    );

    if (foundItem) {
      showSuccess(`Item found: ${foundItem.name}.`);
      // In a real application, you might navigate to the item's edit page or show its details
    } else {
      showError(`No item found.`);
    }

    setBarcode(""); // Clear input after scan attempt
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Scan Item</DialogTitle>
          <DialogDescription>
            Enter the barcode or SKU of the item to quickly look it up.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="barcode" className="text-right">
              Barcode/SKU
            </Label>
            <Input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="col-span-3"
              placeholder="Enter barcode or SKU"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleScan();
                }
              }}
              disabled={!canUseTools} // NEW: Disable input if no permission
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleScan} disabled={!canUseTools}>Scan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScanItemDialog;
import React, { useState, useEffect } from "react";
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
import { Wallet } from "lucide-react";

interface EditTotalWalletBalanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTotalBalance: number; // Now represents total wallet value
  currentStockValue: number; // New prop for current inventory stock value
  onSave: (newTotalBalance: number, stockValue: number) => void; // Updated signature
}

const EditTotalWalletBalanceDialog: React.FC<EditTotalWalletBalanceDialogProps> = ({
  isOpen,
  onClose,
  currentTotalBalance,
  currentStockValue,
  onSave,
}) => {
  const [totalBalanceInput, setTotalBalanceInput] = useState(String(currentTotalBalance));

  useEffect(() => {
    if (isOpen) {
      setTotalBalanceInput(String(currentTotalBalance));
    }
  }, [isOpen, currentTotalBalance]);

  const handleSave = () => {
    const newTotalBalance = parseFloat(totalBalanceInput);
    if (isNaN(newTotalBalance) || newTotalBalance < 0) {
      showError("Enter valid non-negative number.");
      return;
    }
    onSave(newTotalBalance, currentStockValue); // Pass stock value for calculation in parent
    showSuccess("Wallet balance updated!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Edit Total Wallet Balance
          </DialogTitle>
          <DialogDescription>
            Adjust the total value of your wallet (cash + inventory stock value).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="totalBalance">Total Wallet Balance</Label>
            <Input
              id="totalBalance"
              type="number"
              value={totalBalanceInput}
              onChange={(e) => setTotalBalanceInput(e.target.value)}
              placeholder="e.g., 1500000000"
              step="0.01"
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTotalWalletBalanceDialog;
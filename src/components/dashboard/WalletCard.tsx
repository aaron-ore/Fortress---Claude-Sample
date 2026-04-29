import React, { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Settings, Edit, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import EditTotalWalletBalanceDialog from "./EditWalletBalanceDialog"; // Updated import name

interface WalletCardProps {
  totalStockValue: number;
}

const WalletCard: React.FC<WalletCardProps> = ({ totalStockValue }) => {
  const navigate = useNavigate();

  const initialSimulatedCashBalance = 0;

  const [editableCashBalance, setEditableCashBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedBalance = localStorage.getItem("fortress_cash_balance");
      return storedBalance ? parseFloat(storedBalance) : initialSimulatedCashBalance;
    }
    return initialSimulatedCashBalance;
  });

  const [isEditBalanceDialogOpen, setIsEditBalanceDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("fortress_cash_balance", String(editableCashBalance));
    }
  }, [editableCashBalance]);

  const totalWalletValue = totalStockValue + editableCashBalance;

  const handleEdit = () => {
    setIsEditBalanceDialogOpen(true);
  };

  const handleSaveTotalBalance = (newTotalBalance: number, stockValue: number) => {
    const newCashBalance = newTotalBalance - stockValue;
    setEditableCashBalance(Math.max(0, newCashBalance)); // Ensure cash balance doesn't go negative
  };

  const handleSettings = () => {
    navigate("/account-settings");
    showSuccess("Navigating to Account Settings.");
  };

  return (
    <>
      <Card className="bg-card border-border rounded-lg shadow-sm flex h-[74px] p-0 overflow-hidden">
        <div className="flex-1 flex flex-col justify-center p-2">
          <div className="flex items-center gap-2 mb-0">
            <Wallet className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">Wallet</CardTitle>
          </div>
          <p className="text-xl font-bold text-foreground">
            ${totalWalletValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex flex-col justify-center items-center bg-blue-500/80 p-1 space-y-1">
          <Button variant="ghost" size="icon" onClick={handleEdit} className="h-6 w-6 text-white hover:bg-white/20">
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSettings} className="h-6 w-6 text-white hover:bg-white/20">
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </Card>

      <EditTotalWalletBalanceDialog
        isOpen={isEditBalanceDialogOpen}
        onClose={() => setIsEditBalanceDialogOpen(false)}
        currentTotalBalance={totalWalletValue} // Pass total wallet value
        currentStockValue={totalStockValue} // Pass total stock value
        onSave={handleSaveTotalBalance}
      />
    </>
  );
};

export default WalletCard;
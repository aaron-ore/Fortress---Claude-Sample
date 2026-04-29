import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface InventoryTurnoverRateCardProps {
  inventoryTurnoverRate: string;
}

const InventoryTurnoverRateCard: React.FC<InventoryTurnoverRateCardProps> = ({ inventoryTurnoverRate }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-center text-foreground">Inventory Turnover Rate</CardTitle>
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-center p-4 pt-0 flex flex-col justify-between h-full">
        <div className="text-2xl font-bold">{inventoryTurnoverRate}</div>
        <p className="text-xs text-muted-foreground mt-1">Times inventory was sold and replaced in a period.</p>
        <p className="text-xs text-muted-foreground mt-1">Higher is generally better, indicating efficient sales.</p>
      </CardContent>
    </Card>
  );
};

export default InventoryTurnoverRateCard;
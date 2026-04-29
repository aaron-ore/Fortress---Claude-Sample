import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { InventoryItem } from "@/context/InventoryContext";

interface SlowMovingDeadstockCardProps {
  slowMovingItems: InventoryItem[];
}

const SlowMovingDeadstockCard: React.FC<SlowMovingDeadstockCardProps> = ({ slowMovingItems }) => {
  const handleCreatePromotion = (item: string) => {
    showSuccess(`Creating promotion for ${item}.`);
  };

  const handleBundleItems = (item: string) => {
    showSuccess(`Bundling ${item}.`);
  };

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Slow-Moving / Deadstock Items</CardTitle>
        <Archive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col justify-between h-full">
        {slowMovingItems.length > 0 ? (
          <ul className="text-sm space-y-2">
            {slowMovingItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>{item.name}</span>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleCreatePromotion(item.name)}>Promotion</Button>
                  <Button variant="outline" size="sm" onClick={() => handleBundleItems(item.name)}>Bundle</Button>
                </div>
              </li>
            ))}
            {slowMovingItems.length > 0 && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                These items have not moved in a while.
              </p>
            )}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">No slow-moving or deadstock items detected. Great!</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SlowMovingDeadstockCard;
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  color: string;
  label: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, color, label }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground w-6 text-right">{label}</span>
    <Progress value={value} className="h-2 flex-grow" style={{ '--progress-background': color } as React.CSSProperties} />
  </div>
);

interface LiveMetricsCardProps {
  lowStockItemsCount: number;
  ordersDueTodayCount: number;
  incomingShipmentsCount: number;
  recentAdjustmentsCount: number;
  totalInventoryItems: number;
  totalOrders: number;
  totalVendors: number;
  totalStockMovements: number;
}

const LiveMetricsCard: React.FC<LiveMetricsCardProps> = ({
  lowStockItemsCount,
  ordersDueTodayCount,
  incomingShipmentsCount,
  recentAdjustmentsCount,
  totalInventoryItems,
  totalOrders,
  totalVendors,
  totalStockMovements,
}) => {
  const allCounts = [lowStockItemsCount, ordersDueTodayCount, incomingShipmentsCount, recentAdjustmentsCount];
  const maxCount = Math.max(...allCounts, 1);

  const barData = [
    { label: lowStockItemsCount, value: (lowStockItemsCount / maxCount) * 100, color: "hsl(var(--primary))" },
    { label: ordersDueTodayCount, value: (ordersDueTodayCount / maxCount) * 100, color: "hsl(var(--accent))" },
    { label: incomingShipmentsCount, value: (incomingShipmentsCount / maxCount) * 100, color: "hsl(var(--secondary))" },
    { label: recentAdjustmentsCount, value: (recentAdjustmentsCount / maxCount) * 100, color: "hsl(var(--muted))" },
  ];

  const buttonData = [
    { value: totalInventoryItems, label: "Items", variant: "default" as const },
    { value: totalOrders, label: "Orders", variant: "secondary" as const },
    { value: totalVendors, label: "Vendors", variant: "outline" as const },
    { value: totalStockMovements, label: "Adjustments", variant: "ghost" as const },
  ];

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Key Operational Metrics</CardTitle>
        <p className="text-sm text-muted-foreground">Real-time snapshot of key activities</p>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 p-4 pt-0 flex flex-col justify-between">
        <div className="space-y-2">
          {barData.map((bar, index) => (
            <ProgressBar key={index} value={bar.value} color={bar.color} label={String(bar.label)} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {buttonData.map((btn, index) => (
            <div key={index} className="flex flex-col items-center">
              <Button
                variant={btn.variant}
                className={cn("h-8 w-full text-xs font-bold")}
              >
                {btn.value}
              </Button>
              <span className="text-xs text-muted-foreground mt-1">{btn.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMetricsCard;
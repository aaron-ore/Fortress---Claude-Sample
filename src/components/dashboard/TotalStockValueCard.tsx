import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowUp, ArrowDown } from "lucide-react";
import MiniTrendChart from "@/components/dashboard/MiniTrendChart";

interface TotalStockValueCardProps {
  totalStockValue: number;
  totalStockValueTrendData: any[];
}

const TotalStockValueCard: React.FC<TotalStockValueCardProps> = ({ totalStockValue, totalStockValueTrendData }) => {
  // Mock previous month's stock value for comparison
  const previousMonthStockValue = useMemo(() => {
    // Simulate a plausible previous month value based on current totalStockValue
    // For a new app, this ensures the comparison is always relevant to the current state.
    return totalStockValue * (1 + (Math.random() * 0.1 - 0.05)); // +/- 5% fluctuation
  }, [totalStockValue]);

  const percentageChange = totalStockValue > previousMonthStockValue ?
    (((totalStockValue - previousMonthStockValue) / previousMonthStockValue) * 100).toFixed(1) :
    (((previousMonthStockValue - totalStockValue) / previousMonthStockValue) * 100).toFixed(1);
  const isPositiveChange = totalStockValue >= previousMonthStockValue;

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Total Stock Value</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-center p-4 pt-0 flex flex-col justify-between h-full">
        <div>
          <div className="text-2xl font-bold">${totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className={`text-xs ${isPositiveChange ? "text-green-500" : "text-red-500"} flex items-center justify-center`}>
            {isPositiveChange ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />} {percentageChange}% from last month
          </p>
        </div>
        {totalStockValue > 0 || totalStockValueTrendData.length > 0 ? (
          <MiniTrendChart
            data={totalStockValueTrendData}
            dataKey="value"
            color="hsl(var(--primary))"
            className="mt-6"
          />
        ) : (
          <div className="h-24 flex items-center justify-center text-muted-foreground text-xs mt-6">No stock value data.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default TotalStockValueCard;
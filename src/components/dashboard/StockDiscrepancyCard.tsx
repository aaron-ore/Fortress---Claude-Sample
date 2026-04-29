import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import StockDiscrepancyDetailsDialog from "./StockDiscrepancyDetailsDialog";

interface StockDiscrepancyCardProps {
  pendingDiscrepanciesCount: number;
  previousPeriodDiscrepanciesCount: number;
  dateRange: DateRange | undefined;
}

const StockDiscrepancyCard: React.FC<StockDiscrepancyCardProps> = ({ pendingDiscrepanciesCount, previousPeriodDiscrepanciesCount, dateRange }) => {
  const [isDiscrepancyDetailsDialogOpen, setIsDiscrepancyDetailsDialogOpen] = useState(false);

  const percentageChange = useMemo(() => {
    if (previousPeriodDiscrepanciesCount === 0) {
      return pendingDiscrepanciesCount > 0 ? "100.0" : "0.0";
    }
    const change = ((pendingDiscrepanciesCount - previousPeriodDiscrepanciesCount) / previousPeriodDiscrepanciesCount) * 100;
    return change.toFixed(1);
  }, [pendingDiscrepanciesCount, previousPeriodDiscrepanciesCount]);

  const isPositiveChange = pendingDiscrepanciesCount >= previousPeriodDiscrepanciesCount;

  return (
    <>
      <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-foreground">Stock Discrepancies</CardTitle>
          <p className="text-sm text-muted-foreground">
            Today's pending discrepancies
          </p>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center relative p-4 pt-0">
          <div className="text-6xl font-bold text-destructive">
            {pendingDiscrepanciesCount}
          </div>
          <p className={`text-sm ${isPositiveChange ? "text-red-500" : "text-green-500"} flex items-center justify-center mt-2`}>
            {isPositiveChange ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />} {percentageChange}% from previous period
          </p>
          <Button
            className="mt-auto w-full"
            onClick={() => setIsDiscrepancyDetailsDialogOpen(true)}
            disabled={pendingDiscrepanciesCount === 0}
          >
            <Scale className="h-4 w-4 mr-2" /> View Discrepancies
          </Button>
        </CardContent>
      </Card>
      <StockDiscrepancyDetailsDialog
        isOpen={isDiscrepancyDetailsDialogOpen}
        onClose={() => setIsDiscrepancyDetailsDialogOpen(false)}
        dateRange={dateRange}
      />
    </>
  );
};

export default StockDiscrepancyCard;
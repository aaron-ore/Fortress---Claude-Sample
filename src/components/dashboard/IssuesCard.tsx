import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import DailyIssuesDialog from "./DailyIssuesDialog";

interface IssuesCardProps {
  dailyIssuesCount: number;
  previousPeriodIssuesCount: number;
  dateRange: DateRange | undefined;
}

const IssuesCard: React.FC<IssuesCardProps> = ({ dailyIssuesCount, previousPeriodIssuesCount, dateRange }) => {
  const [isDailyIssuesDialogOpen, setIsDailyIssuesDialogOpen] = useState(false);

  const percentageChange = useMemo(() => {
    if (previousPeriodIssuesCount === 0) {
      return dailyIssuesCount > 0 ? "100.0" : "0.0";
    }
    const change = ((dailyIssuesCount - previousPeriodIssuesCount) / previousPeriodIssuesCount) * 100;
    return change.toFixed(1);
  }, [dailyIssuesCount, previousPeriodIssuesCount]);

  const isPositiveChange = dailyIssuesCount >= previousPeriodIssuesCount;

  return (
    <>
      <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-foreground">Issues Reported</CardTitle>
          <p className="text-sm text-muted-foreground">
            Today's operational issues
          </p>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center relative p-4 pt-0">
          <div className="text-6xl font-bold text-destructive">
            {dailyIssuesCount}
          </div>
          <p className={`text-sm ${isPositiveChange ? "text-red-500" : "text-green-500"} flex items-center justify-center mt-2`}>
            {isPositiveChange ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />} {percentageChange}% from previous period
          </p>
          <Button
            className="mt-auto w-full"
            onClick={() => setIsDailyIssuesDialogOpen(true)}
            disabled={dailyIssuesCount === 0}
          >
            <Scale className="h-4 w-4 mr-2" /> View Issues
          </Button>
        </CardContent>
      </Card>
      <DailyIssuesDialog
        isOpen={isDailyIssuesDialogOpen}
        onClose={() => setIsDailyIssuesDialogOpen(false)}
        dateRange={dateRange}
      />
    </>
  );
};

export default IssuesCard;
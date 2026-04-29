import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProfitabilityMetricsData {
  name: string;
  value: number;
  color: string;
}

interface ProfitabilityReportProps {
  profitability: {
    metricsData: ProfitabilityMetricsData[];
    totalSalesRevenue: number;
    totalCostOfGoodsSold: number;
  };
}

const ProfitabilityReport: React.FC<ProfitabilityReportProps> = ({
  profitability,
}) => {
  const { metricsData, totalSalesRevenue, totalCostOfGoodsSold } = profitability;

  const grossProfit = (totalSalesRevenue ?? 0) - (totalCostOfGoodsSold ?? 0);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <BarChart className="h-6 w-6 text-primary" /> Profitability Report
          </CardTitle>
          <p className="text-muted-foreground">
            Key financial performance indicators for sales.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Sales Revenue</h3>
              <p className="text-3xl font-bold text-green-500">${(totalSalesRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Cost of Goods Sold</h3>
              <p className="text-3xl font-bold">${(totalCostOfGoodsSold ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Gross Profit</h3>
              <p className="text-3xl font-bold">${(grossProfit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">Profitability Metrics</h3>
          {(metricsData ?? []).length > 0 ? (
            <ScrollArea className="h-[200px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Value (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(metricsData ?? []).map((metric: ProfitabilityMetricsData, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{metric.name}</TableCell>
                      <TableCell className="text-right">{(metric.value ?? 0).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No profitability metrics available for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitabilityReport;
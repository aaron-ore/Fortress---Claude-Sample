import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GroupedDataItem {
  name: string;
  totalValue: number;
  totalQuantity: number;
}

interface InventoryValuationReportProps {
  inventoryValuation: {
    groupedData: GroupedDataItem[];
    totalOverallValue: number;
    totalOverallQuantity: number;
  };
  groupBy: "category" | "folder"; // Passed directly from Reports.tsx
}

const InventoryValuationReport: React.FC<InventoryValuationReportProps> = ({
  inventoryValuation,
  groupBy,
}) => {
  const { groupedData, totalOverallValue, totalOverallQuantity } = inventoryValuation;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" /> Inventory Valuation Report
          </CardTitle>
          <p className="text-muted-foreground">
            Current value of your inventory, grouped by {groupBy}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Inventory Value</h3>
              <p className="text-3xl font-bold text-green-500">${(totalOverallValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Units On Hand</h3>
              <p className="text-3xl font-bold">{(totalOverallQuantity ?? 0).toLocaleString()}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">Details by {groupBy === "category" ? "Category" : "Folder"}</h3>
          {(groupedData ?? []).length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{groupBy === "category" ? "Category" : "Folder"}</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(groupedData ?? []).map((data: GroupedDataItem, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{data.name}</TableCell>
                      <TableCell className="text-right">{(data.totalQuantity ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${(data.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No inventory data found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryValuationReport;
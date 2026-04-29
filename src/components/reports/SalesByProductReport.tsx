import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSalesData {
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
}

interface SalesByProductReportProps {
  salesByProduct: {
    productSales: ProductSalesData[];
  };
}

const SalesByProductReport: React.FC<SalesByProductReportProps> = ({
  salesByProduct,
}) => {
  const { productSales } = salesByProduct;

  const totalOverallRevenue = (productSales ?? []).reduce((sum: number, data: ProductSalesData) => sum + data.totalRevenue, 0);
  const totalOverallUnits = (productSales ?? []).reduce((sum: number, data: ProductSalesData) => sum + data.unitsSold, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <BarChart className="h-6 w-6 text-primary" /> Sales by Product Report
          </CardTitle>
          <p className="text-muted-foreground">
            Overview of sales performance grouped by product.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Sales Revenue</h3>
              <p className="text-3xl font-bold text-green-500">${(totalOverallRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Items Sold</h3>
              <p className="text-3xl font-bold">{(totalOverallUnits ?? 0).toLocaleString()}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">Detailed Sales by Product ({(productSales ?? []).length})</h3>
          {(productSales ?? []).length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(productSales ?? []).map((data: ProductSalesData, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{data.productName}</TableCell>
                      <TableCell>{data.sku}</TableCell>
                      <TableCell>{data.category}</TableCell>
                      <TableCell className="text-right">{(data.unitsSold ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${(data.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No sales data found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesByProductReport;
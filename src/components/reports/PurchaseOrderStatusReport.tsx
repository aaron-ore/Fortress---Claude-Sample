import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { OrderItem } from "@/context/OrdersContext";
import { FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseAndValidateDate } from "@/utils/dateUtils";

interface PurchaseOrderStatusReportProps {
  purchaseOrderStatus: {
    orders: OrderItem[];
  };
  statusFilter: "all" | "new-order" | "processing" | "packed" | "shipped" | "on-hold-problem" | "archived"; // Passed directly from Reports.tsx
}

const PurchaseOrderStatusReport: React.FC<PurchaseOrderStatusReportProps> = ({
  purchaseOrderStatus,
  statusFilter: _currentStatusFilter, // Prefix with underscore
}) => {
  const { orders: ordersToDisplay } = purchaseOrderStatus;

  const totalOrders = (ordersToDisplay ?? []).length;
  const totalAmount = (ordersToDisplay ?? []).reduce((sum: number, order: OrderItem) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Purchase Order Status Report
          </CardTitle>
          <p className="text-muted-foreground">
            Overview of all purchase orders and their current statuses.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Purchase Orders</h3>
              <p className="text-3xl font-bold">{(totalOrders ?? 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Value of Orders</h3>
              <p className="text-3xl font-bold">${(totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">
            Detailed Purchase Orders ({(ordersToDisplay ?? []).length})
          </h3>
          {(ordersToDisplay ?? []).length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ordersToDisplay ?? []).map((order: OrderItem) => {
                    const orderDate = parseAndValidateDate(order.date);
                    const dueDate = parseAndValidateDate(order.dueDate);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.customerSupplier}</TableCell>
                        <TableCell>{orderDate ? format(orderDate, "MMM dd, yyyy") : "N/A"}</TableCell>
                        <TableCell>{dueDate ? format(dueDate, "MMM dd, yyyy") : "N/A"}</TableCell>
                        <TableCell>{order.status}</TableCell>
                        <TableCell className="text-right">${(order.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No purchase orders found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrderStatusReport;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Receipt, AlertTriangle, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryItem } from "@/context/InventoryContext";
import { OrderItem } from "@/context/OrdersContext";

// Define the expected structure of the data prop
interface DashboardSummaryReportProps {
  metrics: {
    totalStockValue: number;
    totalUnitsOnHand: number;
    lowStockItemsCount: number;
    outOfStockItemsCount: number;
  };
  lists: {
    lowStockItems: InventoryItem[];
    outOfStockItems: InventoryItem[];
    recentSalesOrders: OrderItem[];
    recentPurchaseOrders: OrderItem[];
  };
}

const DashboardSummaryReport: React.FC<DashboardSummaryReportProps> = ({
  metrics,
  lists,
}) => {
  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Dashboard Summary</CardTitle>
          <p className="text-muted-foreground">
            Overview of key inventory and order metrics.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-500" /> Inventory Value</h3>
            <p className="text-3xl font-bold">${(metrics.totalStockValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Total Units On Hand</h3>
            <p className="text-3xl font-bold">{(metrics.totalUnitsOnHand ?? 0).toLocaleString()}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /> Low Stock Items</h3>
            <p className="text-3xl font-bold">{(lists.lowStockItems ?? []).length}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Out of Stock Items</h3>
            <p className="text-3xl font-bold">{(lists.outOfStockItems ?? []).length}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2"><Receipt className="h-5 w-5 text-blue-500" /> Recent Sales Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {(lists.recentSalesOrders ?? []).length > 0 ? (
            <ScrollArea className="h-40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lists.recentSalesOrders ?? []).map((order: OrderItem) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.customerSupplier}</TableCell>
                      <TableCell className="text-right">${(order.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-4">No recent sales orders.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-purple-500" /> Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {(lists.recentPurchaseOrders ?? []).length > 0 ? (
            <ScrollArea className="h-40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lists.recentPurchaseOrders ?? []).map((order: OrderItem) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.customerSupplier}</TableCell>
                      <TableCell className="text-right">${(order.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-4">No recent purchase orders.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSummaryReport;
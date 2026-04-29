import React, { useState,  useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Package, AlertCircle, TrendingUp, Scan as ScanIcon, Receipt, DollarSign, Boxes, FilterX, Loader2, AlertTriangle } from "lucide-react";
import AddInventoryDialog from "@/components/AddInventoryDialog";
import ScanItemDialog from "@/components/ScanItemDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { isValid } from "date-fns";
import { useDashboardData } from "@/hooks/use-dashboard-data";

const ClassicDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [isAddInventoryDialogOpen, setIsAddInventoryDialogOpen] = useState(false);
  const [isScanItemDialogOpen, setIsScanItemDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: dashboardData, isLoading, error, refresh } = useDashboardData(dateRange);

  const handleCreatePO = () => navigate("/create-po");
  const handleCreateInvoice = () => navigate("/create-invoice");
  const handleClearDateFilter = () => { setDateRange(undefined); };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-destructive">
        <AlertTriangle className="h-16 w-16 mb-4" />
        <p className="text-lg">Error loading dashboard: {error}</p>
        <Button onClick={refresh} className="mt-4">Retry Loading Dashboard</Button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
        <AlertTriangle className="h-16 w-16 mb-4" />
        <p className="text-lg">No dashboard data available.</p>
        <Button onClick={refresh} className="mt-4">Load Dashboard</Button>
      </div>
    );
  }

  const { metrics, lists } = dashboardData;

  const recentOrders = useMemo(() => [...lists.recentSalesOrders, ...lists.recentPurchaseOrders].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  }), [lists.recentSalesOrders, lists.recentPurchaseOrders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Classic Dashboard</h1>
        <div className="flex items-center gap-2">
          <DateRangePicker dateRange={dateRange} onSelect={setDateRange} />
          {dateRange?.from && isValid(dateRange.from) && (
            <Button variant="outline" onClick={handleClearDateFilter} size="icon">
              <FilterX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-muted-foreground">A streamlined overview of your inventory and orders.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Value of all items in stock</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Units On Hand</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUnitsOnHand.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total quantity of all items</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{metrics.lowStockItemsCount}</div>
            <p className="text-xs text-muted-foreground">Items below reorder level</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out-of-Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.outOfStockItemsCount}</div>
            <p className="text-xs text-muted-foreground">Items with zero quantity</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={() => setIsAddInventoryDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Item
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Receipt className="h-4 w-4 mr-2" /> Create Order
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>New Order</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreatePO}>Purchase Order</DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateInvoice}>Sales Invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsScanItemDialogOpen(true)}>
            <ScanIcon className="h-4 w-4 mr-2" /> Scan Item
          </Button>
          <Button variant="outline" onClick={() => navigate("/inventory")}>
            <Package className="h-4 w-4 mr-2" /> Manage Inventory
          </Button>
          <Button variant="outline" onClick={() => navigate("/orders")}>
            <TrendingUp className="h-4 w-4 mr-2" /> View All Orders
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            {lists.lowStockItems.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lists.lowStockItems.slice(0, 5).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right text-destructive">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.reorderLevel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No items currently at low stock levels.</p>
            )}
            {lists.lowStockItems.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="link" onClick={() => navigate("/inventory?statusFilter=Low Stock")}>
                  View All Low Stock Items
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer/Supplier</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id} onClick={() => navigate(`/orders/${order.id}`)} className="cursor-pointer hover:bg-muted/20">
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.type}</TableCell>
                        <TableCell className="truncate max-w-[150px]">{order.customerSupplier}</TableCell>
                        <TableCell className="text-right">
                          {order.date}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No recent orders to display.</p>
            )}
            {recentOrders.length > 0 && (
              <div className="text-center mt-4">
                <Button variant="link" onClick={() => navigate("/orders")}>
                  View All Orders
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddInventoryDialog
        isOpen={isAddInventoryDialogOpen}
        onClose={() => setIsAddInventoryDialogOpen(false)}
      />
      <ScanItemDialog
        isOpen={isScanItemDialogOpen}
        onClose={() => setIsScanItemDialogOpen(false)}
      />
    </div>
  );
};

export default ClassicDashboard;
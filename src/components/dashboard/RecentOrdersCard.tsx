import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt } from "lucide-react";
import { formatDistanceToNowStrict, isValid } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { OrderItem } from "@/context/OrdersContext";

interface RecentOrdersCardProps {
  recentSalesOrders: OrderItem[];
  recentPurchaseOrders: OrderItem[];
}

const RecentOrdersCard: React.FC<RecentOrdersCardProps> = ({ recentSalesOrders, recentPurchaseOrders }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Recent Orders</CardTitle>
        <Receipt className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales">Sales Orders</TabsTrigger>
            <TabsTrigger value="purchases">Purchase Orders</TabsTrigger>
          </TabsList>
          <TabsContent value="sales" className="mt-4">
            {recentSalesOrders.length > 0 ? (
              <ScrollArea className="h-[120px] rounded-md border p-2">
                <ul className="text-sm space-y-2">
                  {recentSalesOrders.map((order) => {
                    const orderDate = parseAndValidateDate(order.date);
                    return (
                      <li key={order.id} className="flex justify-between items-center">
                        <span>{order.id} - {order.customerSupplier}</span>
                        <span className="text-muted-foreground text-xs">
                          {orderDate && isValid(orderDate) ? formatDistanceToNowStrict(orderDate, { addSuffix: true }) : "N/A"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No recent sales orders.</p>
            )}
          </TabsContent>
          <TabsContent value="purchases" className="mt-4">
            {recentPurchaseOrders.length > 0 ? (
              <ScrollArea className="h-[120px] rounded-md border p-2">
                <ul className="text-sm space-y-2">
                  {recentPurchaseOrders.map((order) => {
                    const orderDate = parseAndValidateDate(order.date);
                    return (
                      <li key={order.id} className="flex justify-between items-center">
                        <span>{order.id} - {order.customerSupplier}</span>
                        <span className="text-muted-foreground text-xs">
                          {orderDate && isValid(orderDate) ? formatDistanceToNowStrict(orderDate, { addSuffix: true }) : "N/A"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No recent purchase orders.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RecentOrdersCard;
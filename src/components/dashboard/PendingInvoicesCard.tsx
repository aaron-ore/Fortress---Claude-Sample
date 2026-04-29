import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptText } from "lucide-react";
import { OrderItem } from "@/context/OrdersContext";
import { format, isValid } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseAndValidateDate } from "@/utils/dateUtils";

interface PendingInvoicesCardProps {
  pendingInvoices: OrderItem[];
}

const PendingInvoicesCard: React.FC<PendingInvoicesCardProps> = ({ pendingInvoices }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Pending Invoices (30+ Days Late)</CardTitle>
        <ReceiptText className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
        {pendingInvoices.length > 0 ? (
          <ScrollArea className="flex-grow max-h-[180px] pr-2">
            <ul className="text-sm space-y-2">
              {pendingInvoices.map((invoice) => {
                const dueDate = parseAndValidateDate(invoice.dueDate);
                return (
                  <li key={invoice.id} className="flex justify-between items-center text-destructive">
                    <span>{invoice.id} - {invoice.customerSupplier}</span>
                    <span className="text-xs">
                      {dueDate && isValid(dueDate) ? format(dueDate, "MMM dd") : "N/A"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4 flex-grow flex items-center justify-center">No invoices currently 30+ days late. Great!</p>
        )}
        <p className="text-xs text-muted-foreground mt-auto text-center">Sales orders with overdue payments.</p>
      </CardContent>
    </Card>
  );
};

export default PendingInvoicesCard;
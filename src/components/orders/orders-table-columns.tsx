import { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Archive } from "lucide-react";
import { OrderItem } from "@/context/OrdersContext";
import { format, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

export const createOrderColumns = (archiveOrder: (id: string) => void, canArchiveOrders: boolean): ColumnDef<OrderItem>[] => [
  {
    accessorKey: "id",
    header: "Order ID",
    cell: ({ row }) => <Link to={`/orders/${row.original.id}`} className="font-medium hover:underline">{row.getValue("id")}</Link>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant={row.original.type === "Sales" ? "info" : "default"}>
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "customerSupplier",
    header: "Customer/Supplier",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = parseAndValidateDate(row.original.date);
      return date ? format(date, "MMM dd, yyyy") : "N/A";
    }
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const dueDateObj = parseAndValidateDate(row.original.dueDate);
      const today = new Date();
      const isDueDateValid = dueDateObj && isValid(dueDateObj);

      const isOverdue = isDueDateValid && dueDateObj < today && row.original.status !== "Shipped" && row.original.status !== "Packed";
      const isDueSoon = isDueDateValid && dueDateObj > today && dueDateObj <= new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) && row.original.status !== "Shipped" && row.original.status !== "Packed";

      const dueDateClass = cn(
        "font-medium",
        isOverdue && "text-destructive",
        isDueSoon && "text-yellow-500",
      );
      return <span className={dueDateClass}>{isDueDateValid ? format(dueDateObj, "MMM dd, yyyy") : "N/A"}</span>;
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "muted" = "info";
      switch (row.original.status) {
        case "New Order":
          variant = "default";
          break;
        case "Processing":
          variant = "secondary";
          break;
        case "Packed":
          variant = "outline";
          break;
        case "Shipped":
          variant = "muted";
          break;
        case "On Hold / Problem":
          variant = "warning";
          break;
        case "Archived":
          variant = "destructive";
          break;
      }
      return <Badge variant={variant}>{row.original.status}</Badge>;
    },
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => `$${parseFloat(row.original.totalAmount.toString() || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    accessorKey: "itemCount",
    header: "Items",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <Link to={`/orders/${row.original.id}`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" /> View
          </Button>
        </Link>
        <Link to={`/orders/${row.original.id}`}>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        </Link>
        {row.original.status !== "Archived" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => archiveOrder(row.original.id)}
            disabled={!canArchiveOrders} // NEW: Disable if user cannot archive orders
          >
            <Archive className="h-4 w-4 mr-1" /> Archive
          </Button>
        )}
      </div>
    ),
  },
];
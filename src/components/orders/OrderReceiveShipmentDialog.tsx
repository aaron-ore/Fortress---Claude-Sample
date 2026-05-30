import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { PackagePlus } from "lucide-react";

interface ReceiveShipmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReceiveLine {
  line: POItem;
  qtyReceived: number;
  actualUnitCost: number;
}

const ReceiveShipmentDialog: React.FC<ReceiveShipmentDialogProps> = ({ isOpen, onClose }) => {
  const { orders, updateOrder } = useOrders();
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { addStockMovement } = useStockMovement();
  const { inventoryFolders } = useOnboarding();

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const purchaseOrders = orders.filter((o) => o.type === "Purchase" && o.status !== "Shipped");

  React.useEffect(() => {
    if (isOpen) {
      setSelectedOrderId("");
      setLines([]);
      setLocationId("");
      setNotes("");
    }
  }, [isOpen]);

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = orders.find((o) => o.id === orderId);
    if (!order) { setLines([]); return; }
    // Use the order's actual line items (not a mock).
    setLines(
      (order.items || []).map((line) => ({
        line,
        qtyReceived: line.quantity,
        actualUnitCost: line.unitCostAtReceipt ?? line.unitPrice ?? 0,
      })),
    );
    setLocationId(order.locationId || "");
  };

  const updateLine = (index: number, patch: Partial<ReceiveLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async () => {
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return showError("Select a Purchase Order.");
    if (lines.every((l) => l.qtyReceived <= 0)) return showError("Enter received quantities.");

    // Update inventory + record stock movements for received lines.
    for (const l of lines) {
      if (l.qtyReceived > 0 && l.line.inventoryItemId) {
        const inv = inventoryItems.find((i) => i.id === l.line.inventoryItemId);
        if (inv) {
          const oldQty = inv.quantity;
          await updateInventoryItem({
            ...inv,
            overstockQuantity: inv.overstockQuantity + l.qtyReceived,
            incomingStock: Math.max(0, inv.incomingStock - l.qtyReceived),
            lastUpdated: new Date().toISOString().split("T")[0],
            imageUrl: inv.imageUrl,
          });
          await addStockMovement({
            itemId: inv.id,
            itemName: inv.name,
            type: "add",
            amount: l.qtyReceived,
            oldQuantity: oldQty,
            newQuantity: oldQty + l.qtyReceived,
            reason: `Received from PO ${selectedOrderId} @ ${l.actualUnitCost}/unit`,
          });
        }
      }
    }

    // Persist received quantity + actual unit cost paid at receipt onto each line,
    // and attribute the order to a location (drives food-cost variance pricing).
    const updatedItems: POItem[] = lines.map((l) => ({
      ...l.line,
      quantity: l.qtyReceived,
      unitCostAtReceipt: l.actualUnitCost,
    }));

    const updatedOrder: OrderItem = {
      ...order,
      items: updatedItems,
      itemCount: updatedItems.length,
      locationId: locationId || order.locationId,
      status: "Shipped",
      notes: notes || order.notes,
    };
    await updateOrder(updatedOrder);
    showSuccess(`Shipment for PO ${selectedOrderId} received.`);
    refreshInventory();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-primary" /> Receive Shipment
          </DialogTitle>
          <DialogDescription>
            Record received quantities and the actual unit cost paid. Costs feed food-cost variance.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="poSelect">Purchase Order</Label>
            <Select value={selectedOrderId} onValueChange={handleOrderChange}>
              <SelectTrigger id="poSelect">
                <SelectValue placeholder="Select a Purchase Order" />
              </SelectTrigger>
              <SelectContent>
                {purchaseOrders.length > 0 ? (
                  purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.id} - {po.customerSupplier}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-pos" disabled>No pending Purchase Orders</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedOrderId && (
            <div className="space-y-2">
              <Label>Receiving location</Label>
              <Select value={locationId || "_none"} onValueChange={(v) => setLocationId(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (for variance attribution)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {inventoryFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}{f.locationType === "restaurant" ? " (restaurant)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedOrderId && (
            <div className="space-y-2">
              <Label>Items received</Label>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">This PO has no line items.</p>
              ) : (
                <ScrollArea className="max-h-72 border border-border rounded-md">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground sticky top-0 bg-muted/60">
                    <span className="col-span-6">Item</span>
                    <span className="col-span-3 text-right">Qty received</span>
                    <span className="col-span-3 text-right">Unit cost paid</span>
                  </div>
                  <div className="divide-y divide-border">
                    {lines.map((l, i) => (
                      <div key={l.line.id ?? i} className="grid grid-cols-12 gap-2 items-center px-3 py-2">
                        <div className="col-span-6 min-w-0">
                          <div className="text-sm truncate">{l.line.itemName}</div>
                          <div className="text-xs text-muted-foreground">ordered: {l.line.quantity}</div>
                        </div>
                        <Input
                          type="number" min={0} step="any"
                          className="col-span-3 h-9 text-right"
                          value={l.qtyReceived === 0 ? "" : l.qtyReceived}
                          onChange={(e) => updateLine(i, { qtyReceived: parseFloat(e.target.value) || 0 })}
                        />
                        <Input
                          type="number" min={0} step="0.01"
                          className="col-span-3 h-9 text-right"
                          value={l.actualUnitCost === 0 ? "" : l.actualUnitCost}
                          onChange={(e) => updateLine(i, { actualUnitCost: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedOrderId || lines.every((l) => l.qtyReceived <= 0)}>
            Receive Shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveShipmentDialog;

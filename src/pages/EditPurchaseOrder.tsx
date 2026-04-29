"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Archive, Printer } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { usePrint } from "@/context/PrintContext";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import { useProfile } from "@/context/ProfileContext";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import SortableItemRow from "@/components/orders/SortableItemRow";

const EditPurchaseOrder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, updateOrder, archiveOrder } = useOrders();
  const { initiatePrint } = usePrint();
  const { profile } = useProfile();

  const [order, setOrder] = useState<OrderItem | null>(null);

  const [poNumber, setPoNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [poDate, setPoDate] = useState("");
  const [status, setStatus] = useState<OrderItem['status']>("New Order");
  const [terms, setTerms] = useState("Net 30");
  const [dueDate, setDueDate] = useState("");
  const [orderType, setOrderType] = useState<OrderItem['orderType']>("Wholesale");
  const [shippingMethod, setShippingMethod] = useState<OrderItem['shippingMethod']>("Standard");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [poQrCodeSvg, setPoQrCodeSvg] = useState<string | null>(null);

  const [isConfirmArchiveDialogOpen, setIsConfirmArchiveDialogOpen] = useState(false);

  const taxRate = 0.05;

  const canViewOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';
  const canManageOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canArchiveOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  useEffect(() => {
    if (id) {
      const foundOrder = orders.find((ord) => ord.id === id);
      if (foundOrder) {
        setOrder(foundOrder);
        setPoNumber(foundOrder.id);
        setSupplier(foundOrder.customerSupplier);
        setPoDate(foundOrder.date);
        setStatus(foundOrder.status);
        setDueDate(foundOrder.dueDate);
        setOrderType(foundOrder.orderType);
        setShippingMethod(foundOrder.shippingMethod);
        setNotes(foundOrder.notes);
        setItems(foundOrder.items || []);
        setSupplierEmail("");
        setSupplierAddress("");
        setSupplierContact("");
        setTerms(foundOrder.terms || "Net 30");
      } else {
        showError("PO not found.");
        navigate("/orders");
      }
    }
  }, [id, orders, navigate]);

  React.useEffect(() => {
    const generateQr = async () => {
      if (poNumber) {
        try {
          const svg = await generateQrCodeSvg(poNumber, 80);
          setPoQrCodeSvg(svg);
        } catch (error) {
          console.error("Error generating PO QR code:", error);
          setPoQrCodeSvg(null);
        }
      } else {
        setPoQrCodeSvg(null);
      }
    };
    generateQr();
  }, [poNumber]);

  const handleAddItem = () => {
    if (!canManageOrders) {
      showError("No permission to add items.");
      return;
    }
    setItems([
      ...items,
      { id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1, itemName: "", quantity: 0, unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    if (!canManageOrders) {
      showError("No permission to remove items.");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: number,
    field: keyof POItem,
    value: string | number,
  ) => {
    if (!canManageOrders) {
      showError("No permission to edit items.");
      return;
    }
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const calculateTotalAmount = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return subtotal * (1 + taxRate);
  };

  const handleSubmit = () => {
    if (!canManageOrders) {
      showError("No permission to save changes.");
      return;
    }
    if (!poNumber || !supplier || !poDate || !status || !dueDate || !orderType || !shippingMethod || items.some(item => !item.itemName || item.quantity <= 0 || item.unitPrice <= 0)) {
      showError("Fill all required fields.");
      return;
    }

    const updatedOrder: OrderItem = {
      ...order!,
      id: poNumber,
      customerSupplier: supplier,
      date: poDate,
      status: status,
      dueDate: dueDate,
      orderType: orderType,
      shippingMethod: shippingMethod,
      notes: notes,
      totalAmount: calculateTotalAmount(),
      itemCount: items.length,
      items: items,
      terms: terms,
    };
    updateOrder(updatedOrder);
    showSuccess(`Updated PO ${poNumber}!`);
    navigate("/orders");
  };

  const handleArchiveClick = () => {
    if (!canArchiveOrders) {
      showError("No permission to archive orders.");
      return;
    }
    setIsConfirmArchiveDialogOpen(true);
  };

  const confirmArchiveOrder = () => {
    if (order) {
      archiveOrder(order.id);
      showSuccess(`PO ${order.id} archived.`);
      navigate("/orders");
    }
    setIsConfirmArchiveDialogOpen(false);
  };

  const handlePrintPdf = () => {
    if (!canViewOrders) {
      showError("No permission to print POs.");
      return;
    }
    if (!poNumber || !supplier || items.some(item => !item.itemName || item.quantity <= 0 || item.unitPrice <= 0)) {
      showError("Fill all required PO details.");
      return;
    }
    if (!profile?.companyProfile) {
      showError("Company profile not set up.");
      return;
    }

    const pdfProps = {
      poNumber,
      poDate,
      supplierName: supplier,
      supplierEmail: supplierEmail,
      supplierAddress: supplierAddress,
      supplierContact: supplierContact,
      recipientName: profile.companyProfile.companyName,
      recipientAddress: profile.companyProfile.companyAddress,
      recipientContact: profile.companyProfile.companyCurrency,
      terms,
      dueDate,
      items,
      notes,
      taxRate,
      companyLogoUrl: profile.companyProfile.companyLogoUrl || undefined,
      poQrCodeSvg: poQrCodeSvg,
    };

    initiatePrint({ type: "purchase-order", props: pdfProps });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canManageOrders) {
      showError("No permission to reorder items.");
      return;
    }
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (!canViewOrders) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to view this order.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        Loading order details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Purchase Order: {order.id}</h1>

      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
        <Button variant="outline" onClick={() => navigate("/orders")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canManageOrders}>Save Changes</Button>
        <Button variant="secondary" onClick={handlePrintPdf} disabled={!canViewOrders}>
          <Printer className="h-4 w-4 mr-2" /> Print/PDF
        </Button>
        {order.status !== "Archived" && (
          <Button variant="secondary" onClick={handleArchiveClick} disabled={!canArchiveOrders}>
            <Archive className="h-4 w-4 mr-2" /> Archive Order
          </Button>
        )}
      </div>

      <div className="main-page-content">
        <div className="space-y-6 p-6 bg-background rounded-lg">
          <Card className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poNumber">Order ID</Label>
                <Input
                  id="poNumber"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Customer/Supplier</Label>
                <Input
                  id="supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  disabled={!canManageOrders}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poDate">Order Date</Label>
                <Input
                  id="poDate"
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  disabled={!canManageOrders}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canManageOrders}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as OrderItem['status'])} disabled={!canManageOrders}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New Order">New Order</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Packed">Packed</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="On Hold / Problem">On Hold / Problem</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderType">Order Type</Label>
                <Select value={orderType} onValueChange={(value) => setOrderType(value as OrderItem['orderType'])} disabled={!canManageOrders}>
                  <SelectTrigger id="orderType">
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingMethod">Shipping Method</Label>
                <Select value={shippingMethod} onValueChange={(value) => setShippingMethod(value as OrderItem['shippingMethod'])} disabled={!canManageOrders}>
                  <SelectTrigger id="shippingMethod">
                    <SelectValue placeholder="Select shipping method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Express">Express</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Terms</Label>
                <Input
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g., Net 30"
                  disabled={!canManageOrders}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input
                  id="totalAmount"
                  type="text"
                  value={`$${calculateTotalAmount().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  disabled
                />
              </div>
              {poQrCodeSvg && (
                <div className="flex items-center justify-center">
                  <div dangerouslySetInnerHTML={{ __html: poQrCodeSvg }} className="w-20 h-20 object-contain flex-shrink-0" />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                  disabled={!canManageOrders}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl font-semibold">Items</CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddItem} disabled={!canManageOrders}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[20px]"></TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="w-[100px] text-right">Quantity</TableHead>
                        <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                        <TableHead className="w-[120px] text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                        {items.map((item) => (
                          <SortableItemRow
                            key={item.id}
                            item={item}
                            handleItemChange={handleItemChange}
                            handleRemoveItem={handleRemoveItem}
                            disabled={!canManageOrders}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </div>
              </DndContext>
              <div className="flex justify-end items-center mt-4 text-lg font-bold">
                Total Amount: ${calculateTotalAmount().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col relative min-h-[120px]">
              <ScrollArea className="h-24 max-h-24 overflow-y-auto">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                  disabled={!canManageOrders}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Buttons - Fixed Height */}
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4 flex-shrink-0 p-6 pt-0">
        <Button variant="outline" onClick={() => navigate("/orders")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canManageOrders}>Save Changes</Button>
        <Button variant="secondary" onClick={handlePrintPdf} disabled={!canViewOrders}>
          <Printer className="h-4 w-4 mr-2" /> Print/PDF
        </Button>
        {order.status !== "Archived" && (
          <Button variant="secondary" onClick={handleArchiveClick} disabled={!canArchiveOrders}>
            <Archive className="h-4 w-4 mr-2" /> Archive Order
          </Button>
        )}
      </div>

      {order && (
        <ConfirmDialog
          isOpen={isConfirmArchiveDialogOpen}
          onClose={() => setIsConfirmArchiveDialogOpen(false)}
          onConfirm={confirmArchiveOrder}
          title="Confirm Archive Order"
          description={`Are you sure you want to archive Order ${order.id}? It will no longer appear in active views but can be found using the 'Archived' filter.`}
          confirmText="Archive"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default EditPurchaseOrder;
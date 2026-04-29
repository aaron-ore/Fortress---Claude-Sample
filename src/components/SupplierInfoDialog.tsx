import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Truck, Loader2 } from "lucide-react";
import { useVendors, Vendor } from "@/context/VendorContext";
import { showError, showSuccess } from "@/utils/toast";
import { formatPhoneNumber } from "@/utils/formatters";
import { useProfile } from "@/context/ProfileContext";

interface SupplierInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemSku: string;
  vendorId?: string;
}

const SupplierInfoDialog: React.FC<SupplierInfoDialogProps> = ({
  isOpen,
  onClose,
  itemName,
  itemSku,
  vendorId,
}) => {
  const { vendors } = useVendors();
  const [supplier, setSupplier] = useState<Vendor | null>(null);
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(true);
  const { profile } = useProfile();

  // Role-based permissions
  const canViewVendors = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';

  useEffect(() => {
    if (isOpen && vendorId) {
      setIsLoadingSupplier(true);
      const foundVendor = vendors.find(v => v.id === vendorId);
      if (foundVendor) {
        setSupplier(foundVendor);
        showSuccess(`Supplier found for ${itemName}.`);
      } else {
        showError(`No supplier found.`);
        setSupplier(null);
      }
      setIsLoadingSupplier(false);
    } else if (isOpen && !vendorId) {
      setSupplier(null);
      setIsLoadingSupplier(false);
      showError(`No vendor assigned.`);
    }
  }, [isOpen, vendorId, vendors, itemName]);

  if (!canViewVendors) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" /> Supplier for "{itemName}"
            </DialogTitle>
            <DialogDescription>
              Details for the primary supplier of {itemName} (SKU: {itemSku}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-sm">
            <div className="text-center text-muted-foreground py-4">
              <p>No permission to view supplier info.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Supplier for "{itemName}"
          </DialogTitle>
          <DialogDescription>
            Details for the primary supplier of {itemName} (SKU: {itemSku}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
          {isLoadingSupplier ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading supplier info...</span>
            </div>
          ) : supplier ? (
            <>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Supplier Name:</p>
                <p className="text-muted-foreground">{supplier.name}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Contact Person:</p>
                <p className="text-muted-foreground">{supplier.contactPerson || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Email:</p>
                <p className="text-muted-foreground">{supplier.email || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Phone:</p>
                <p className="text-muted-foreground">{supplier.phone ? formatPhoneNumber(supplier.phone) : "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Address:</p>
                <p className="text-muted-foreground">{supplier.address || "N/A"}</p>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>No supplier info available.</p>
              <p className="text-xs mt-2">Ensure item has a vendor assigned.</p>
            </div>
          )}
          <div className="mt-4 p-3 bg-muted/20 rounded-md text-xs text-muted-foreground">
            <p>
              <Package className="inline h-3 w-3 mr-1" />
              This dialog now fetches real supplier data from your Vendors list.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierInfoDialog;
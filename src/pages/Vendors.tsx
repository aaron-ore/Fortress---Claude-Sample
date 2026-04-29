import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { useVendors, Vendor } from "@/context/VendorContext";
import AddEditVendorDialog from "@/components/AddEditVendorDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useProfile } from "@/context/ProfileContext";
import { showError } from "@/utils/toast"; // Import showError

const Vendors: React.FC = () => {
  const { vendors, deleteVendor } = useVendors();
  const { profile } = useProfile(); // NEW: Get profile for role checks

  // NEW: Role-based permissions
  const canViewVendors = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';
  const canManageVendors = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canDeleteVendors = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [isAddEditVendorDialogOpen, setIsAddEditVendorDialogOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleAddVendorClick = () => {
    if (!canManageVendors) { // NEW: Check permission before adding
      showError("No permission to add vendors.");
      return;
    }
    setVendorToEdit(null);
    setIsAddEditVendorDialogOpen(true);
  };

  const handleEditVendorClick = (vendor: Vendor) => {
    if (!canManageVendors) { // NEW: Check permission before editing
      showError("No permission to edit vendors.");
      return;
    }
    setVendorToEdit(vendor);
    setIsAddEditVendorDialogOpen(true);
  };

  const handleDeleteVendorClick = (vendorId: string, vendorName: string) => {
    if (!canDeleteVendors) { // NEW: Check permission before deleting
      showError("No permission to delete vendors.");
      return;
    }
    setVendorToDelete({ id: vendorId, name: vendorName });
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteVendor = () => {
    if (vendorToDelete) {
      deleteVendor(vendorToDelete.id);
    }
    setIsConfirmDeleteDialogOpen(false);
    setVendorToDelete(null);
  };

  const filteredVendors = useMemo(() => {
    if (!searchTerm) {
      return vendors;
    }
    return vendors.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vendor.contactPerson && vendor.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vendor.phone && vendor.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vendor.address && vendor.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [vendors, searchTerm]);

  if (!canViewVendors) { // NEW: Check permission for viewing page
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to view vendors.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Vendor Management</h1>
      <p className="text-muted-foreground">Manage your suppliers and business partners.</p>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search vendors..."
          className="max-w-sm bg-input border-border text-foreground flex-grow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {canManageVendors && ( // NEW: Only show if user can manage vendors
          <Button onClick={handleAddVendorClick}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Vendor
          </Button>
        )}
      </div>

      <Card className="bg-card border-border rounded-lg p-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVendors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No vendors found. Add a new vendor to get started!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    {canManageVendors && <TableHead className="text-center w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.contactPerson || "-"}</TableCell>
                      <TableCell>{vendor.email || "-"}</TableCell>
                      <TableCell>{vendor.phone || "-"}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{vendor.address || "-"}</TableCell>
                      {canManageVendors && ( // NEW: Only show if user can manage vendors
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditVendorClick(vendor)}>
                              <Edit className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteVendorClick(vendor.id, vendor.name)} disabled={!canDeleteVendors}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddEditVendorDialog
        isOpen={isAddEditVendorDialogOpen}
        onClose={() => setIsAddEditVendorDialogOpen(false)}
        vendorToEdit={vendorToEdit}
      />
      {vendorToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmDeleteVendor}
          title="Confirm Vendor Dletion"
          description={`Are you sure you want to delete vendor "${vendorToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default Vendors;
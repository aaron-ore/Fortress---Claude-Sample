import React, { useMemo, useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { PlusCircle, Pencil, Trash2, Building2, Store } from "lucide-react";
import { usePartners, Partner } from "@/context/PartnersContext";
import { useMerchants, Merchant } from "@/context/MerchantsContext";
import { useProfile } from "@/context/ProfileContext";
import { useBusinessMode } from "@/hooks/useBusinessMode";
import AddEditPartnerDialog from "@/components/warehouse/AddEditPartnerDialog";
import AddEditMerchantDialog from "@/components/warehouse/AddEditMerchantDialog";
import ConfirmDialog from "@/components/ConfirmDialog";

const PartnersMerchantsPage: React.FC = () => {
  const { hasFeature } = useBusinessMode();
  const { profile } = useProfile();
  const { partners, deletePartner } = usePartners();
  const { merchants, deleteMerchant } = useMerchants();

  const canView = profile?.role === "admin" || profile?.role === "inventory_manager" || profile?.role === "viewer";
  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  const [partnerDialog, setPartnerDialog] = useState<{ open: boolean; edit: Partner | null }>({ open: false, edit: null });
  const [merchantDialog, setMerchantDialog] = useState<{ open: boolean; edit: Merchant | null }>({ open: false, edit: null });
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "partner" | "merchant"; id: string; name: string } | null>(null);

  const partnerName = useMemo(() => new Map(partners.map((p) => [p.id, p.name])), [partners]);

  const partnerColumns: ColumnDef<Partner>[] = useMemo(() => [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "partnerType",
      header: "Type",
      cell: ({ row }) => <Badge variant="info">{row.original.partnerType.toUpperCase()}</Badge>,
    },
    { accessorKey: "contactName", header: "Contact", cell: ({ row }) => row.original.contactName || "—" },
    { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "—" },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone || "—" },
    ...(canManage ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: { original: Partner } }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPartnerDialog({ open: true, edit: row.original })}><Pencil className="h-4 w-4" /></Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete({ kind: "partner", id: row.original.id, name: row.original.name })}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    }] : []),
  ], [canManage]);

  const merchantColumns: ColumnDef<Merchant>[] = useMemo(() => [
    { accessorKey: "name", header: "Name" },
    { id: "partner", header: "Partner", cell: ({ row }) => (row.original.partnerId ? partnerName.get(row.original.partnerId) || "—" : "—") },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => <Badge variant={row.original.paymentStatus === "paid" ? "success" : "warning"}>{row.original.paymentStatus === "paid" ? "Paid" : "Pending"}</Badge>,
    },
    { accessorKey: "contactName", header: "Contact", cell: ({ row }) => row.original.contactName || "—" },
    { accessorKey: "shippingAddress", header: "Ships to", cell: ({ row }) => <span className="max-w-[220px] truncate inline-block align-bottom">{row.original.shippingAddress || "—"}</span> },
    ...(canManage ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: { original: Merchant } }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMerchantDialog({ open: true, edit: row.original })}><Pencil className="h-4 w-4" /></Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete({ kind: "merchant", id: row.original.id, name: row.original.name })}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    }] : []),
  ], [canManage, partnerName]);

  if (!hasFeature("serialUnits")) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border max-w-md">
          <CardTitle className="text-2xl font-bold mb-4">Not available in this mode</CardTitle>
          <CardContent><p className="text-muted-foreground">Merchant &amp; partner management is part of Warehouse mode.</p></CardContent>
        </Card>
      </div>
    );
  }
  if (!canView) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent><p className="text-muted-foreground">You do not have permission to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  const onConfirmDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === "partner") await deletePartner(confirmDelete.id);
    else await deleteMerchant(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-3xl font-bold">Merchants &amp; Partners</h1>

      <Tabs defaultValue="merchants">
        <TabsList>
          <TabsTrigger value="merchants"><Store className="h-4 w-4 mr-2" /> Merchants ({merchants.length})</TabsTrigger>
          <TabsTrigger value="partners"><Building2 className="h-4 w-4 mr-2" /> Partners ({partners.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="merchants" className="mt-4">
          <div className="flex justify-end mb-3">
            {canManage && (
              <Button onClick={() => setMerchantDialog({ open: true, edit: null })}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Merchant
              </Button>
            )}
          </div>
          <Card><CardContent className="pt-6"><DataTable columns={merchantColumns} data={merchants} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="partners" className="mt-4">
          <div className="flex justify-end mb-3">
            {canManage && (
              <Button onClick={() => setPartnerDialog({ open: true, edit: null })}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Partner
              </Button>
            )}
          </div>
          <Card><CardContent className="pt-6"><DataTable columns={partnerColumns} data={partners} /></CardContent></Card>
        </TabsContent>
      </Tabs>

      <AddEditPartnerDialog isOpen={partnerDialog.open} onClose={() => setPartnerDialog({ open: false, edit: null })} partnerToEdit={partnerDialog.edit} />
      <AddEditMerchantDialog isOpen={merchantDialog.open} onClose={() => setMerchantDialog({ open: false, edit: null })} merchantToEdit={merchantDialog.edit} />

      {confirmDelete && (
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={onConfirmDelete}
          title={`Delete ${confirmDelete.kind}`}
          description={`Delete "${confirmDelete.name}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default PartnersMerchantsPage;

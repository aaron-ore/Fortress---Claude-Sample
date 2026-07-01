import React, { useMemo, useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Search, X, Loader2, Cpu } from "lucide-react";
import { useInventoryUnits, InventoryUnit } from "@/context/InventoryUnitsContext";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useVendors } from "@/context/VendorContext";
import { useProfile } from "@/context/ProfileContext";
import { useBusinessMode } from "@/hooks/useBusinessMode";
import {
  UNIT_STATUSES, unitStatusLabel, unitStatusVariant,
  INTENDED_USES, intendedUseLabel, intendedUseVariant,
} from "@/lib/warehouseStatuses";

interface DeviceRow extends InventoryUnit {
  productName: string;
  vendorName: string;
  folderName: string;
}

const DevicesPage: React.FC = () => {
  const { hasFeature } = useBusinessMode();
  const { profile } = useProfile();
  const { units, isLoadingUnits } = useInventoryUnits();
  const { inventoryItems } = useInventory();
  const { inventoryFolders } = useOnboarding();
  const { vendors } = useVendors();

  const canView = profile?.role === "admin" || profile?.role === "inventory_manager" || profile?.role === "viewer";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [useFilter, setUseFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");

  const productName = useMemo(() => new Map(inventoryItems.map((i) => [i.id, i.name])), [inventoryItems]);
  const vendorName = useMemo(() => new Map(vendors.map((v) => [v.id, v.name])), [vendors]);
  const folderName = useMemo(() => new Map(inventoryFolders.map((f) => [f.id, f.name])), [inventoryFolders]);

  const rows: DeviceRow[] = useMemo(() => {
    const term = search.trim().toLowerCase();
    return units
      .filter((u) => statusFilter === "all" || u.unitStatus === statusFilter)
      .filter((u) => useFilter === "all" || u.intendedUse === useFilter)
      .filter((u) => productFilter === "all" || u.productId === productFilter)
      .filter((u) => {
        if (!term) return true;
        const pName = (productName.get(u.productId) || "").toLowerCase();
        return u.serialNumber.toLowerCase().includes(term) || pName.includes(term);
      })
      .map((u) => ({
        ...u,
        productName: productName.get(u.productId) || "—",
        vendorName: u.vendorId ? vendorName.get(u.vendorId) || "—" : "—",
        folderName: u.folderId ? folderName.get(u.folderId) || "—" : "Unassigned",
      }));
  }, [units, search, statusFilter, useFilter, productFilter, productName, vendorName, folderName]);

  const columns: ColumnDef<DeviceRow>[] = useMemo(() => [
    {
      accessorKey: "serialNumber",
      header: "Serial",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.serialNumber}</span>,
    },
    { accessorKey: "productName", header: "Product" },
    {
      accessorKey: "unitStatus",
      header: "Status",
      cell: ({ row }) => <Badge variant={unitStatusVariant(row.original.unitStatus)}>{unitStatusLabel(row.original.unitStatus)}</Badge>,
    },
    {
      accessorKey: "intendedUse",
      header: "Intended Use",
      cell: ({ row }) => <Badge variant={intendedUseVariant(row.original.intendedUse)}>{intendedUseLabel(row.original.intendedUse)}</Badge>,
    },
    { accessorKey: "folderName", header: "Location" },
    { accessorKey: "vendorName", header: "Supplier" },
    {
      accessorKey: "trackingNumber",
      header: "Tracking",
      cell: ({ row }) => row.original.trackingNumber ? <span className="font-mono text-xs">{row.original.trackingNumber}</span> : "—",
    },
    { accessorKey: "receivedDate", header: "Received" },
  ], []);

  const isFiltered = search !== "" || statusFilter !== "all" || useFilter !== "all" || productFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setUseFilter("all"); setProductFilter("all"); };

  if (!hasFeature("serialUnits")) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border max-w-md">
          <CardTitle className="text-2xl font-bold mb-4">Not available in this mode</CardTitle>
          <CardContent><p className="text-muted-foreground">Serialized device tracking is part of Warehouse mode.</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent><p className="text-muted-foreground">You do not have permission to view devices.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Cpu className="h-8 w-8 text-primary" /> Devices
        </h1>
        <p className="text-muted-foreground mt-1">
          Every serialized unit. Filter by status, intended use (production / POC / pending), or product.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by serial or product…"
            className="pl-8 pr-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {UNIT_STATUSES.map((s) => <SelectItem key={s} value={s}>{unitStatusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={useFilter} onValueChange={setUseFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All uses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All intended uses</SelectItem>
            {INTENDED_USES.map((u) => <SelectItem key={u} value={u}>{intendedUseLabel(u)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All products" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {inventoryItems.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {isFiltered && (
          <button type="button" onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      <Card className="flex-grow rounded-md border">
        <CardContent className="pt-6">
          {isLoadingUnits ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading devices…</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {rows.length} device{rows.length === 1 ? "" : "s"}{isFiltered ? " match your filters" : ""}.
              </p>
              <DataTable columns={columns} data={rows} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DevicesPage;

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck, Trash2, Printer, Loader2, PackageCheck } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useInventoryUnits } from "@/context/InventoryUnitsContext";
import { useMerchants } from "@/context/MerchantsContext";
import { usePartners } from "@/context/PartnersContext";
import { useShipments } from "@/context/ShipmentsContext";
import { useProfile } from "@/context/ProfileContext";
import { useBusinessMode } from "@/hooks/useBusinessMode";
import { usePrint } from "@/context/PrintContext";
import { showError, showSuccess } from "@/utils/toast";

const ShipPage: React.FC = () => {
  const { hasFeature } = useBusinessMode();
  const { profile } = useProfile();
  const { inventoryItems } = useInventory();
  const { units, shipUnits } = useInventoryUnits();
  const { merchants } = useMerchants();
  const { partners } = usePartners();
  const { createShipment } = useShipments();
  const { initiatePrint } = usePrint();

  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  const [merchantId, setMerchantId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipDate, setShipDate] = useState(new Date().toISOString().split("T")[0]);
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const productName = useMemo(() => new Map(inventoryItems.map((i) => [i.id, i.name])), [inventoryItems]);
  const selectedMerchant = merchants.find((m) => m.id === merchantId);
  const partnerName = selectedMerchant?.partnerId ? partners.find((p) => p.id === selectedMerchant.partnerId)?.name : undefined;

  // Allocated units for the chosen merchant (candidates for this shipment).
  const allocated = useMemo(
    () => units.filter((u) => u.merchantId === merchantId && u.unitStatus === "allocated"),
    [units, merchantId],
  );
  const included = useMemo(() => allocated.filter((u) => !excluded.has(u.id)), [allocated, excluded]);

  const buildSlipProps = (slipNumber: string) => ({
    slipNumber,
    shipDate,
    merchantName: selectedMerchant?.name || "—",
    merchantAddress: selectedMerchant?.shippingAddress,
    partnerName,
    paymentStatus: selectedMerchant?.paymentStatus,
    trackingNumber: trackingNumber.trim() || undefined,
    items: included.map((u) => ({ productName: productName.get(u.productId) || "—", serialNumber: u.serialNumber })),
    notes: notes.trim() || undefined,
  });

  const toggleExclude = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handlePreview = () => {
    if (!merchantId) { showError("Select a merchant first."); return; }
    if (included.length === 0) { showError("No units to include on the slip."); return; }
    initiatePrint({ type: "packing-slip", props: buildSlipProps("PREVIEW") });
  };

  const handleShip = async () => {
    if (!canManage) { showError("You don't have permission to ship."); return; }
    if (!merchantId) { showError("Select a merchant first."); return; }
    if (included.length === 0) { showError("Select at least one unit to ship."); return; }

    setSaving(true);
    try {
      const shipment = await createShipment({
        merchantId,
        shipDate,
        trackingNumber: trackingNumber.trim() || undefined,
        carrier: carrier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      const ids = included.map((u) => u.id);
      const slipProps = buildSlipProps(shipment.id.slice(0, 8).toUpperCase());
      await shipUnits(ids, shipment.id, trackingNumber.trim() || undefined);
      showSuccess(`Shipped ${ids.length} unit${ids.length === 1 ? "" : "s"} to ${selectedMerchant?.name || "merchant"}.`);
      initiatePrint({ type: "packing-slip", props: slipProps });
      setExcluded(new Set());
      setTrackingNumber("");
      setCarrier("");
      setNotes("");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to ship.");
    } finally {
      setSaving(false);
    }
  };

  if (!hasFeature("serialUnits")) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border max-w-md">
          <CardTitle className="text-2xl font-bold mb-4">Not available in this mode</CardTitle>
          <CardContent><p className="text-muted-foreground">Shipping &amp; packing slips are part of Warehouse mode.</p></CardContent>
        </Card>
      </div>
    );
  }
  if (!canManage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent><p className="text-muted-foreground">You do not have permission to ship inventory.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" /> Ship &amp; Packing Slip
        </h1>
        <p className="text-muted-foreground mt-1">
          Pick a merchant with allocated units, add a tracking number, then ship the batch and print a packing slip.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Shipment details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Merchant <span className="text-red-500">*</span></Label>
            <Select value={merchantId} onValueChange={(v) => { setMerchantId(v); setExcluded(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Select merchant" /></SelectTrigger>
              <SelectContent>
                {merchants.length > 0 ? (
                  merchants.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)
                ) : (
                  <SelectItem value="none" disabled>No merchants yet</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tracking">Tracking number</Label>
            <Input id="tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. FedEx 1234 5678 9012" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="carrier">Carrier</Label>
            <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. FedEx" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shipDate">Ship date</Label>
            <Input id="shipDate" type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="shipNotes">Notes (optional)</Label>
            <Textarea id="shipNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">
            Units to ship ({included.length}{allocated.length !== included.length ? ` of ${allocated.length}` : ""})
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={included.length === 0}>
              <Printer className="h-4 w-4 mr-2" /> Preview slip
            </Button>
            <Button onClick={handleShip} disabled={saving || included.length === 0 || !merchantId}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Shipping…</> : <><PackageCheck className="h-4 w-4 mr-2" /> Ship &amp; print</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!merchantId ? (
            <p className="py-12 text-center text-muted-foreground">Select a merchant to see their allocated units.</p>
          ) : allocated.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">This merchant has no allocated units waiting to ship.</p>
          ) : (
            <ScrollArea className="h-80 pr-2">
              <ul className="divide-y divide-border">
                {allocated.map((u) => {
                  const isExcluded = excluded.has(u.id);
                  return (
                    <li key={u.id} className={`flex items-center justify-between py-2 gap-2 ${isExcluded ? "opacity-40" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-sm truncate">{u.serialNumber}</span>
                        <span className="text-xs text-muted-foreground truncate">{productName.get(u.productId) || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExcluded && <Badge variant="muted">Excluded</Badge>}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => toggleExclude(u.id)} title={isExcluded ? "Include" : "Exclude from this shipment"}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {selectedMerchant && included.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Shipping <Badge variant="info" className="mx-1">{included.length}</Badge> unit{included.length === 1 ? "" : "s"} to{" "}
          <span className="font-medium text-foreground">{selectedMerchant.name}</span>
          {trackingNumber.trim() && <> · tracking <span className="font-mono">{trackingNumber.trim()}</span></>}
        </div>
      )}
    </div>
  );
};

export default ShipPage;

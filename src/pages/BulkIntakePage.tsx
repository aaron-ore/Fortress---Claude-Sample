import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScanBarcode, PackagePlus, Trash2, CheckCircle2, XCircle, Loader2, Save } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useVendors } from "@/context/VendorContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useInventoryUnits, NewUnitInput } from "@/context/InventoryUnitsContext";
import { useProfile } from "@/context/ProfileContext";
import { useBusinessMode } from "@/hooks/useBusinessMode";
import AddInventoryDialog from "@/components/AddInventoryDialog";
import { showError, showSuccess } from "@/utils/toast";

/** Short feedback tone — high for success, low for failure. Best-effort. */
const beep = (ok: boolean) => {
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 880 : 200;
    gain.gain.value = 0.05;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch {
    /* audio is a nicety; ignore failures */
  }
};

interface ScanRow {
  id: string;
  serial: string;
}

interface FeedEntry {
  id: string;
  serial: string;
  detail: string;
  status: "ok" | "dup";
}

/**
 * Bulk Intake — scan many serials fast with a USB/Bluetooth scanner (keyboard
 * wedge: types the serial + Enter). Batch header (product, supplier, date,
 * location) is set once; each scan appends a row; duplicates are rejected with
 * a warning + low beep. One click saves the whole batch as serialized units.
 */
const BulkIntakePage: React.FC = () => {
  const { hasFeature } = useBusinessMode();
  const { profile } = useProfile();
  const { inventoryItems } = useInventory();
  const { vendors } = useVendors();
  const { inventoryFolders } = useOnboarding();
  const { units, addUnitsBatch } = useInventoryUnits();

  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  // Batch header
  const [productId, setProductId] = useState("");
  const [vendorId, setVendorId] = useState("none");
  const [folderId, setFolderId] = useState("none");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);

  const [code, setCode] = useState("");
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  useEffect(() => { focusInput(); }, [focusInput]);

  // Serials already saved for this org (case-insensitive), for duplicate rejection.
  const existingSerials = useMemo(
    () => new Set(units.map((u) => u.serialNumber.trim().toLowerCase())),
    [units],
  );
  const batchSerials = useMemo(
    () => new Set(rows.map((r) => r.serial.trim().toLowerCase())),
    [rows],
  );

  const addFeed = (entry: Omit<FeedEntry, "id">) =>
    setFeed((prev) => [{ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }, ...prev].slice(0, 30));

  const handleScan = (raw: string) => {
    const serial = raw.trim();
    setCode("");
    if (!serial) return;

    // Debounce a scanner firing the same serial twice within 750ms.
    const now = Date.now();
    if (lastScanRef.current.value === serial.toLowerCase() && now - lastScanRef.current.at < 750) {
      focusInput();
      return;
    }
    lastScanRef.current = { value: serial.toLowerCase(), at: now };

    const lower = serial.toLowerCase();
    if (batchSerials.has(lower)) {
      beep(false);
      addFeed({ serial, detail: "Already scanned in this batch", status: "dup" });
      focusInput();
      return;
    }
    if (existingSerials.has(lower)) {
      beep(false);
      addFeed({ serial, detail: "Already exists in inventory", status: "dup" });
      focusInput();
      return;
    }

    setRows((prev) => [{ id: `${now}-${Math.random().toString(36).slice(2, 6)}`, serial }, ...prev]);
    beep(true);
    addFeed({ serial, detail: "Added", status: "ok" });
    focusInput();
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const handleSave = async () => {
    if (!canManage) {
      showError("You don't have permission to add inventory.");
      return;
    }
    if (!productId) {
      showError("Choose a product/model for this batch first.");
      return;
    }
    if (rows.length === 0) {
      showError("Scan at least one serial before saving.");
      return;
    }

    setSaving(true);
    try {
      const payload: NewUnitInput[] = rows.map((r) => ({
        productId,
        serialNumber: r.serial,
        vendorId: vendorId === "none" ? undefined : vendorId,
        folderId: folderId === "none" ? undefined : folderId,
        receivedDate,
      }));
      const inserted = await addUnitsBatch(payload);
      showSuccess(`Received ${inserted.length} unit${inserted.length === 1 ? "" : "s"}.`);
      setRows([]);
      setFeed([]);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to save batch.");
    } finally {
      setSaving(false);
      focusInput();
    }
  };

  if (!hasFeature("serialUnits")) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border max-w-md">
          <CardTitle className="text-2xl font-bold mb-4">Not available in this mode</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">Bulk Intake and serialized tracking are part of Warehouse mode.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to receive inventory.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedProduct = inventoryItems.find((i) => i.id === productId);

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ScanBarcode className="h-8 w-8 text-primary" /> Bulk Intake
        </h1>
        <p className="text-muted-foreground mt-1">
          Set the batch details once, then scan each serial number. Works with a USB/Bluetooth scanner or by typing + Enter.
        </p>
      </div>

      {/* Batch header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Batch details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Product / Model <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.length > 0 ? (
                    inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}{item.sku ? ` (${item.sku})` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No products yet — create one</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setAddProductOpen(true)} title="New product">
                <PackagePlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {inventoryFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receivedDate">Receiving date</Label>
            <Input id="receivedDate" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Scan input */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label htmlFor="serialScan" className="text-sm text-muted-foreground">
            Scan serial numbers {selectedProduct ? `for “${selectedProduct.name}”` : ""}
          </Label>
          <Input
            id="serialScan"
            ref={inputRef}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(code); } }}
            placeholder="Scan or type a serial, then press Enter"
            className="h-14 text-lg"
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            Each scan adds a row below. Duplicate serials (already scanned or already in inventory) are rejected with a low beep.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scanned rows */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Scanned units ({rows.length})</CardTitle>
            <Button onClick={handleSave} disabled={saving || rows.length === 0 || !productId}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save batch</>}
            </Button>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ScanBarcode className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">Scan a serial to begin.</p>
              </div>
            ) : (
              <ScrollArea className="h-80 pr-2">
                <ul className="divide-y divide-border">
                  {rows.map((r, idx) => (
                    <li key={r.id} className="flex items-center justify-between py-2 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground w-6 text-right tabular-nums">{rows.length - idx}</span>
                        <span className="font-mono text-sm truncate">{r.serial}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Scan feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Scan feed</CardTitle>
          </CardHeader>
          <CardContent>
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nothing scanned yet.</p>
            ) : (
              <ScrollArea className="h-80 pr-2">
                <ul className="space-y-2">
                  {feed.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-sm">
                      {e.status === "ok" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs truncate">{e.serial}</p>
                        <p className="text-xs text-muted-foreground">{e.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedProduct && rows.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Saving <Badge variant="info" className="mx-1">{rows.length}</Badge> unit{rows.length === 1 ? "" : "s"} of{" "}
          <span className="font-medium text-foreground">{selectedProduct.name}</span> as{" "}
          <Badge variant="success">Available</Badge>
        </div>
      )}

      <AddInventoryDialog isOpen={addProductOpen} onClose={() => { setAddProductOpen(false); focusInput(); }} />
    </div>
  );
};

export default BulkIntakePage;

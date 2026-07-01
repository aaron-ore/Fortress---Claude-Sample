import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScanBarcode, PlusCircle, Trash2, CheckCircle2, XCircle, Loader2, PackageCheck } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useInventoryUnits } from "@/context/InventoryUnitsContext";
import { useMerchants, PaymentStatus } from "@/context/MerchantsContext";
import { useProfile } from "@/context/ProfileContext";
import { useBusinessMode } from "@/hooks/useBusinessMode";
import AddEditMerchantDialog from "@/components/warehouse/AddEditMerchantDialog";
import { showError, showSuccess } from "@/utils/toast";
import { unitStatusLabel } from "@/lib/warehouseStatuses";

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
  } catch { /* ignore */ }
};

interface AllocRow { unitId: string; serial: string; productName: string; }
interface FeedEntry { id: string; serial: string; detail: string; status: "ok" | "err"; }

const AllocatePage: React.FC = () => {
  const { hasFeature } = useBusinessMode();
  const { profile } = useProfile();
  const { inventoryItems } = useInventory();
  const { units, allocateUnits } = useInventoryUnits();
  const { merchants, setMerchantPaymentStatus } = useMerchants();

  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  const [merchantId, setMerchantId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<AllocRow[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [merchantDialogOpen, setMerchantDialogOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  useEffect(() => { focusInput(); }, [focusInput]);

  const productName = useMemo(() => new Map(inventoryItems.map((i) => [i.id, i.name])), [inventoryItems]);
  // Available units, looked up by serial (case-insensitive).
  const availableBySerial = useMemo(() => {
    const map = new Map<string, typeof units[number]>();
    for (const u of units) if (u.unitStatus === "available") map.set(u.serialNumber.trim().toLowerCase(), u);
    return map;
  }, [units]);
  const unitBySerial = useMemo(() => {
    const map = new Map<string, typeof units[number]>();
    for (const u of units) map.set(u.serialNumber.trim().toLowerCase(), u);
    return map;
  }, [units]);
  const batchSerials = useMemo(() => new Set(rows.map((r) => r.serial.trim().toLowerCase())), [rows]);

  const selectedMerchant = merchants.find((m) => m.id === merchantId);

  const addFeed = (e: Omit<FeedEntry, "id">) =>
    setFeed((prev) => [{ ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }, ...prev].slice(0, 30));

  const handleScan = (raw: string) => {
    const serial = raw.trim();
    setCode("");
    if (!serial) return;

    const now = Date.now();
    const lower = serial.toLowerCase();
    if (lastScanRef.current.value === lower && now - lastScanRef.current.at < 750) { focusInput(); return; }
    lastScanRef.current = { value: lower, at: now };

    if (batchSerials.has(lower)) {
      beep(false); addFeed({ serial, detail: "Already scanned in this batch", status: "err" }); focusInput(); return;
    }
    const available = availableBySerial.get(lower);
    if (!available) {
      const existing = unitBySerial.get(lower);
      const reason = existing ? `Not available (${unitStatusLabel(existing.unitStatus)})` : "Not found in inventory";
      beep(false); addFeed({ serial, detail: reason, status: "err" }); focusInput(); return;
    }

    setRows((prev) => [{ unitId: available.id, serial, productName: productName.get(available.productId) || "—" }, ...prev]);
    beep(true); addFeed({ serial, detail: "Added", status: "ok" }); focusInput();
  };

  const removeRow = (unitId: string) => setRows((prev) => prev.filter((r) => r.unitId !== unitId));

  const handleAllocate = async () => {
    if (!canManage) { showError("You don't have permission to allocate."); return; }
    if (!merchantId) { showError("Select or create a merchant first."); return; }
    if (rows.length === 0) { showError("Scan at least one available serial."); return; }

    setSaving(true);
    try {
      const count = await allocateUnits(rows.map((r) => r.unitId), merchantId);
      if (selectedMerchant && selectedMerchant.paymentStatus !== paymentStatus) {
        await setMerchantPaymentStatus(merchantId, paymentStatus);
      }
      showSuccess(`Allocated ${count} unit${count === 1 ? "" : "s"} to ${selectedMerchant?.name || "merchant"}.`);
      setRows([]);
      setFeed([]);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Allocation failed.");
    } finally {
      setSaving(false);
      focusInput();
    }
  };

  // Keep the payment toggle in sync when a merchant is picked.
  useEffect(() => {
    if (selectedMerchant) setPaymentStatus(selectedMerchant.paymentStatus);
  }, [merchantId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasFeature("serialUnits")) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border max-w-md">
          <CardTitle className="text-2xl font-bold mb-4">Not available in this mode</CardTitle>
          <CardContent><p className="text-muted-foreground">Allocation is part of Warehouse mode.</p></CardContent>
        </Card>
      </div>
    );
  }
  if (!canManage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent><p className="text-muted-foreground">You do not have permission to allocate inventory.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PackageCheck className="h-8 w-8 text-primary" /> Allocate to Merchant
        </h1>
        <p className="text-muted-foreground mt-1">
          Pick a merchant, scan available serials to assign them, set payment status, then allocate the batch.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Merchant &amp; payment</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Merchant <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <Select value={merchantId} onValueChange={setMerchantId}>
                <SelectTrigger><SelectValue placeholder="Select merchant" /></SelectTrigger>
                <SelectContent>
                  {merchants.length > 0 ? (
                    merchants.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>No merchants yet — create one</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setMerchantDialogOpen(true)} title="New merchant">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            {selectedMerchant?.shippingAddress && (
              <p className="text-xs text-muted-foreground truncate">Ships to: {selectedMerchant.shippingAddress}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Payment status</Label>
            <ToggleGroup type="single" value={paymentStatus} onValueChange={(v) => v && setPaymentStatus(v as PaymentStatus)} className="bg-muted rounded-md p-1 w-fit">
              <ToggleGroupItem value="pending" className="px-4 data-[state=on]:bg-amber-500 data-[state=on]:text-white">Pending</ToggleGroupItem>
              <ToggleGroupItem value="paid" className="px-4 data-[state=on]:bg-green-600 data-[state=on]:text-white">Paid</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label htmlFor="allocScan" className="text-sm text-muted-foreground">Scan available serials to allocate</Label>
          <Input
            id="allocScan"
            ref={inputRef}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(code); } }}
            placeholder="Scan or type a serial, then press Enter"
            className="h-14 text-lg"
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">Only <strong>Available</strong> units can be allocated. Already-allocated, shipped, or unknown serials are rejected.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">To allocate ({rows.length})</CardTitle>
            <Button onClick={handleAllocate} disabled={saving || rows.length === 0 || !merchantId}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Allocating…</> : <><PackageCheck className="h-4 w-4 mr-2" /> Allocate batch</>}
            </Button>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ScanBarcode className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">Scan an available serial to begin.</p>
              </div>
            ) : (
              <ScrollArea className="h-80 pr-2">
                <ul className="divide-y divide-border">
                  {rows.map((r, idx) => (
                    <li key={r.unitId} className="flex items-center justify-between py-2 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground w-6 text-right tabular-nums">{rows.length - idx}</span>
                        <span className="font-mono text-sm truncate">{r.serial}</span>
                        <span className="text-xs text-muted-foreground truncate">{r.productName}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRow(r.unitId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Scan feed</CardTitle></CardHeader>
          <CardContent>
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nothing scanned yet.</p>
            ) : (
              <ScrollArea className="h-80 pr-2">
                <ul className="space-y-2">
                  {feed.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-sm">
                      {e.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
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

      {selectedMerchant && rows.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Allocating <Badge variant="info" className="mx-1">{rows.length}</Badge> unit{rows.length === 1 ? "" : "s"} to{" "}
          <span className="font-medium text-foreground">{selectedMerchant.name}</span>
          <span className="mx-1">·</span>
          <Badge variant={paymentStatus === "paid" ? "success" : "warning"}>{paymentStatus === "paid" ? "Paid" : "Pending"}</Badge>
        </div>
      )}

      <AddEditMerchantDialog
        isOpen={merchantDialogOpen}
        onClose={() => { setMerchantDialogOpen(false); focusInput(); }}
        onCreated={(m) => setMerchantId(m.id)}
      />
    </div>
  );
};

export default AllocatePage;

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ScanBarcode, Search, PackagePlus, MapPin,
  CheckCircle2, XCircle, AlertTriangle, Plus, Minus, Loader2,
} from "lucide-react";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useProfile } from "@/context/ProfileContext";
import AddInventoryDialog from "@/components/AddInventoryDialog";
import { showError } from "@/utils/toast";

type ScanMode = "check" | "in" | "out";

interface ScanLogEntry {
  id: string;
  time: string;
  name: string;
  sku: string;
  detail: string;
  status: "ok" | "notfound" | "error";
}

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

/**
 * Hand-scanner station. A USB barcode scanner acts as a keyboard wedge: it
 * types the code into the focused input and presses Enter. Each scan resolves
 * to a check / stock-in / stock-out against the matching item by SKU or
 * barcode. No camera required.
 */
const QuickScanStation: React.FC = () => {
  const { inventoryItems, updateInventoryItem } = useInventory();
  const { addStockMovement } = useStockMovement();
  const { inventoryFolders } = useOnboarding();
  const { profile } = useProfile();

  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";
  const currency = profile?.companyProfile?.companyCurrency || "$";
  const money = (n: number) => `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [scanMode, setScanMode] = useState<ScanMode>("check");
  const [step, setStep] = useState("1");
  const [code, setCode] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [log, setLog] = useState<ScanLogEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  useEffect(() => { focusInput(); }, [focusInput]);

  // Derive the current item from the live list so quantities stay fresh after
  // an adjustment.
  const current = useMemo(
    () => (currentId ? inventoryItems.find((i) => i.id === currentId) ?? null : null),
    [currentId, inventoryItems],
  );

  const lookup = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const it of inventoryItems) {
      if (it.sku) map.set(it.sku.trim().toLowerCase(), it);
      if (it.barcode) map.set(it.barcode.trim().toLowerCase(), it);
      if (it.barcodeUrl) map.set(it.barcodeUrl.trim().toLowerCase(), it);
    }
    return map;
  }, [inventoryItems]);

  const folderName = (id: string) => inventoryFolders.find((f) => f.id === id)?.name || "Unassigned";

  const addLog = (entry: Omit<ScanLogEntry, "id" | "time">) =>
    setLog((prev) => [
      { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, time: new Date().toLocaleTimeString() },
      ...prev,
    ].slice(0, 25));

  const stepValue = () => Math.max(1, parseInt(step || "1") || 1);

  const adjust = async (item: InventoryItem, delta: number) => {
    const newPicking = item.pickingBinQuantity + delta;
    if (newPicking < 0) throw new Error(`Only ${item.pickingBinQuantity} on hand — can't remove ${Math.abs(delta)}.`);
    await updateInventoryItem({
      ...item,
      pickingBinQuantity: newPicking,
      imageUrl: item.imageUrl,
      lastUpdated: new Date().toISOString().split("T")[0],
    });
    await addStockMovement({
      itemId: item.id,
      itemName: item.name,
      type: delta > 0 ? "add" : "subtract",
      amount: Math.abs(delta),
      oldQuantity: item.quantity,
      newQuantity: item.quantity + delta,
      reason: `Quick Scan: ${delta > 0 ? "Stock In" : "Stock Out"}`,
      folderId: item.folderId,
    });
  };

  const runAdjust = async (item: InventoryItem, delta: number) => {
    if (!canManage) {
      showError("You don't have permission to change stock.");
      return;
    }
    setBusy(true);
    try {
      await adjust(item, delta);
      beep(true);
      addLog({ name: item.name, sku: item.sku, detail: delta > 0 ? `Stock In +${delta}` : `Stock Out −${Math.abs(delta)}`, status: "ok" });
    } catch (e: unknown) {
      beep(false);
      const msg = e instanceof Error ? e.message : "Adjustment failed.";
      showError(msg);
      addLog({ name: item.name, sku: item.sku, detail: msg, status: "error" });
    } finally {
      setBusy(false);
      focusInput();
    }
  };

  const handleResolve = async (raw: string) => {
    const c = raw.trim();
    setCode("");
    if (!c) return;

    const item = lookup.get(c.toLowerCase()) || inventoryItems.find((i) => i.id === c) || null;

    if (!item) {
      setCurrentId(null);
      setNotFound(c);
      beep(false);
      addLog({ name: c, sku: "—", detail: "No match found", status: "notfound" });
      focusInput();
      return;
    }

    setNotFound(null);
    setCurrentId(item.id);

    if (scanMode === "check") {
      beep(true);
      addLog({ name: item.name, sku: item.sku, detail: `On hand: ${item.quantity}`, status: "ok" });
      focusInput();
      return;
    }

    await runAdjust(item, scanMode === "in" ? stepValue() : -stepValue());
  };

  const modeMeta: Record<ScanMode, { label: string; hint: string }> = {
    check: { label: "Check", hint: "Scan to look up an item — no changes are made." },
    in: { label: "Stock In", hint: `Each scan adds ${stepValue()} to on-hand stock.` },
    out: { label: "Stock Out", hint: `Each scan removes ${stepValue()} from on-hand stock.` },
  };

  const margin = current && current.retailPrice > 0
    ? ((current.retailPrice - current.unitCost) / current.retailPrice) * 100
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanBarcode className="h-5 w-5 text-primary" /> Scan Station
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Action</Label>
              <ToggleGroup
                type="single"
                value={scanMode}
                onValueChange={(v) => v && setScanMode(v as ScanMode)}
                className="bg-muted rounded-md p-1"
              >
                <ToggleGroupItem value="check" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Check</ToggleGroupItem>
                <ToggleGroupItem value="in" className="px-3 data-[state=on]:bg-green-600 data-[state=on]:text-white">Stock In</ToggleGroupItem>
                <ToggleGroupItem value="out" className="px-3 data-[state=on]:bg-red-600 data-[state=on]:text-white">Stock Out</ToggleGroupItem>
              </ToggleGroup>
            </div>
            {scanMode !== "check" && (
              <div className="space-y-1.5">
                <Label htmlFor="scanStep" className="text-xs text-muted-foreground">Qty per scan</Label>
                <Input
                  id="scanStep"
                  type="number"
                  min="1"
                  value={step}
                  onChange={(e) => setStep(e.target.value)}
                  className="w-24 h-10"
                />
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleResolve(code); } }}
              placeholder="Scan or type a barcode / SKU, then press Enter"
              className="h-14 pl-11 text-lg"
              disabled={busy}
            />
            {busy && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {modeMeta[scanMode].hint}
            {scanMode !== "check" && !canManage && " You don't have permission to change stock."}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {current ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold truncate">{current.name}</h3>
                    <p className="text-sm text-muted-foreground">SKU {current.sku}</p>
                  </div>
                  <Badge
                    variant={current.quantity <= 0 ? "destructive" : current.quantity <= current.reorderLevel ? "warning" : "success"}
                  >
                    {current.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">On hand</p>
                    <p className="text-4xl font-bold tabular-nums">{current.quantity}</p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-12 w-12" disabled={busy} onClick={() => runAdjust(current, -stepValue())}>
                        <Minus className="h-5 w-5" />
                      </Button>
                      <span className="w-10 text-center text-sm text-muted-foreground">{stepValue()}</span>
                      <Button size="icon" className="h-12 w-12" disabled={busy} onClick={() => runAdjust(current, stepValue())}>
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Unit cost</p>
                    <p className="font-medium">{money(current.unitCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retail price</p>
                    <p className="font-medium">{money(current.retailPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margin</p>
                    <p className="font-medium">{margin == null ? "—" : `${margin.toFixed(0)}%`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                    <p className="font-medium truncate">{folderName(current.folderId)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : notFound ? (
            <Card className="border-destructive/40">
              <CardContent className="pt-6 text-center space-y-3">
                <XCircle className="h-10 w-10 mx-auto text-destructive/70" />
                <div>
                  <p className="text-lg font-medium">No item matches “{notFound}”</p>
                  <p className="text-sm text-muted-foreground">It may not be in inventory yet.</p>
                </div>
                {canManage && (
                  <Button onClick={() => setAddOpen(true)}>
                    <PackagePlus className="h-4 w-4 mr-2" /> Create item with this SKU
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-2">
                <ScanBarcode className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">Scan an item to begin.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Recent scans</CardTitle>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nothing scanned yet.</p>
            ) : (
              <ScrollArea className="h-72 pr-2">
                <ul className="space-y-2">
                  {log.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-sm">
                      {e.status === "ok" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      ) : e.status === "notfound" ? (
                        <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{e.time.replace(/:\d\d /, " ")}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <AddInventoryDialog
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); focusInput(); }}
        initialSku={notFound || undefined}
      />
    </div>
  );
};

export default QuickScanStation;

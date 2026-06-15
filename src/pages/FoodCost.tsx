import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ClipboardList, Plus, Search, TrendingDown, ShoppingCart, Boxes, Trash2, Loader2, Calculator,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useStockCounts, StockCountLine } from "@/context/StockCountContext";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useOrders } from "@/context/OrdersContext";
import { useProfile } from "@/context/ProfileContext";
import { showError } from "@/utils/toast";

const today = () => new Date().toISOString().slice(0, 10);
const prettyDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

// ── New count dialog ────────────────────────────────────────────────────────
interface NewCountDialogProps {
  open: boolean;
  onClose: () => void;
}

const NewCountDialog: React.FC<NewCountDialogProps> = ({ open, onClose }) => {
  const { createStockCount } = useStockCounts();
  const { inventoryItems } = useInventory();
  const { inventoryFolders } = useOnboarding();
  const restaurantLocations = inventoryFolders.filter((f) => f.locationType === "restaurant");

  const [locationId, setLocationId] = useState<string>("all");
  const [countDate, setCountDate] = useState(today());
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocationId("all");
      setCountDate(today());
      setSearch("");
      // Pre-fill each item with its current system quantity so a full count is
      // fast — the owner just adjusts the few that differ from the shelf.
      const seed: Record<string, string> = {};
      inventoryItems.forEach((i) => { seed[i.id] = String(i.quantity ?? 0); });
      setQty(seed);
      setSaving(false);
    }
  }, [open, inventoryItems]);

  const filtered = inventoryItems.filter(
    (i) => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = async () => {
    const lines: StockCountLine[] = inventoryItems
      .map((i) => ({ inventoryItemId: i.id, quantity: parseFloat(qty[i.id] ?? "") }))
      .filter((l) => Number.isFinite(l.quantity));
    if (lines.length === 0) { showError("Enter at least one quantity."); return; }
    setSaving(true);
    const result = await createStockCount({
      locationId: locationId === "all" ? null : locationId,
      countDate,
      lines,
    });
    setSaving(false);
    if (result) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Count your stock</DialogTitle>
          <DialogDescription>
            Enter how much you have on the shelf right now. We pre-filled your system numbers — just fix the ones that are off.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {restaurantLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="count-date">Date</Label>
            <Input id="count-date" type="date" value={countDate} onChange={(e) => setCountDate(e.target.value)} />
          </div>
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>

        <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">No items found.</p>
          ) : filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.sku}</p>
              </div>
              <Input
                type="number"
                inputMode="decimal"
                className="w-24 h-9 text-right"
                value={qty[item.id] ?? ""}
                onChange={(e) => setQty((p) => ({ ...p, [item.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save count
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Main page ───────────────────────────────────────────────────────────────
const FoodCost = () => {
  const { stockCounts, isLoading, fetchCountLines, deleteStockCount } = useStockCounts();
  const { inventoryItems } = useInventory();
  const { inventoryFolders } = useOnboarding();
  const { orders } = useOrders();
  const { profile } = useProfile();

  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";
  const currency = profile?.companyProfile?.companyCurrency || "$";
  const money = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [lines, setLines] = useState<{ curr: StockCountLine[]; prev: StockCountLine[] } | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  const itemById = useMemo(() => new Map(inventoryItems.map((i) => [i.id, i])), [inventoryItems]);
  const folderName = (id: string | null) => (id ? inventoryFolders.find((f) => f.id === id)?.name || "Location" : "All locations");

  // Default the selection to the most recent count.
  useEffect(() => {
    if (!selectedId && stockCounts.length > 0) setSelectedId(stockCounts[0].id);
  }, [stockCounts, selectedId]);

  const selected = stockCounts.find((c) => c.id === selectedId) || null;
  // The "previous" count is the next-older count for the SAME location.
  const previous = useMemo(() => {
    if (!selected) return null;
    const sameLocation = stockCounts.filter((c) => c.locationId === selected.locationId);
    const idx = sameLocation.findIndex((c) => c.id === selected.id);
    return idx >= 0 && idx + 1 < sameLocation.length ? sameLocation[idx + 1] : null;
  }, [selected, stockCounts]);

  // Load the line items for the selected + previous counts.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selected || !previous) { setLines(null); return; }
      setLoadingResult(true);
      const [curr, prev] = await Promise.all([
        fetchCountLines(selected.id),
        fetchCountLines(previous.id),
      ]);
      if (!cancelled) { setLines({ curr, prev }); setLoadingResult(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [selected, previous, fetchCountLines]);

  const result = useMemo(() => {
    if (!selected || !previous || !lines) return null;
    const prevQty = new Map(lines.prev.map((l) => [l.inventoryItemId, l.quantity]));
    const currQty = new Map(lines.curr.map((l) => [l.inventoryItemId, l.quantity]));

    // Purchases received in the window (previous date, this date], for this location.
    const purch = new Map<string, { qty: number; costSum: number; costedQty: number }>();
    for (const o of orders) {
      if (o.type !== "Purchase") continue;
      if (selected.locationId && (o.locationId || null) !== selected.locationId) continue;
      const d = (o.date || "").slice(0, 10);
      if (!(d > previous.countDate && d <= selected.countDate)) continue;
      for (const line of o.items || []) {
        if (!line.inventoryItemId) continue;
        const agg = purch.get(line.inventoryItemId) || { qty: 0, costSum: 0, costedQty: 0 };
        agg.qty += line.quantity;
        if (line.unitCostAtReceipt != null && line.quantity > 0) {
          agg.costSum += line.unitCostAtReceipt * line.quantity;
          agg.costedQty += line.quantity;
        }
        purch.set(line.inventoryItemId, agg);
      }
    }

    const ids = new Set<string>([...prevQty.keys(), ...currQty.keys(), ...purch.keys()]);
    let purchasesTotal = 0, usageTotal = 0, onHandTotal = 0;
    const rows: { id: string; name: string; usageQty: number; usageCost: number }[] = [];

    for (const id of ids) {
      const item = itemById.get(id);
      const begin = prevQty.get(id) ?? 0;
      const end = currQty.get(id) ?? 0;
      const p = purch.get(id) ?? { qty: 0, costSum: 0, costedQty: 0 };
      const price = p.costedQty > 0 ? p.costSum / p.costedQty : item?.unitCost ?? 0;
      const usageQty = begin + p.qty - end;
      const usageCost = usageQty * price;
      purchasesTotal += p.qty * price;
      usageTotal += usageCost;
      onHandTotal += end * price;
      if (usageQty > 0) rows.push({ id, name: item?.name ?? "Unknown item", usageQty, usageCost });
    }

    rows.sort((a, b) => b.usageCost - a.usageCost);
    return { purchasesTotal, usageTotal, onHandTotal, top: rows.slice(0, 8), itemCount: ids.size };
  }, [selected, previous, lines, orders, itemById]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingDown className="h-7 w-7 text-primary" /> Food Cost
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Count your stock every so often. We compare it to your last count and what you bought in between, and show what you used and spent.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsNewOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" /> New Count
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : stockCounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-lg font-medium">Do your first stock count</p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Enter how much you have on hand today. Next time you count, we'll show what you used and spent in between — no setup, no jargon.
            </p>
            {canManage && (
              <Button onClick={() => setIsNewOpen(true)}><Plus className="h-4 w-4 mr-2" /> Count Stock</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Results */}
          {stockCounts.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" /> Results
                  </CardTitle>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stockCounts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {prettyDate(c.countDate)} · {folderName(c.locationId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingResult ? (
                  <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Calculating...
                  </div>
                ) : !previous ? (
                  <p className="text-sm text-muted-foreground py-4">
                    This is the earliest count for {folderName(selected?.locationId ?? null)}. Do another count later to see usage and spend.
                  </p>
                ) : result ? (
                  <div className="space-y-4">
                    <p className="text-sm">
                      Between <span className="font-medium">{prettyDate(previous.countDate)}</span> and{" "}
                      <span className="font-medium">{prettyDate(selected!.countDate)}</span>
                      {selected!.locationId ? <> at <span className="font-medium">{folderName(selected!.locationId)}</span></> : null}, you bought{" "}
                      <span className="font-semibold">{money(result.purchasesTotal)}</span> of inventory and used about{" "}
                      <span className="font-semibold">{money(result.usageTotal)}</span> worth.
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border p-3">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground mb-1" />
                        <p className="text-xl font-bold tabular-nums break-words leading-tight">{money(result.purchasesTotal)}</p>
                        <p className="text-xs text-muted-foreground">Purchased</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <TrendingDown className="h-4 w-4 text-muted-foreground mb-1" />
                        <p className="text-xl font-bold tabular-nums break-words leading-tight">{money(result.usageTotal)}</p>
                        <p className="text-xs text-muted-foreground">Used</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <Boxes className="h-4 w-4 text-muted-foreground mb-1" />
                        <p className="text-xl font-bold tabular-nums break-words leading-tight">{money(result.onHandTotal)}</p>
                        <p className="text-xs text-muted-foreground">On hand now</p>
                      </div>
                    </div>

                    {result.top.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Where it went</p>
                        <ul className="space-y-1">
                          {result.top.map((r) => (
                            <li key={r.id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{r.name}</span>
                              <span className="font-medium shrink-0 ml-2 tabular-nums">{money(r.usageCost)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Counts list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stock counts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {stockCounts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium">{prettyDate(c.countDate)}</p>
                      <p className="text-xs text-muted-foreground">{folderName(c.locationId)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.id === stockCounts[0].id && <Badge variant="secondary">Latest</Badge>}
                      {canManage && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setToDelete(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Want expected-vs-actual variance using recipes and POS sales?{" "}
        <Link to="/variance" className="text-primary hover:underline">Open advanced food-cost variance</Link>.
      </p>

      <NewCountDialog open={isNewOpen} onClose={() => setIsNewOpen(false)} />

      {toDelete && (
        <ConfirmDialog
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={async () => { await deleteStockCount(toDelete); setToDelete(null); }}
          title="Delete this stock count?"
          description="This removes the count and its quantities. This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default FoodCost;

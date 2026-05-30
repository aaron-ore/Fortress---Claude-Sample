import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2, Save, Search } from "lucide-react";
import PeriodPicker from "@/components/variance/PeriodPicker";
import { useProfile } from "@/context/ProfileContext";
import { useInventory } from "@/context/InventoryContext";
import { useUnitOfMeasure } from "@/context/UnitOfMeasureContext";
import { useVariancePeriods } from "@/context/VariancePeriodContext";
import { useInventoryCounts, CountType } from "@/context/InventoryCountContext";
import { showError } from "@/utils/toast";

const VarianceCounts = () => {
  const { profile } = useProfile();
  const { inventoryItems } = useInventory();
  const { units } = useUnitOfMeasure();
  const { periods } = useVariancePeriods();
  const { fetchCountsForPeriod, saveCounts } = useInventoryCounts();
  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  const [periodId, setPeriodId] = useState("");
  const [countType, setCountType] = useState<CountType>("beginning");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // counted values keyed by `${countType}:${itemId}`
  const [values, setValues] = useState<Record<string, string>>({});

  const period = periods.find((p) => p.id === periodId);
  const unitAbbr = (id?: string) => units.find((u) => u.id === id)?.abbreviation || "—";

  const locationItems = useMemo(() => {
    if (!period) return [];
    const inLocation = inventoryItems.filter((i) => i.folderId === period.locationId);
    return inLocation.length > 0 ? inLocation : inventoryItems;
  }, [inventoryItems, period]);

  const filtered = locationItems.filter(
    (i) => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const loadCounts = async (id: string) => {
    if (!id) { setValues({}); return; }
    setLoading(true);
    const counts = await fetchCountsForPeriod(id);
    const next: Record<string, string> = {};
    for (const c of counts) next[`${c.countType}:${c.inventoryItemId}`] = String(c.countedQty);
    setValues(next);
    setLoading(false);
  };

  useEffect(() => { loadCounts(periodId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodId]);

  const key = (itemId: string) => `${countType}:${itemId}`;
  const setVal = (itemId: string, v: string) => setValues((p) => ({ ...p, [key(itemId)]: v }));

  const handleSave = async () => {
    if (!period) return showError("Select a period first.");
    setSaving(true);
    const toSave = locationItems
      .map((i) => ({ inventoryItemId: i.id, raw: values[key(i.id)] }))
      .filter((r) => r.raw !== undefined && r.raw !== "")
      .map((r) => ({ inventoryItemId: r.inventoryItemId, countedQty: parseFloat(r.raw as string) }))
      .filter((r) => Number.isFinite(r.countedQty));
    await saveCounts(period.id, period.locationId, countType, toSave);
    setSaving(false);
  };

  const enteredCount = locationItems.filter((i) => values[key(i.id)] !== undefined && values[key(i.id)] !== "").length;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-primary" /> Physical Counts
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter beginning and ending counts for a period, in each item's usage unit.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Period</CardTitle></CardHeader>
        <CardContent><PeriodPicker value={periodId} onChange={setPeriodId} canManage={canManage} /></CardContent>
      </Card>

      {!periodId ? (
        <p className="text-muted-foreground text-sm">Select a period to enter counts.</p>
      ) : (
        <>
          {/* Count-type toggle — large tap targets */}
          <div className="grid grid-cols-2 gap-2">
            {(["beginning", "ending"] as CountType[]).map((t) => (
              <Button
                key={t}
                variant={countType === t ? "default" : "outline"}
                className="h-12 text-base capitalize"
                onClick={() => setCountType(t)}
              >
                {t} count
              </Button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-11" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading counts...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items to count for this location.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.sku} · unit: {unitAbbr(item.usageUnitId)}
                      {!item.usageUnitId && <span className="text-amber-600"> (no usage unit set)</span>}
                    </div>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    className="w-28 h-12 text-lg text-right"
                    placeholder="0"
                    value={values[key(item.id)] ?? ""}
                    onChange={(e) => setVal(item.id, e.target.value)}
                    disabled={!canManage}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Sticky save bar */}
          <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-3 flex items-center justify-between gap-3 md:pl-64">
            <span className="text-sm text-muted-foreground">
              <Badge variant="secondary" className="mr-1">{enteredCount}</Badge> {countType} counts entered
            </span>
            <Button className="h-11 px-6" onClick={handleSave} disabled={saving || !canManage}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save {countType} counts
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default VarianceCounts;

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingDown, Loader2, AlertTriangle, Info } from "lucide-react";
import PeriodPicker from "@/components/variance/PeriodPicker";
import { useProfile } from "@/context/ProfileContext";
import { useInventory } from "@/context/InventoryContext";
import { useRecipes } from "@/context/RecipeContext";
import { useOrders } from "@/context/OrdersContext";
import { useSalesImport } from "@/context/SalesImportContext";
import { useInventoryCounts } from "@/context/InventoryCountContext";
import { useVariancePeriods } from "@/context/VariancePeriodContext";
import { supabase } from "@/lib/supabaseClient";
import {
  computeVariance,
  VarianceResult,
  VarianceInput,
  VarianceRecipe,
} from "@/lib/varianceEngine";

interface Meta {
  unmappedSalesRows: number;
  unmappedSalesQty: number;
  purchaseLineCount: number;
}

const VarianceReport = () => {
  const { profile } = useProfile();
  const { inventoryItems } = useInventory();
  const { recipes } = useRecipes();
  const { orders } = useOrders();
  const { fetchSalesForPeriod } = useSalesImport();
  const { fetchCountsForPeriod } = useInventoryCounts();
  const { periods } = useVariancePeriods();
  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  const [periodId, setPeriodId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VarianceResult | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);

  const period = periods.find((p) => p.id === periodId);
  const currency = profile?.companyProfile?.companyCurrency || "$";
  const money = (n: number) => `${currency}${n.toFixed(2)}`;
  const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

  const compute = async (pid: string) => {
    if (!pid || !profile?.organizationId) { setResult(null); setMeta(null); return; }
    const per = periods.find((p) => p.id === pid);
    if (!per) return;
    setLoading(true);

    // Recipe ingredients (grouped per recipe) for the org.
    const { data: ingRows } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("organization_id", profile.organizationId);
    const ingredientsByRecipe = new Map<string, VarianceRecipe["ingredients"]>();
    for (const row of ingRows || []) {
      const list = ingredientsByRecipe.get(row.recipe_id) || [];
      list.push({
        inventoryItemId: row.inventory_item_id || null,
        quantity: parseFloat(row.quantity) || 0,
        unitId: row.unit_id || null,
      });
      ingredientsByRecipe.set(row.recipe_id, list);
    }

    // Sales + counts for this period.
    const [sales, counts] = await Promise.all([
      fetchSalesForPeriod(pid),
      fetchCountsForPeriod(pid),
    ]);

    // Purchases: orders type=Purchase, same location, within the date window.
    const purchases: VarianceInput["purchases"] = [];
    let purchaseLineCount = 0;
    for (const o of orders) {
      if (o.type !== "Purchase") continue;
      if ((o.locationId || "") !== per.locationId) continue;
      const dateOnly = (o.date || "").slice(0, 10);
      if (dateOnly < per.startDate || dateOnly > per.endDate) continue;
      for (const line of o.items || []) {
        if (!line.inventoryItemId) continue;
        purchases.push({
          inventoryItemId: line.inventoryItemId,
          quantity: line.quantity,
          unitCostAtReceipt: line.unitCostAtReceipt ?? null,
        });
        purchaseLineCount++;
      }
    }

    const input: VarianceInput = {
      items: inventoryItems.map((i) => ({
        id: i.id,
        name: i.name,
        usageUnitId: i.usageUnitId ?? null,
        unitCost: i.unitCost,
      })),
      recipes: recipes.map((r) => ({
        id: r.id,
        outputQuantity: r.outputQuantity,
        ingredients: ingredientsByRecipe.get(r.id) || [],
      })),
      sales: sales
        .filter((s) => s.recipeId)
        .map((s) => ({ recipeId: s.recipeId as string, qtySold: s.qtySold })),
      counts: (() => {
        const byItem = new Map<string, { beginningQty: number; endingQty: number }>();
        for (const c of counts) {
          const prev = byItem.get(c.inventoryItemId) || { beginningQty: 0, endingQty: 0 };
          if (c.countType === "beginning") prev.beginningQty = c.countedQty;
          else prev.endingQty = c.countedQty;
          byItem.set(c.inventoryItemId, prev);
        }
        return [...byItem.entries()].map(([inventoryItemId, v]) => ({ inventoryItemId, ...v }));
      })(),
      purchases,
    };

    const unmapped = sales.filter((s) => !s.recipeId);
    setMeta({
      unmappedSalesRows: unmapped.length,
      unmappedSalesQty: unmapped.reduce((a, s) => a + s.qtySold, 0),
      purchaseLineCount,
    });
    setResult(computeVariance(input));
    setLoading(false);
  };

  useEffect(() => { compute(periodId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodId, orders, inventoryItems, recipes]);

  const heroPositive = (result?.heroNumber ?? 0) >= 0;
  const activeLines = result?.lines.filter((l) => !l.hasSetupError) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingDown className="h-7 w-7 text-primary" /> Food Cost Variance
        </h1>
        <p className="text-muted-foreground mt-1">
          Actual usage vs. theoretical usage, priced per item. The hero number is what you lost to variance this period.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Period</CardTitle></CardHeader>
        <CardContent><PeriodPicker value={periodId} onChange={setPeriodId} canManage={canManage} /></CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Computing variance...
        </div>
      ) : !periodId ? (
        <p className="text-muted-foreground text-sm">Select a period to see its variance.</p>
      ) : result ? (
        <>
          {/* Hero number */}
          <Card className={heroPositive ? "border-red-500/40" : "border-emerald-500/40"}>
            <CardContent className="py-8 text-center">
              <p className="text-sm uppercase tracking-wide text-muted-foreground mb-1">
                {heroPositive ? "Lost to variance" : "Favorable variance"}
              </p>
              <p className={`text-5xl font-bold ${heroPositive ? "text-red-500" : "text-emerald-500"}`}>
                {money(Math.abs(result.heroNumber))}
              </p>
              {period && (
                <p className="text-sm text-muted-foreground mt-2">
                  {period.name} · {period.startDate} → {period.endDate}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Warnings */}
          {meta && meta.unmappedSalesRows > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <span>{meta.unmappedSalesRows} sales row(s) ({meta.unmappedSalesQty} units) are not mapped to a recipe and are excluded from theoretical usage. Map them on the POS Mapping screen.</span>
            </div>
          )}
          {result.setupErrors.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="flex items-center gap-1.5 font-medium text-amber-600 mb-1">
                <AlertTriangle className="h-4 w-4" /> {result.setupErrors.length} setup issue(s) — excluded from the number
              </div>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                {result.setupErrors.map((e, i) => <li key={i}><span className="font-medium">{e.itemName}:</span> {e.reason}</li>)}
              </ul>
            </div>
          )}

          {/* Per-item table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Per-item breakdown <Badge variant="secondary">{activeLines.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-4 w-4" /> No activity yet — import sales, enter counts, and receive purchases for this period.
                </p>
              ) : (
                <ScrollArea className="w-full">
                  <table className="w-full text-sm min-w-[820px]">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="px-2 py-2">Item</th>
                        <th className="px-2 py-2 text-right">Begin</th>
                        <th className="px-2 py-2 text-right">Purch</th>
                        <th className="px-2 py-2 text-right">End</th>
                        <th className="px-2 py-2 text-right">Actual</th>
                        <th className="px-2 py-2 text-right">Theoretical</th>
                        <th className="px-2 py-2 text-right">Var units</th>
                        <th className="px-2 py-2 text-right">Unit {currency}</th>
                        <th className="px-2 py-2 text-right">Var {currency}</th>
                        <th className="px-2 py-2 text-right">Var %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lines.map((l) => (
                        <tr key={l.itemId} className={`border-b border-border/60 ${l.hasSetupError ? "opacity-50" : ""}`}>
                          <td className="px-2 py-1.5">
                            {l.itemName}
                            {l.hasSetupError && <Badge variant="outline" className="ml-1.5 text-[10px]">setup</Badge>}
                            {l.priceSource === "fallback" && !l.hasSetupError && (
                              <span className="ml-1.5 text-[10px] text-muted-foreground">(std cost)</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">{l.beginningQty}</td>
                          <td className="px-2 py-1.5 text-right">{l.purchasesQty}</td>
                          <td className="px-2 py-1.5 text-right">{l.endingQty}</td>
                          <td className="px-2 py-1.5 text-right">{l.actualUsage.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right">{l.theoreticalUsage.toFixed(2)}</td>
                          <td className={`px-2 py-1.5 text-right font-medium ${l.varianceUnits > 0 ? "text-red-500" : l.varianceUnits < 0 ? "text-emerald-600" : ""}`}>
                            {l.varianceUnits.toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-right">{money(l.unitPrice)}</td>
                          <td className={`px-2 py-1.5 text-right font-medium ${l.varianceDollars > 0 ? "text-red-500" : l.varianceDollars < 0 ? "text-emerald-600" : ""}`}>
                            {money(l.varianceDollars)}
                          </td>
                          <td className="px-2 py-1.5 text-right">{pct(l.variancePercent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default VarianceReport;

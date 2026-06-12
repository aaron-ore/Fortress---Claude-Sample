import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Loader2, CalendarRange } from "lucide-react";
import PeriodPicker from "@/components/variance/PeriodPicker";
import VarianceWorkflowSteps from "@/components/variance/VarianceWorkflowSteps";
import VarianceResultView from "@/components/variance/VarianceResultView";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingDown className="h-7 w-7 text-primary" /> Food Cost Variance
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Actual usage vs. theoretical usage, priced per item. The hero number is what you lost to variance this period.
          </p>
        </div>
        <div className="lg:shrink-0">
          <PeriodPicker value={periodId} onChange={setPeriodId} canManage={canManage} />
        </div>
      </div>

      <VarianceWorkflowSteps />

      {loading ? (
        <div className="text-center py-16 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Computing variance...
        </div>
      ) : !periodId ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <CalendarRange className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-lg font-medium">{periods.length === 0 ? "No variance periods yet" : "Choose a period"}</p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {periods.length === 0
                ? "Create a period with the New button above, then import sales, enter counts, and record purchases to see your variance."
                : "Select a period from the picker above to see its food-cost variance."}
            </p>
          </CardContent>
        </Card>
      ) : result ? (
        <VarianceResultView
          result={result}
          meta={meta}
          currency={currency}
          periodLabel={period ? `${period.name} · ${period.startDate} → ${period.endDate}` : undefined}
        />
      ) : null}
    </div>
  );
};

export default VarianceReport;

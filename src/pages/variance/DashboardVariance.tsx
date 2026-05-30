// Variance-first dashboard, wired to the live variance engine (no mock data).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingDown, TrendingUp, ArrowDownRight, ArrowUpRight, Upload, ClipboardList,
  Link2, Utensils, AlertTriangle, DollarSign, Percent, Flame, Loader2, CalendarPlus,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useProfile } from "@/context/ProfileContext";
import { useInventory } from "@/context/InventoryContext";
import { useRecipes } from "@/context/RecipeContext";
import { useOrders } from "@/context/OrdersContext";
import { useSalesImport } from "@/context/SalesImportContext";
import { useInventoryCounts } from "@/context/InventoryCountContext";
import { useVariancePeriods } from "@/context/VariancePeriodContext";
import { supabase } from "@/lib/supabaseClient";
import { computeVariance, VarianceResult, VarianceInput, VarianceRecipe } from "@/lib/varianceEngine";

type IngredientMap = Map<string, VarianceRecipe["ingredients"]>;

const CAT_COLORS = ["bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500", "bg-violet-500"];

const DashboardVariance = () => {
  const { profile } = useProfile();
  const { inventoryItems } = useInventory();
  const { recipes } = useRecipes();
  const { orders } = useOrders();
  const { fetchSalesForPeriod } = useSalesImport();
  const { fetchCountsForPeriod } = useInventoryCounts();
  const { periods, isLoading: periodsLoading } = useVariancePeriods();

  const currency = profile?.companyProfile?.companyCurrency || "$";
  const money = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;
  const money2 = (n: number) => `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VarianceResult | null>(null);
  const [trend, setTrend] = useState<{ label: string; variance: number }[]>([]);

  const itemById = useMemo(() => new Map(inventoryItems.map((i) => [i.id, i])), [inventoryItems]);

  // Default the active period to the most recent one.
  useEffect(() => {
    if (!activeId && periods.length > 0) setActiveId(periods[0].id);
  }, [periods, activeId]);

  const buildInput = (
    per: { locationId: string; startDate: string; endDate: string },
    ingredientsByRecipe: IngredientMap,
    sales: { recipeId?: string; qtySold: number }[],
    counts: { inventoryItemId: string; countType: string; countedQty: number }[],
  ): VarianceInput => {
    const purchases: VarianceInput["purchases"] = [];
    for (const o of orders) {
      if (o.type !== "Purchase" || (o.locationId || "") !== per.locationId) continue;
      const d = (o.date || "").slice(0, 10);
      if (d < per.startDate || d > per.endDate) continue;
      for (const line of o.items || []) {
        if (!line.inventoryItemId) continue;
        purchases.push({ inventoryItemId: line.inventoryItemId, quantity: line.quantity, unitCostAtReceipt: line.unitCostAtReceipt ?? null });
      }
    }
    const byItem = new Map<string, { beginningQty: number; endingQty: number }>();
    for (const c of counts) {
      const prev = byItem.get(c.inventoryItemId) || { beginningQty: 0, endingQty: 0 };
      if (c.countType === "beginning") prev.beginningQty = c.countedQty;
      else prev.endingQty = c.countedQty;
      byItem.set(c.inventoryItemId, prev);
    }
    return {
      items: inventoryItems.map((i) => ({ id: i.id, name: i.name, usageUnitId: i.usageUnitId ?? null, unitCost: i.unitCost })),
      recipes: recipes.map((r) => ({ id: r.id, outputQuantity: r.outputQuantity, ingredients: ingredientsByRecipe.get(r.id) || [] })),
      sales: sales.filter((s) => s.recipeId).map((s) => ({ recipeId: s.recipeId as string, qtySold: s.qtySold })),
      counts: [...byItem.entries()].map(([inventoryItemId, v]) => ({ inventoryItemId, ...v })),
      purchases,
    };
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!profile?.organizationId || periods.length === 0) { setLoading(false); setResult(null); setTrend([]); return; }
      setLoading(true);

      // Recipe ingredients (once for all periods).
      const { data: ingRows } = await supabase
        .from("recipe_ingredients").select("*").eq("organization_id", profile.organizationId);
      const ingredientsByRecipe: IngredientMap = new Map();
      for (const row of ingRows || []) {
        const list = ingredientsByRecipe.get(row.recipe_id) || [];
        list.push({ inventoryItemId: row.inventory_item_id || null, quantity: parseFloat(row.quantity) || 0, unitId: row.unit_id || null });
        ingredientsByRecipe.set(row.recipe_id, list);
      }

      // Compute the last up-to-8 periods (chronological) plus the active one.
      const recent = periods.slice(0, 8);
      const ids = Array.from(new Set([activeId, ...recent.map((p) => p.id)].filter(Boolean)));
      const byId = new Map(periods.map((p) => [p.id, p]));
      const computed = await Promise.all(ids.map(async (id) => {
        const per = byId.get(id);
        if (!per) return [id, null] as const;
        const [sales, counts] = await Promise.all([fetchSalesForPeriod(id), fetchCountsForPeriod(id)]);
        return [id, computeVariance(buildInput(per, ingredientsByRecipe, sales, counts))] as const;
      }));
      if (cancelled) return;
      const resultById = new Map(computed);

      setResult(activeId ? resultById.get(activeId) ?? null : null);
      setTrend(
        [...recent].reverse().map((p) => ({ label: p.name.length > 10 ? p.name.slice(0, 10) : p.name, variance: resultById.get(p.id)?.heroNumber ?? 0 })),
      );
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, periods, orders, inventoryItems, recipes, profile?.organizationId]);

  // Derived metrics from the active result.
  const metrics = useMemo(() => {
    if (!result) return null;
    const clean = result.lines.filter((l) => !l.hasSetupError);
    const theoreticalCost = clean.reduce((s, l) => s + l.theoreticalUsage * l.unitPrice, 0);
    const actualCost = clean.reduce((s, l) => s + l.actualUsage * l.unitPrice, 0);
    const offenders = [...clean].filter((l) => l.varianceDollars !== 0).sort((a, b) => b.varianceDollars - a.varianceDollars).slice(0, 6);
    const flagged = clean.filter((l) => l.varianceDollars > 0).length;
    const catMap = new Map<string, number>();
    for (const l of clean) {
      const cat = itemById.get(l.itemId)?.category || "Uncategorized";
      catMap.set(cat, (catMap.get(cat) || 0) + l.varianceDollars);
    }
    const categories = [...catMap.entries()].map(([name, dollars]) => ({ name, dollars })).sort((a, b) => Math.abs(b.dollars) - Math.abs(a.dollars)).slice(0, 5);
    return {
      hero: result.heroNumber,
      theoreticalCost,
      actualCost,
      variancePct: theoreticalCost > 0 ? result.heroNumber / theoreticalCost : null,
      offenders,
      flagged,
      totalItems: clean.length,
      categories,
      setupErrors: result.setupErrors.length,
      hasActivity: clean.some((l) => l.theoreticalUsage !== 0 || l.actualUsage !== 0),
    };
  }, [result, itemById]);

  const activePeriod = periods.find((p) => p.id === activeId);
  const heroPositive = (metrics?.hero ?? 0) >= 0;
  const maxOffender = Math.max(1, ...(metrics?.offenders.map((o) => Math.abs(o.varianceDollars)) || [1]));
  const maxCat = Math.max(1, ...(metrics?.categories.map((c) => Math.abs(c.dollars)) || [1]));

  // ── Empty state: no periods yet ──
  if (!periodsLoading && periods.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <CalendarPlus className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <div>
              <p className="text-lg font-medium">No variance periods yet</p>
              <p className="text-muted-foreground text-sm mt-1">Create a period, import sales, enter counts and purchases to see your food-cost variance.</p>
            </div>
            <Button asChild><Link to="/variance">Go to Food Cost Variance</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Food-cost variance at a glance</p>
        </div>
        <Select value={activeId} onValueChange={setActiveId}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select period" /></SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} · {p.startDate} → {p.endDate}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Computing variance...
        </div>
      ) : !metrics ? (
        <p className="text-muted-foreground text-sm">Select a period to see its variance.</p>
      ) : (
        <>
          {/* Hero + KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className={`lg:col-span-1 ${heroPositive ? "border-red-500/40 bg-gradient-to-br from-red-500/10 to-transparent" : "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent"}`}>
              <CardContent className="p-6 flex flex-col h-full justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {heroPositive ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-emerald-500" />}
                  {heroPositive ? "Lost to variance this period" : "Favorable variance this period"}
                </div>
                <div className={`mt-2 text-5xl font-extrabold ${heroPositive ? "text-red-500" : "text-emerald-500"}`}>{money(Math.abs(metrics.hero))}</div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{pct(metrics.variancePct)} of theoretical cost</Badge>
                  {activePeriod && <span className="text-xs text-muted-foreground">{activePeriod.startDate} → {activePeriod.endDate}</span>}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <Kpi icon={<DollarSign className="h-4 w-4" />} label="Actual usage cost" value={money(metrics.actualCost)} sub="cost of stock consumed" />
              <Kpi icon={<Percent className="h-4 w-4" />} label="Theoretical cost" value={money(metrics.theoreticalCost)} sub="what recipes imply" />
              <Kpi icon={<Flame className="h-4 w-4" />} label="Biggest single loss"
                value={metrics.offenders[0] && metrics.offenders[0].varianceDollars > 0 ? money(metrics.offenders[0].varianceDollars) : "—"}
                sub={metrics.offenders[0] && metrics.offenders[0].varianceDollars > 0 ? metrics.offenders[0].itemName : "no losses"} tone="bad" />
              <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Items over recipe" value={`${metrics.flagged} of ${metrics.totalItems}`} sub="using more than theoretical" tone={metrics.flagged > 0 ? "bad" : "good"} />
            </div>
          </div>

          {/* No-activity hint */}
          {!metrics.hasActivity && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <span>This period has no sales, counts, or purchases yet. Use the quick actions below to add data.</span>
            </div>
          )}
          {metrics.setupErrors > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <span>{metrics.setupErrors} item(s) have a setup issue (missing usage unit or unit mismatch) and are excluded. Fix them on the items/recipes screens.</span>
            </div>
          )}

          {/* Trend + Offenders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Variance trend — recent periods</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  {trend.length <= 1 ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Not enough periods yet for a trend.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => money(v)} width={70} />
                        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [money2(v), "Variance"]} />
                        <Area type="monotone" dataKey="variance" stroke="#ef4444" strokeWidth={2} fill="url(#vg)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Worst offenders</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {metrics.offenders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No variance to show yet.</p>
                ) : metrics.offenders.map((o) => {
                  const loss = o.varianceDollars > 0;
                  return (
                    <div key={o.itemId}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{o.itemName}</span>
                        <span className={`font-medium tabular-nums ${loss ? "text-red-500" : "text-emerald-600"}`}>{money2(o.varianceDollars)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${loss ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${(Math.abs(o.varianceDollars) / maxOffender) * 100}%` }} />
                        </div>
                        <span className={`text-xs flex items-center ${loss ? "text-red-500" : "text-emerald-600"}`}>
                          {loss ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{pct(o.variancePercent)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown + Quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Variance by category</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-2">
                {metrics.categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No category data yet.</p>
                ) : metrics.categories.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-muted-foreground truncate">{c.name}</span>
                    <div className="h-3 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${CAT_COLORS[i % CAT_COLORS.length]}`} style={{ width: `${(Math.abs(c.dollars) / maxCat) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right text-sm font-medium tabular-nums">{money2(c.dollars)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-base">Close the gap</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Upload className="h-5 w-5" />, label: "Import sales", to: "/variance/sales-import" },
                  { icon: <Link2 className="h-5 w-5" />, label: "Map POS items", to: "/variance/mapping" },
                  { icon: <ClipboardList className="h-5 w-5" />, label: "Enter counts", to: "/variance/counts" },
                  { icon: <Utensils className="h-5 w-5" />, label: "Edit recipes", to: "/recipes" },
                ].map((a) => (
                  <Button key={a.label} asChild variant="outline" className="h-20 flex-col gap-2">
                    <Link to={a.to}>{a.icon}<span className="text-xs">{a.label}</span></Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm"><Link to="/variance">Open full variance report →</Link></Button>
          </div>
        </>
      )}
    </div>
  );
};

const Kpi = ({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: "bad" | "good" | "neutral" }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className={`mt-1 text-xs ${tone === "bad" ? "text-red-500" : tone === "good" ? "text-emerald-500" : "text-muted-foreground"}`}>{sub}</div>
    </CardContent>
  </Card>
);

export default DashboardVariance;

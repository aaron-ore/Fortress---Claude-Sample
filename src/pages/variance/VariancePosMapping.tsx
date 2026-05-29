import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import PeriodPicker from "@/components/variance/PeriodPicker";
import { useProfile } from "@/context/ProfileContext";
import { useRecipes } from "@/context/RecipeContext";
import { useSalesImport, MenuItemSale } from "@/context/SalesImportContext";
import { usePosMappings } from "@/context/PosMappingContext";
import { rankMatches } from "@/lib/fuzzyMatch";

interface NameAgg {
  posItemName: string;
  totalQty: number;
  recipeId?: string;
}

const VariancePosMapping = () => {
  const { profile } = useProfile();
  const { recipes } = useRecipes();
  const { fetchSalesForPeriod } = useSalesImport();
  const { saveMapping } = usePosMappings();
  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  const [periodId, setPeriodId] = useState("");
  const [sales, setSales] = useState<MenuItemSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<Record<string, string>>({}); // posName -> recipeId
  const [savingName, setSavingName] = useState<string | null>(null);

  const load = async (id: string) => {
    if (!id) { setSales([]); return; }
    setLoading(true);
    setSales(await fetchSalesForPeriod(id));
    setLoading(false);
  };

  useEffect(() => { load(periodId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodId]);

  const aggregates = useMemo<NameAgg[]>(() => {
    const map = new Map<string, NameAgg>();
    for (const s of sales) {
      const prev = map.get(s.posItemName) || { posItemName: s.posItemName, totalQty: 0, recipeId: s.recipeId };
      prev.totalQty += s.qtySold;
      if (s.recipeId) prev.recipeId = s.recipeId;
      map.set(s.posItemName, prev);
    }
    return [...map.values()].sort((a, b) => a.posItemName.localeCompare(b.posItemName));
  }, [sales]);

  const recipeName = (id?: string) => recipes.find((r) => r.id === id)?.name;

  // Best fuzzy suggestion per name (for preselect + the sparkle hint).
  const bestSuggestion = (name: string) => {
    const ranked = rankMatches(name, recipes, (r) => r.name, 1);
    return ranked[0];
  };

  const handleSave = async (name: string) => {
    const recipeId = selection[name] || bestSuggestion(name)?.item.id;
    if (!recipeId) return;
    const method = selection[name] ? "manual" : "fuzzy";
    setSavingName(name);
    await saveMapping(name, recipeId, method);
    await load(periodId);
    setSavingName(null);
  };

  const unmapped = aggregates.filter((a) => !a.recipeId);
  const mapped = aggregates.filter((a) => a.recipeId);

  const renderRow = (agg: NameAgg) => {
    const suggestion = !agg.recipeId ? bestSuggestion(agg.posItemName) : undefined;
    const current = selection[agg.posItemName] ?? agg.recipeId ?? suggestion?.item.id ?? "";
    return (
      <div key={agg.posItemName} className="grid grid-cols-12 gap-2 items-center border-t border-border py-2">
        <div className="col-span-4 min-w-0">
          <div className="font-medium truncate">{agg.posItemName}</div>
          <div className="text-xs text-muted-foreground">qty sold: {agg.totalQty}</div>
        </div>
        <div className="col-span-6">
          <Select value={current || "_none"} onValueChange={(v) => setSelection((p) => ({ ...p, [agg.posItemName]: v === "_none" ? "" : v }))}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Map to recipe..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— Unmapped —</SelectItem>
              {rankMatches(agg.posItemName, recipes, (r) => r.name, recipes.length).map(({ item, score }) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}{score >= 0.6 ? ` · ${(score * 100).toFixed(0)}% match` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggestion && suggestion.score >= 0.6 && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Suggested: {suggestion.item.name} ({(suggestion.score * 100).toFixed(0)}%)
            </div>
          )}
        </div>
        <div className="col-span-2 flex justify-end">
          {agg.recipeId ? (
            <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Mapped</Badge>
          ) : (
            <Button size="sm" disabled={!canManage || savingName === agg.posItemName} onClick={() => handleSave(agg.posItemName)}>
              {savingName === agg.posItemName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Link2 className="h-7 w-7 text-primary" /> POS Name Mapping
        </h1>
        <p className="text-muted-foreground mt-1">
          Map POS menu-item names to recipes. Saved mappings auto-resolve future imports. Matching is fuzzy (Levenshtein) — never an LLM.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Period</CardTitle></CardHeader>
        <CardContent><PeriodPicker value={periodId} onChange={setPeriodId} canManage={canManage} /></CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading sales...
        </div>
      ) : !periodId ? (
        <p className="text-muted-foreground text-sm">Select a period to map its imported sales.</p>
      ) : aggregates.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sales imported for this period yet.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Unmapped <Badge variant={unmapped.length ? "destructive" : "secondary"}>{unmapped.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unmapped.length === 0 ? (
                <p className="text-sm text-muted-foreground">All POS names are mapped. 🎉</p>
              ) : unmapped.map(renderRow)}
            </CardContent>
          </Card>

          {mapped.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Mapped <Badge variant="secondary">{mapped.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mapped.map((agg) => (
                  <div key={agg.posItemName} className="flex items-center justify-between border-t border-border py-2 text-sm">
                    <span className="font-medium">{agg.posItemName}</span>
                    <span className="text-muted-foreground">→ {recipeName(agg.recipeId) || "Unknown recipe"} · qty {agg.totalQty}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default VariancePosMapping;

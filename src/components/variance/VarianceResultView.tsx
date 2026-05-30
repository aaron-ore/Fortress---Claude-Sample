import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Info } from "lucide-react";
import { VarianceResult } from "@/lib/varianceEngine";

export interface VarianceViewMeta {
  unmappedSalesRows: number;
  unmappedSalesQty: number;
}

interface VarianceResultViewProps {
  result: VarianceResult;
  meta?: VarianceViewMeta | null;
  periodLabel?: string;
  currency?: string;
}

// Presentational view of an engine result. Shared by the live report and the
// engine demo so what you see on screen is exactly what the engine produces.
const VarianceResultView: React.FC<VarianceResultViewProps> = ({ result, meta, periodLabel, currency = "$" }) => {
  const money = (n: number) => `${currency}${n.toFixed(2)}`;
  const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);
  const heroPositive = result.heroNumber >= 0;
  const activeLines = result.lines.filter((l) => !l.hasSetupError);

  return (
    <div className="space-y-6">
      {/* Hero number */}
      <Card className={heroPositive ? "border-red-500/40" : "border-emerald-500/40"}>
        <CardContent className="py-8 text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground mb-1">
            {heroPositive ? "Lost to variance" : "Favorable variance"}
          </p>
          <p className={`text-5xl font-bold ${heroPositive ? "text-red-500" : "text-emerald-500"}`}>
            {money(Math.abs(result.heroNumber))}
          </p>
          {periodLabel && <p className="text-sm text-muted-foreground mt-2">{periodLabel}</p>}
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
    </div>
  );
};

export default VarianceResultView;

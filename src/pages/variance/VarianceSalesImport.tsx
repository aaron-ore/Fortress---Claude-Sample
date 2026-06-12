import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import PeriodPicker from "@/components/variance/PeriodPicker";
import VarianceWorkflowSteps from "@/components/variance/VarianceWorkflowSteps";
import { useProfile } from "@/context/ProfileContext";
import { useSalesImport, MenuItemSale } from "@/context/SalesImportContext";
import { parseSalesCsvBinary, ParsedSalesRow } from "@/lib/salesCsvParser";
import { showError } from "@/utils/toast";

const VarianceSalesImport = () => {
  const { profile } = useProfile();
  const { importSales, fetchSalesForPeriod, clearSalesForPeriod } = useSalesImport();
  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  const [periodId, setPeriodId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSalesRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [existing, setExisting] = useState<MenuItemSale[]>([]);

  const refreshExisting = async (id: string) => {
    if (!id) { setExisting([]); return; }
    setExisting(await fetchSalesForPeriod(id));
  };

  useEffect(() => { refreshExisting(periodId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodId]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setParsed([]); setParseErrors([]);
    if (!f) { setFile(null); return; }
    if (!f.name.toLowerCase().endsWith(".csv")) {
      showError("Select a .csv file.");
      setFile(null);
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const bin = ev.target?.result;
      if (typeof bin !== "string") return showError("Failed to read file.");
      try {
        const { rows, errors } = parseSalesCsvBinary(bin);
        setParsed(rows);
        setParseErrors(errors);
      } catch (err: unknown) {
        showError(`Failed to parse CSV: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleImport = async () => {
    if (!periodId) return showError("Select a period first.");
    if (parsed.length === 0) return showError("Nothing to import.");
    setImporting(true);
    const summary = await importSales(periodId, parsed, file?.name);
    setImporting(false);
    if (summary) {
      setFile(null); setParsed([]); setParseErrors([]);
      await refreshExisting(periodId);
    }
  };

  const handleClear = async () => {
    if (!periodId) return;
    await clearSalesForPeriod(periodId);
    await refreshExisting(periodId);
  };

  const totalQty = parsed.reduce((s, r) => s + r.qtySold, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Upload className="h-7 w-7 text-primary" /> Sales Import
        </h1>
        <p className="text-muted-foreground mt-1">
          Import a POS sales export (menu item, quantity sold, date) for a variance period. CSV only — no live POS connection.
        </p>
      </div>

      <VarianceWorkflowSteps />

      <Card>
        <CardHeader><CardTitle className="text-base">1. Choose period</CardTitle></CardHeader>
        <CardContent>
          <PeriodPicker value={periodId} onChange={setPeriodId} canManage={canManage} />
          {periodId && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{existing.length} sales rows already imported for this period.</span>
              {canManage && existing.length > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Clear imported sales
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Upload CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".csv" onChange={handleFile} disabled={!canManage || !periodId} />
          <p className="text-xs text-muted-foreground">
            Expected columns (case-insensitive): <code>menu_item_name</code>, <code>qty_sold</code>, <code>date</code>. Common aliases are accepted.
          </p>

          {parseErrors.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="flex items-center gap-1.5 font-medium text-amber-600 mb-1">
                <AlertTriangle className="h-4 w-4" /> {parseErrors.length} row(s) skipped
              </div>
              <ScrollArea className="max-h-32">
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                  {parseErrors.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </ScrollArea>
            </div>
          )}

          {parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="font-medium">{parsed.length} rows parsed</span>
                <Badge variant="secondary">total qty {totalQty}</Badge>
              </div>
              <ScrollArea className="max-h-64 border border-border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Menu item</th>
                      <th className="px-3 py-2 text-right">Qty sold</th>
                      <th className="px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-1.5">{r.menuItemName}</td>
                        <td className="px-3 py-1.5 text-right">{r.qtySold}</td>
                        <td className="px-3 py-1.5">{r.saleDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              <Button onClick={handleImport} disabled={importing || !canManage}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Import {parsed.length} rows
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VarianceSalesImport;

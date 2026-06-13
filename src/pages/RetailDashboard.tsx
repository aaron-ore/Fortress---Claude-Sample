import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ScanBarcode, Boxes, Tags, DollarSign, Percent, TriangleAlert, PackageX, TrendingUp,
} from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useProfile } from "@/context/ProfileContext";

const RetailDashboard: React.FC = () => {
  const { inventoryItems, isLoadingInventory } = useInventory();
  const { profile } = useProfile();

  const currency = profile?.companyProfile?.companyCurrency || "$";
  const money = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const kpis = useMemo(() => {
    let units = 0, costValue = 0, retailValue = 0;
    for (const i of inventoryItems) {
      units += i.quantity;
      costValue += i.unitCost * i.quantity;
      retailValue += i.retailPrice * i.quantity;
    }
    const margin = retailValue > 0 ? ((retailValue - costValue) / retailValue) * 100 : 0;
    const lowStock = inventoryItems
      .filter((i) => i.quantity > 0 && i.quantity <= i.reorderLevel)
      .sort((a, b) => a.quantity - b.quantity);
    const outOfStock = inventoryItems.filter((i) => i.quantity <= 0);
    const topByValue = [...inventoryItems]
      .map((i) => ({ item: i, value: i.retailPrice * i.quantity }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    return { skuCount: inventoryItems.length, units, costValue, retailValue, margin, lowStock, outOfStock, topByValue };
  }, [inventoryItems]);

  const tiles = [
    { label: "Active SKUs", value: kpis.skuCount.toLocaleString(), icon: Tags },
    { label: "Units on hand", value: kpis.units.toLocaleString(), icon: Boxes },
    { label: "Stock value (cost)", value: money(kpis.costValue), icon: DollarSign },
    { label: "Retail value", value: money(kpis.retailValue), icon: TrendingUp },
    { label: "Projected margin", value: `${kpis.margin.toFixed(0)}%`, icon: Percent },
    { label: "Low / out of stock", value: `${kpis.lowStock.length} / ${kpis.outOfStock.length}`, icon: TriangleAlert },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Retail Dashboard</h1>

      {/* Scan station launcher — the everyday counter/back-office action. */}
      <Card className="bg-primary/5 border-primary/30">
        <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <ScanBarcode className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">Quick Scan</p>
              <p className="text-sm text-muted-foreground">
                Scan a barcode or SKU to check stock, receive deliveries, or sell items off the shelf.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to="/quick-scan"><ScanBarcode className="h-4 w-4 mr-2" /> Open Scan Station</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-6">
              <t.icon className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold tabular-nums">{isLoadingInventory ? "—" : t.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-amber-500" /> Low stock
              <Badge variant="secondary" className="ml-auto">{kpis.lowStock.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing low — you're well stocked.</p>
            ) : (
              <ul className="space-y-2">
                {kpis.lowStock.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <Link to={`/inventory/${i.id}`} className="truncate hover:underline">{i.name}</Link>
                    <span className="text-amber-600 font-medium shrink-0 ml-2">{i.quantity} left</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageX className="h-4 w-4 text-destructive" /> Out of stock
              <Badge variant="secondary" className="ml-auto">{kpis.outOfStock.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.outOfStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No items are out of stock.</p>
            ) : (
              <ul className="space-y-2">
                {kpis.outOfStock.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <Link to={`/inventory/${i.id}`} className="truncate hover:underline">{i.name}</Link>
                    <span className="text-muted-foreground shrink-0 ml-2">{i.sku}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Top stock by value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.topByValue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No inventory yet.</p>
            ) : (
              <ul className="space-y-2">
                {kpis.topByValue.map(({ item, value }) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <Link to={`/inventory/${item.id}`} className="truncate hover:underline">{item.name}</Link>
                    <span className="font-medium shrink-0 ml-2">{money(value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RetailDashboard;

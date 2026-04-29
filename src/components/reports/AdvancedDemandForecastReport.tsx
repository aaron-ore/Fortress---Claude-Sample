import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory } from "@/context/InventoryContext";
import { useProfile } from "@/context/ProfileContext";
import { hasRequiredPlan } from "@/utils/planUtils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ForecastDataPoint {
  name: string;
  "Historical Demand": number;
  "Forecasted Demand": number;
  "Upper Confidence": number;
  "Lower Confidence": number;
  "External Factor (Trend)": number;
}

interface AdvancedDemandForecastReportProps {
  advancedDemandForecast: {
    forecastData: ForecastDataPoint[];
    selectedItemName: string;
  };
  onSelectItem: (itemId: string) => void; // Passed directly from Reports.tsx
}

const AdvancedDemandForecastReport: React.FC<AdvancedDemandForecastReportProps> = ({
  advancedDemandForecast,
  onSelectItem,
}) => {
  const { forecastData, selectedItemName } = advancedDemandForecast;
  const { inventoryItems } = useInventory();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const canAccessForecast = hasRequiredPlan(profile?.companyProfile?.plan, 'premium');

  const availableItems = useMemo(() => {
    return [{ id: "all-items", name: "All Items", sku: "" }, ...inventoryItems];
  }, [inventoryItems]);

  if (!canAccessForecast) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground">
        <TrendingUp className="h-16 w-16 mb-4 text-primary" />
        <p className="text-lg font-semibold">Advanced Demand Forecasting</p>
        <p className="text-md text-center mt-2">This feature requires a Premium or Enterprise plan.</p>
        <Button onClick={() => navigate('/billing')} className="mt-4">Upgrade Plan</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Advanced Demand Forecast
          </CardTitle>
          <p className="text-muted-foreground">
            AI-powered predictions for future product demand, helping optimize inventory levels.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemSelect">Select Item for Forecast</Label>
              <Select value={selectedItemName === "All Items" ? "all-items" : (inventoryItems.find(item => item.name === selectedItemName)?.id || "all-items")} onValueChange={onSelectItem}>
                <SelectTrigger id="itemSelect">
                  <SelectValue placeholder="Select an item or 'All Items'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-items">All Items (Overall Demand)</SelectItem>
                  {availableItems.filter(item => item.id !== "all-items").map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} {item.sku ? `(SKU: ${item.sku})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Forecast Scope</Label>
              <Input value={selectedItemName} readOnly className="font-medium" />
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">Demand Trend (Next 3 Months)</h3>
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={forecastData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => value.toLocaleString('en-US')} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => [`${value.toLocaleString('en-US')} units`, name]}
                />
                <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
                <Line type="monotone" dataKey="Historical Demand" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Forecasted Demand" stroke="hsl(var(--accent))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Upper Confidence" stroke="hsl(var(--accent))" strokeDasharray="2 2" strokeOpacity={0.5} dot={false} />
                <Line type="monotone" dataKey="Lower Confidence" stroke="hsl(var(--accent))" strokeDasharray="2 2" strokeOpacity={0.5} dot={false} />
                <Line type="monotone" dataKey="External Factor (Trend)" stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.7} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No demand forecast data available for the selected item.
            </div>
          )}

          <h3 className="font-semibold text-xl mt-6">Forecast Details</h3>
          {forecastData.length > 0 ? (
            <ScrollArea className="h-[200px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Historical Demand</TableHead>
                    <TableHead className="text-right">Forecasted Demand</TableHead>
                    <TableHead className="text-right">Lower Confidence</TableHead>
                    <TableHead className="text-right">Upper Confidence</TableHead>
                    <TableHead className="text-right">External Factor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecastData.map((dataPoint, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{dataPoint.name}</TableCell>
                      <TableCell className="text-right">{dataPoint["Historical Demand"] > 0 ? dataPoint["Historical Demand"].toLocaleString() : "-"}</TableCell>
                      <TableCell className="text-right">{dataPoint["Forecasted Demand"] > 0 ? dataPoint["Forecasted Demand"].toLocaleString() : "-"}</TableCell>
                      <TableCell className="text-right">{dataPoint["Lower Confidence"] > 0 ? dataPoint["Lower Confidence"].toLocaleString() : "-"}</TableCell>
                      <TableCell className="text-right">{dataPoint["Upper Confidence"] > 0 ? dataPoint["Upper Confidence"].toLocaleString() : "-"}</TableCell>
                      <TableCell className="text-right">{dataPoint["External Factor (Trend)"] > 0 ? dataPoint["External Factor (Trend)"].toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-4">No detailed forecast data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedDemandForecastReport;
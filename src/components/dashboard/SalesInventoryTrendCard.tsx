import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SalesInventoryTrendCardProps {
  data: any[];
}

const SalesInventoryTrendCard: React.FC<SalesInventoryTrendCardProps> = ({ data: trendData }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm col-span-full p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Sales vs. Inventory Trend Graph</CardTitle>
        <LineChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col justify-between h-full">
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={trendData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorSalesRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInventoryValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
              <Area yAxisId="left" type="monotone" dataKey="Sales Revenue" stroke="hsl(var(--primary))" fill="url(#colorSalesRevenue)" strokeWidth={3} activeDot={{ r: 8 }} />
              <Area yAxisId="right" type="monotone" dataKey="Inventory Value" stroke="hsl(var(--accent))" fill="url(#colorInventoryValue)" strokeWidth={3} activeDot={{ r: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 bg-secondary rounded-md flex items-center justify-center text-muted-foreground">
            No sales or inventory data to display trend.
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-auto text-center">Helps spot shortages or overstocking.</p>
      </CardContent>
    </Card>
  );
};

export default SalesInventoryTrendCard;
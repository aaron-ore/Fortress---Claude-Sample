import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface ProfitabilityMetricsCardProps {
  metricsData: { name: string; value: number; color: string }[];
}

const ProfitabilityMetricsCard: React.FC<ProfitabilityMetricsCardProps> = ({ metricsData }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Profitability Metrics</CardTitle>
        <p className="text-sm text-muted-foreground">Key financial performance indicators</p>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-between p-4 pt-0">
        <div className="flex items-center w-full flex-grow">
          {/* Left side: Colored boxes with values */}
          <div className="w-1/3 flex flex-col items-center justify-around h-full">
            {metricsData.map((entry) => (
              <div key={entry.name} className={cn("w-12 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white")} style={{ backgroundColor: entry.color }}>
                {entry.value}%
              </div>
            ))}
          </div>
          {/* Right side: Bar chart */}
          <div className="w-2/3 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metricsData}
                layout="vertical"
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))", fontSize: "0.75rem" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "0.75rem" }}
                  formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Bar dataKey="value" fill={((entry: any) => entry.color) as any} radius={[4, 4, 0, 0]} label={{ position: 'insideRight', formatter: (value: number) => `${value}%`, fill: 'white', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Custom Legend at the bottom right */}
        <div className="flex flex-col items-start text-xs text-muted-foreground mt-auto w-full pl-2">
          {metricsData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 py-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span>{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitabilityMetricsCard;
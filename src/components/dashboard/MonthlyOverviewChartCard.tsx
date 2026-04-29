import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface MonthlyOverviewChartCardProps {
  data: any[];
}

const MonthlyOverviewChartCard: React.FC<MonthlyOverviewChartCardProps> = ({ data }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 col-span-full flex flex-col h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Monthly Activity Overview</CardTitle>
        <p className="text-sm text-muted-foreground">Sales, Inventory & Purchase Trends (Last 12 Months)</p>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 flex flex-col justify-between">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 0,
              left: 0,
              bottom: 5,
            }}
            barCategoryGap="20%"
            barGap={0}
          >
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <YAxis
              tickFormatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              domain={[0, 'auto']}
              axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))', }}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
              itemStyle={{ color: "hsl(var(--foreground))", fontSize: "0.75rem" }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "0.75rem" }}
              formatter={(value: number, name: string) => {
                if (name === "Sales Revenue" || name === "Inventory Value") {
                  return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                }
                return [value.toLocaleString('en-US'), name];
              }}
            />
            <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Bar dataKey="Sales Revenue" stackId="a" fill="#00C49F" />
            <Bar dataKey="Inventory Value" stackId="a" fill="#00BFD8" />
            <Bar dataKey="Purchase Volume" stackId="a" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MonthlyOverviewChartCard;
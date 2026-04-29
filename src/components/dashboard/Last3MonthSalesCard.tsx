import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Last3MonthSalesCardProps {
  data: any[];
}

const Last3MonthSalesCard: React.FC<Last3MonthSalesCardProps> = ({ data }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Last 3 Months Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Sales, Inventory & Shipments</p>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 flex flex-col justify-between">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 0,
              left: 0,
              bottom: 5,
            }}
            barCategoryGap="30%"
          >
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <YAxis hide />
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
                if (name === "Sales Revenue") {
                  return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                }
                return [value.toLocaleString('en-US'), name];
              }}
            />
            <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }} align="left" />
            <Bar dataKey="Sales Revenue" stackId="a" fill="#00C49F" />
            <Bar dataKey="New Inventory Added" stackId="a" fill="#00BFD8" />
            <Bar dataKey="Items Shipped" stackId="a" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default Last3MonthSalesCard;
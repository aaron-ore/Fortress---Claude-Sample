import React from "react";
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

interface SalesOverviewChartProps {
  data: any[];
}

const SalesOverviewChart: React.FC<SalesOverviewChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart
        data={data}
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
          <linearGradient id="colorUnitsSold" x1="0" y1="0" x2="0" y2="1">
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
          formatter={(value: number, name: string) => {
            if (name === "Sales Revenue") {
              return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
            }
            return [value.toLocaleString('en-US'), name];
          }}
        />
        <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
        <Area yAxisId="left" type="monotone" dataKey="Sales Revenue" stroke="hsl(var(--primary))" fill="url(#colorSalesRevenue)" strokeWidth={3} activeDot={{ r: 8 }} />
        <Area yAxisId="right" type="monotone" dataKey="Units Sold" stroke="hsl(var(--accent))" fill="url(#colorUnitsSold)" strokeWidth={3} activeDot={{ r: 8 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default SalesOverviewChart;
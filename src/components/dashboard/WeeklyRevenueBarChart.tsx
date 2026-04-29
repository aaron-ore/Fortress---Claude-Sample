import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WeeklyRevenueBarChartProps {
  data: any[];
}

const WeeklyRevenueBarChart: React.FC<WeeklyRevenueBarChartProps> = ({ data: weeklyData }) => {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={weeklyData}
        margin={{
          top: 5,
          right: 10,
          left: 10,
          bottom: 5,
        }}
        barCategoryGap="20%"
        barGap={0}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} vertical={false} />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          interval={0}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
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
        <Bar dataKey="This Week" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Last Week" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklyRevenueBarChart;
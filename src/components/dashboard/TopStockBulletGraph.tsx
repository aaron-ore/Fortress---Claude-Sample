import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface BulletGraphData {
  name: string;
  quantity: number;
  reorderLevel: number;
}

interface TopStockBulletGraphProps {
  data: BulletGraphData[];
}

const TopStockBulletGraph: React.FC<TopStockBulletGraphProps> = ({ data }) => {
  const maxQuantity = useMemo(() => {
    return Math.max(...data.map(item => item.quantity), 100);
  }, [data]);

  return (
    <>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} horizontal={false} />
            <XAxis type="number" hide domain={[0, maxQuantity * 1.1]} />
            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={120} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, name: string) => {
                if (name === "quantity") {
                  return [`${value} units`, "On Hand"];
                }
                return value;
              }}
            />
            <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No top stock items to display.
        </div>
      )}
    </>
  );
};

export default TopStockBulletGraph;
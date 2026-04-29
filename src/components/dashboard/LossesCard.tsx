import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line } from "recharts";
import { ArrowDown } from "lucide-react";

interface LossesCardProps {
  totalLosses: number;
}

const LossesCard: React.FC<LossesCardProps> = ({ totalLosses }) => {
  // Generate dynamic data for the mini trend chart (downward trend)
  const data = useMemo(() => {
    if (totalLosses === 0) return [{ name: "A", value: 0 }];

    const baseValue = totalLosses / 0.9;
    return Array.from({ length: 7 }, (_, i) => {
      const value = baseValue * (1 - (i / 10)) + (Math.random() - 0.5) * (baseValue * 0.02);
      return { name: String.fromCharCode(65 + i), value: Math.max(0, value) };
    }).reverse();
  }, [totalLosses]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm flex flex-col h-[74px] p-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
        <div className="flex items-center gap-1">
          <CardTitle className="text-xs font-bold text-foreground">Losses</CardTitle>
          <ArrowDown className="h-3 w-3 text-destructive" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-between p-0">
        <div className="text-sm font-bold text-foreground">
          ${totalLosses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <LineChart width={80} height={15} data={data}>
          <Line type="monotone" dataKey="value" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
        </LineChart>
      </CardContent>
    </Card>
  );
};

export default LossesCard;
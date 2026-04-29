import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Lightbulb } from "lucide-react";

interface DemandForecastCardProps {
  data: any[];
}

const DemandForecastCard: React.FC<DemandForecastCardProps> = ({ data: forecastData }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm col-span-full p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Demand Forecast (Next 3 Months)</CardTitle>
        <TrendingUp className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col justify-between h-full">
        {forecastData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={forecastData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
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
              <Line type="monotone" dataKey="Actual Sales" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="Projected Demand" stroke="hsl(var(--accent))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 bg-secondary rounded-md flex items-center justify-center text-muted-foreground">
            No sales data available to generate a forecast.
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-auto flex items-center gap-1 justify-center">
          <Lightbulb className="h-3 w-3 text-yellow-500" />
          <span className="font-semibold">Insight:</span> This basic forecast helps anticipate future demand. For advanced, AI-driven predictions and integration with purchasing, consider upgrading your plan.
        </p>
      </CardContent>
    </Card>
  );
};

export default DemandForecastCard;
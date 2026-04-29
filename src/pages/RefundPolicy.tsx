import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const RefundPolicy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" /> Refund Policy
        </h1>
        <p className="text-muted-foreground mt-1">Last updated: {new Date().getFullYear()}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Refunds & Cancellations</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-4">
          <p>We want you to be satisfied with your Fortress Inventory subscription.</p>
          <p>Please contact support for the full Refund Policy document.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefundPolicy;

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" /> Terms of Service
        </h1>
        <p className="text-muted-foreground mt-1">Last updated: {new Date().getFullYear()}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Agreement to Terms</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-4">
          <p>By accessing and using Fortress Inventory, you accept and agree to be bound by these Terms of Service.</p>
          <p>Please contact support for the full Terms of Service document.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsOfService;

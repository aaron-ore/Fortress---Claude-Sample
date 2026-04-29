import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" /> Privacy Policy
        </h1>
        <p className="text-muted-foreground mt-1">Last updated: {new Date().getFullYear()}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Privacy Matters</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-4">
          <p>Fortress Inventory is committed to protecting your personal information and your right to privacy.</p>
          <p>Please contact support for the full Privacy Policy document.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;

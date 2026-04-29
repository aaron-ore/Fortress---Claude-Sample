import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

const CustomerImport: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Upload className="h-7 w-7 text-primary" /> Customer Import
        </h1>
        <p className="text-muted-foreground mt-1">Import customers in bulk via CSV.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Import Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Customer import functionality coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerImport;

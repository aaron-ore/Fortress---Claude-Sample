import React, { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrint, PrintContentData } from "@/context/PrintContext";
import { useProfile } from "@/context/ProfileContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { showError, showSuccess } from "@/utils/toast";
import { useReportData } from "@/hooks/use-report-data";

import { reportContentComponents, pdfContentComponents } from "@/lib/reportConfig";


const Reports: React.FC = () => {
  const { initiatePrint } = usePrint();
  const { profile } = useProfile();
  const { inventoryFolders: structuredLocations } = useOnboarding();

  const activeReportId = "dashboard-summary";

  const reportContentRef = useRef<HTMLDivElement>(null);

  const CurrentReportComponent = reportContentComponents[activeReportId];
  const CurrentPdfComponent = pdfContentComponents[activeReportId];

  const { data: reportData, pdfProps, isLoading: isLoadingReportData, error: reportError, refresh: refreshReportData } = useReportData(
    activeReportId,
    undefined,
    "category",
    "all",
    "all",
    "all",
  );

  const handlePrintReport = useCallback(() => {
    if (!reportData || !pdfProps || !CurrentPdfComponent) {
      showError("No report data to print.");
      return;
    }
    if (!profile?.companyProfile) {
      showError("Company profile not set up. Complete onboarding/settings.");
      return;
    }

    const finalPdfProps = { ...pdfProps, structuredLocations };
    initiatePrint({ type: activeReportId as PrintContentData['type'], props: finalPdfProps });
    showSuccess("Report sent to printer!");
  }, [reportData, pdfProps, CurrentPdfComponent, profile, initiatePrint, activeReportId, structuredLocations]);

  // Removed AI summary related functions and state

  return (
    <div className="flex flex-col flex-grow space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Overview of key inventory and order metrics.
        </p>
      </div>

      <Card className="flex-grow rounded-lg border flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-semibold">Dashboard Summary</CardTitle>
          <Button onClick={handlePrintReport} disabled={!reportData} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" /> Print / PDF
          </Button>
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0">
          {isLoadingReportData ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Generating report...</span>
            </div>
          ) : reportError ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <AlertTriangle className="h-16 w-16 mb-4" />
              <p className="text-lg">Error: {reportError}</p>
              <Button onClick={refreshReportData} className="mt-4">Retry</Button>
            </div>
          ) : !reportData ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="h-16 w-16 mb-4" />
              <Button onClick={refreshReportData} className="mt-4">Generate Report</Button>
            </div>
          ) : (
            <div ref={reportContentRef} className="space-y-6">
              {CurrentReportComponent && (
                <CurrentReportComponent
                  {...reportData}
                  groupBy="category"
                  statusFilter="all"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
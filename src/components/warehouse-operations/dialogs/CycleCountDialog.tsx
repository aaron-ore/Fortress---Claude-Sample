"use client";

import React from "react";
import {
  Sheet, // Changed from Dialog
  SheetContent, // Changed from DialogContent
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"; // Changed import from dialog to sheet
import CycleCountTool from "@/components/warehouse-operations/CycleCountTool";
import { CheckCircle } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface CycleCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const CycleCountDialog: React.FC<CycleCountDialogProps> = ({
  isOpen,
  onClose,
  onScanRequest,
  scannedDataFromGlobal,
  onScannedDataProcessed,
}) => {
  const { profile } = useProfile();

  const canCycleCount = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  if (!canCycleCount) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}> {/* Changed from Dialog */}
        <SheetContent side="right" className="w-full sm:max-w-full h-full flex flex-col p-0"> {/* Adjusted for full screen */}
          <Card className="p-6 text-center bg-card border-border">
            <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
            <CardContent>
              <p className="text-muted-foreground">You do not have permission to perform cycle counts.</p>
            </CardContent>
          </Card>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}> {/* Changed from Dialog */}
      <SheetContent side="right" className="w-full sm:max-w-full h-full flex flex-col p-0"> {/* Adjusted for full screen */}
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" /> Cycle Count
          </SheetTitle>
          <SheetDescription>
            Perform inventory counts and reconcile discrepancies.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden p-4 pt-0">
          <CycleCountTool
            onScanRequest={onScanRequest}
            scannedDataFromGlobal={scannedDataFromGlobal}
            onScannedDataProcessed={onScannedDataProcessed}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CycleCountDialog;
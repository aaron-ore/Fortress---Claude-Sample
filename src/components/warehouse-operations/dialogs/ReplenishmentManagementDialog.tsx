"use client";

import React from "react";
import {
  Sheet, // Changed from Dialog
  SheetContent, // Changed from DialogContent
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"; // Changed import from dialog to sheet
import ReplenishmentManagementTool from "@/components/warehouse-operations/ReplenishmentManagementTool";
import { Repeat } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface ReplenishmentManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReplenishmentManagementDialog: React.FC<ReplenishmentManagementDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile } = useProfile();

  const canManageReplenishment = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  if (!canManageReplenishment) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}> {/* Changed from Dialog */}
        <SheetContent side="right" className="w-full sm:max-w-full h-full flex flex-col p-0"> {/* Adjusted for full screen */}
          <Card className="p-6 text-center bg-card border-border">
            <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
            <CardContent>
              <p className="text-muted-foreground">You do not have permission to manage replenishment.</p>
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
            <Repeat className="h-6 w-6 text-primary" /> Replenishment Management
          </SheetTitle>
          <SheetDescription>
            Manage tasks for moving stock from overstock to picking bins.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden p-4 pt-0">
          <ReplenishmentManagementTool />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReplenishmentManagementDialog;
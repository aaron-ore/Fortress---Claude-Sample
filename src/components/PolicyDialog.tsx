import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PolicyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  policyType: 'terms' | 'privacy' | 'refund';
}

const titles: Record<PolicyDialogProps['policyType'], string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  refund: "Refund Policy",
};

const PolicyDialog: React.FC<PolicyDialogProps> = ({ isOpen, onClose, policyType }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{titles[policyType]}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <p className="text-sm text-muted-foreground">
            Please contact support for the full {titles[policyType]} document.
          </p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyDialog;

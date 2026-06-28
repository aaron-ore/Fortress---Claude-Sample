"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, ArrowRight, X, Loader2 } from "lucide-react"; // Corrected import for Loader2
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/context/ProfileContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabaseClient";

interface UpgradePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradePromptDialog: React.FC<UpgradePromptDialogProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { profile, markUpgradePromptSeen } = useProfile();
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const handleUpgradeNow = () => {
    markUpgradePromptSeen();
    onClose();
    navigate("/billing");
  };

  // Start a real subscription via Dodo hosted checkout. New subscribers get the
  // $1-first-month promo applied server-side by the create-dodo-checkout function.
  const handleGetStarted = async (planId: 'standard' | 'pro') => {
    if (!profile?.organizationId || !profile?.id) {
      showError("User or organization not found. Log in again.");
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const returnUrl = `${window.location.origin}/billing?dodo_status=success`;

      const { data, error } = await supabase.functions.invoke('create-dodo-checkout', {
        body: JSON.stringify({ planId, billingCycle: 'monthly', returnUrl }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.checkout_url) throw new Error("No checkout URL returned. Please try again.");

      // Hand off to Dodo's hosted checkout; the dodo-webhook locks in the plan on success.
      markUpgradePromptSeen();
      window.location.href = data.checkout_url;
    } catch (error: any) {
      console.error("Error starting checkout:", error);
      showError(`Failed to start checkout: ${error.message}`);
      setIsProcessingCheckout(false);
    }
  };

  const handleContinueWithFreePlan = () => {
    markUpgradePromptSeen();
    onClose();
    showSuccess("Continuing with Free plan. Upgrade anytime!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-center">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
          <DialogTitle className="text-2xl font-bold">Unlock More Power with Fortress!</DialogTitle>
          <DialogDescription>
            You're currently on the Free plan. Get the Standard plan for just <span className="font-semibold text-foreground">$1 for your first month</span> to access advanced features and streamline your operations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            onClick={() => handleGetStarted('standard')}
            disabled={isProcessingCheckout}
            className="w-full"
          >
            {isProcessingCheckout ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting checkout...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" /> Get Standard — $1 First Month
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={handleUpgradeNow} disabled={isProcessingCheckout} className="w-full">
            <Crown className="h-4 w-4 mr-2" /> See all plans
          </Button>
          <Button variant="ghost" onClick={handleContinueWithFreePlan} disabled={isProcessingCheckout} className="w-full text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4 mr-2" /> Continue with Free Plan
          </Button>
        </div>
        <DialogFooter className="text-xs text-muted-foreground text-center">
          $1 for the first month, then the standard monthly rate. Cancel anytime.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePromptDialog;
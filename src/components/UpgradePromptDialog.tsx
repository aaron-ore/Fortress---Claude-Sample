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
  const { profile, markUpgradePromptSeen, fetchProfile } = useProfile();
  const [isProcessingTrial, setIsProcessingTrial] = useState(false);

  const handleUpgradeNow = () => {
    markUpgradePromptSeen();
    onClose();
    navigate("/billing");
  };

  const handleStartFreeTrial = async (planName: 'standard' | 'pro') => { // Changed from 'standard' | 'premium'
    if (!profile?.organizationId) {
      showError("Organization not found. Cannot start trial.");
      return;
    }
    if (!profile?.id) {
      showError("User not found. Log in again.");
      return;
    }

    setIsProcessingTrial(true);
    try {
      // In a real Dodo integration, you would call a Dodo API to initiate a trial
      // For now, we'll simulate this and update the profile directly.
      console.log(`Simulating Dodo trial for plan: ${planName}`);

      // Simulate Dodo API call and get a customer ID and subscription ID
      const simulatedDodoCustomerId = `dodo_cust_${Math.random().toString(36).substring(2, 15)}`;
      const simulatedDodoSubscriptionId = `dodo_sub_${Math.random().toString(36).substring(2, 15)}`;

      // Update the organization with Dodo customer and subscription IDs
      await supabase
        .from('organizations')
        .update({
          dodo_customer_id: simulatedDodoCustomerId,
          dodo_subscription_id: simulatedDodoSubscriptionId,
          plan: planName,
          // For Dodo, trial_ends_at would be managed by Dodo's API and webhook
          // For now, we'll set a mock trial end date.
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14-day free trial
        })
        .eq('id', profile.organizationId);

      showSuccess(`14-Day Free Trial for ${planName} plan started (simulated)!`);
      onClose();
    } catch (error: any) {
      console.error("Error starting free trial (simulated):", error);
      showError(`Failed to start free trial: ${error.message}`);
    } finally {
      setIsProcessingTrial(false);
      await fetchProfile(); // Refresh profile to reflect trial status
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
            You're currently on the Free plan. Upgrade or start a free trial to access advanced features and streamline your operations even further.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button onClick={handleUpgradeNow} className="w-full">
            <Crown className="h-4 w-4 mr-2" /> Upgrade Now
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleStartFreeTrial('standard')} // Default to Standard plan for trial
            disabled={isProcessingTrial}
            className="w-full"
          >
            {isProcessingTrial ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting Trial...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" /> Start 14-Day Free Trial (Standard)
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={handleContinueWithFreePlan} className="w-full text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4 mr-2" /> Continue with Free Plan
          </Button>
        </div>
        <DialogFooter className="text-xs text-muted-foreground text-center">
          Your trial will automatically convert to a paid subscription after 14 days unless cancelled.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePromptDialog;
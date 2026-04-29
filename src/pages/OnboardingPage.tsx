import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useOnboarding } from "@/context/OnboardingContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import Footer from "@/components/Footer";
import PolicyDialog from "@/components/PolicyDialog";

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { markOnboardingComplete } = useOnboarding();
  const { profile, isLoadingProfile } = useProfile();

  const [currentStep, setCurrentStep] = useState(0);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [policyType, setPolicyType] = useState<'terms' | 'privacy' | 'refund'>('terms');

  useEffect(() => {
    if (!isLoadingProfile && profile?.hasOnboardingWizardCompleted) {
      navigate("/", { replace: true });
    }
  }, [isLoadingProfile, profile?.hasOnboardingWizardCompleted, navigate]);

  const handleOnboardingComplete = async () => {
    await markOnboardingComplete();
    navigate("/", { replace: true });
  };

  const handleOnboardingClose = () => {
    navigate("/", { replace: true });
  };

  const openPolicyDialog = (type: 'terms' | 'privacy' | 'refund') => {
    setPolicyType(type);
    setIsPolicyDialogOpen(true);
  };

  if (isLoadingProfile || profile?.hasOnboardingWizardCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Onboarding Complete!</CardTitle>
            <CardDescription>You've successfully set up your Fortress account.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Redirecting you to the dashboard...</p>
            <button onClick={() => navigate("/")} className="text-primary hover:underline">
              Go to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <OnboardingWizard
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        onComplete={handleOnboardingComplete}
        onClose={handleOnboardingClose}
      />
      <div className="mt-auto w-full max-w-md text-center text-xs text-muted-foreground pt-4">
        By continuing, you agree to our{" "}
        <Button variant="link" className="p-0 h-auto text-primary hover:underline" onClick={() => openPolicyDialog('terms')}>Terms of Service</Button> and{" "}
        <Button variant="link" className="p-0 h-auto text-primary hover:underline" onClick={() => openPolicyDialog('privacy')}>Privacy Policy</Button>.
      </div>
      <Footer />

      <PolicyDialog
        isOpen={isPolicyDialogOpen}
        onClose={() => setIsPolicyDialogOpen(false)}
        policyType={policyType}
      />
    </div>
  );
};

export default OnboardingPage;
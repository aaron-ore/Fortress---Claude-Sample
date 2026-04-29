import React, { startTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanyProfileStep from "./CompanyProfileStep";
import { CompanyProfileStepProps } from "./CompanyProfileStep";
import FolderSetupStep from "./LocationSetupStep"; // Renamed import
import { FolderSetupStepProps } from "./LocationSetupStep"; // Renamed import
// import ProductImportStep from "./ProductImportStep"; // Removed
// Removed useOnboarding import as markOnboardingComplete is now handled by OnboardingPage

interface OnboardingWizardProps {
  onComplete: () => void;
  onClose: () => void;
  currentStep: number; // NEW: Prop for current step
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>; // NEW: Prop for setting step
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onClose, currentStep, setCurrentStep }) => { // NEW: Accept currentStep and setCurrentStep
  // Removed internal currentStep state

  const steps = [
    {
      title: "Company Profile",
      component: CompanyProfileStep as React.FC<CompanyProfileStepProps>, // Cast to ensure type compatibility
    },
    {
      title: "Inventory Folders", // Updated title
      component: FolderSetupStep as React.FC<FolderSetupStepProps>, // Updated to FolderSetupStep
    },
    // Removed ProductImportStep
  ];

  const handleNext = () => {
    console.log("[OnboardingWizard] handleNext called. Current step before update:", currentStep);
    if (currentStep < steps.length - 1) {
      startTransition(() => { // Wrap setCurrentStep in startTransition
        setCurrentStep((prev) => {
          console.log("[OnboardingWizard] setCurrentStep callback. prev:", prev, "new:", prev + 1);
          return prev + 1;
        });
      });
    } else {
      // This is the last step, call onComplete from parent
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      startTransition(() => { // Wrap setCurrentStep in startTransition
        setCurrentStep((prev) => prev - 1);
      });
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Welcome to Fortress!
            <div className="text-sm text-muted-foreground mt-1">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <CurrentStepComponent onNext={handleNext} onBack={handleBack} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter } from "react-router-dom";
import { OnboardingProvider } from "./context/OnboardingContext";
import { ProfileProvider } from "./context/ProfileContext";
import { PrintProvider } from "./context/PrintContext";
import ThemedAppContent from "./components/ThemedAppContent";
import { AuthProvider } from "./context/AuthContext";

const App = () => {
  return (
    <>
      <SonnerToaster
        richColors
        position="top-center"
        duration={3000}
        closeButton
        toastOptions={{
          classNames: {
            toast: 'rounded-full',
          },
        }}
      />
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <OnboardingProvider>
              <PrintProvider>
                <TooltipProvider>
                  <ThemedAppContent />
                </TooltipProvider>
              </PrintProvider>
            </OnboardingProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
};

export default App;
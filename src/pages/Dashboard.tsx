import React, { useState, useEffect } from "react";
import DefaultDashboardContent from "./DefaultDashboardContent";
import ClassicDashboard from "./ClassicDashboard";
// Removed: import { useTutorial } from "@/context/TutorialContext"; // NEW: Import useTutorial

const Dashboard: React.FC = () => {
  const [dashboardView, setDashboardView] = useState<"default" | "classic">("default");
  // Removed: const { isTutorialActive, currentStep } = useTutorial(); // NEW: Use tutorial context

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem("dashboardViewPreference") as "default" | "classic";
      if (savedView) {
        setDashboardView(savedView);
      }
    }
  }, []);

  return (
    <>
      {dashboardView === "classic" ? (
        <ClassicDashboard />
      ) : (
        <div className="relative"> {/* NEW: Add relative positioning for tutorial targets */}
          <DefaultDashboardContent />
          {/* Removed: NEW: Tutorial targets for DefaultDashboardContent */}
          {/* Removed: {isTutorialActive && currentStep?.id === "total-stock-value-card" && (
            <div data-tutorial-target="total-stock-value-card" className="absolute top-[100px] left-[10px] w-[calc(25%-10px)] h-[200px] pointer-events-none z-10"></div>
          )}
          {isTutorialActive && currentStep?.id === "low-stock-alerts-card" && (
            <div data-tutorial-target="low-stock-alerts-card" className="absolute top-[100px] left-[25%+10px] w-[calc(25%-10px)] h-[200px] pointer-events-none z-10"></div>
          )}
          {isTutorialActive && currentStep?.id === "quick-actions-section" && (
            <div data-tutorial-target="quick-actions-section" className="absolute top-[100px] left-[50%+10px] w-[calc(25%-10px)] h-[200px] pointer-events-none z-10"></div>
          )} */}
        </div>
      )}
    </>
  );
};

export default Dashboard;
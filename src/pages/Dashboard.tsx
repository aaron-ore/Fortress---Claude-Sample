import React from "react";
import DashboardVariance from "./variance/DashboardVariance";
import RetailDashboard from "./RetailDashboard";
import { useBusinessMode } from "@/hooks/useBusinessMode";

// The home dashboard adapts to the business mode. Retail gets a
// merchandising/scan-first view; restaurant and warehouse get the
// variance-wired home screen.
const Dashboard: React.FC = () => {
  const { isRetail } = useBusinessMode();
  if (isRetail) return <RetailDashboard />;
  return <DashboardVariance />;
};

export default Dashboard;

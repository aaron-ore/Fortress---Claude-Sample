import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { usePrint } from "@/context/PrintContext";
import { showError } from "@/utils/toast";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext";
import { InventoryItem } from "@/context/InventoryContext";
import { OrderItem } from "@/context/OrdersContext";

interface GenerateReportButtonProps {
  dateRange: DateRange | undefined;
  totalStockValue: number;
  totalUnitsOnHand: number; // NEW: Added totalUnitsOnHand
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
  recentSalesOrders: OrderItem[];
  recentPurchaseOrders: OrderItem[];
}

const GenerateReportButton: React.FC<GenerateReportButtonProps> = ({
  dateRange,
  totalStockValue,
  totalUnitsOnHand, // NEW: Destructure totalUnitsOnHand
  lowStockItems,
  outOfStockItems,
  recentSalesOrders,
  recentPurchaseOrders,
}) => {
  const { initiatePrint } = usePrint();
  const { profile } = useProfile();

  const handleGenerateReport = () => {
    if (!profile?.companyProfile?.companyName || !profile?.companyProfile?.companyAddress || !profile?.companyProfile?.companyCurrency) {
      showError("Company profile not set up. Complete onboarding/settings.");
      return;
    }

    const reportProps = {
      companyName: profile.companyProfile.companyName,
      companyAddress: profile.companyProfile.companyAddress,
      companyCurrency: profile.companyProfile.companyCurrency,
      companyLogoUrl: profile.companyProfile.companyLogoUrl || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      totalStockValue,
      totalUnitsOnHand, // NEW: Pass totalUnitsOnHand
      lowStockItems,
      outOfStockItems,
      recentSalesOrders,
      recentPurchaseOrders,
      dateRange,
    };

    initiatePrint({ type: "dashboard-summary", props: reportProps });
  };

  return (
    <Button className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold" onClick={handleGenerateReport}>
      <Printer className="h-4 w-4 mr-2" /> Generate Report
    </Button>
  );
};

export default GenerateReportButton;
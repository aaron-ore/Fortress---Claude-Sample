import { ScanBarcode } from "lucide-react";
import QuickScanStation from "@/components/QuickScanStation";

const QuickScanPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ScanBarcode className="h-7 w-7 text-primary" /> Quick Scan
        </h1>
        <p className="text-muted-foreground mt-1">
          Use a USB barcode scanner (or type) to check stock, receive deliveries, and sell items.
          Pick an action, then scan — the input stays focused for rapid scanning.
        </p>
      </div>
      <QuickScanStation />
    </div>
  );
};

export default QuickScanPage;

import React from "react";
import { format, isValid } from "date-fns";
import { InventoryItem } from "@/context/InventoryContext";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext";
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface LowStockPdfContentProps {
  reportDate: string;
  lowStock: {
    items: InventoryItem[];
  };
  statusFilter: "all" | "low-stock" | "out-of-stock";
  dateRange?: DateRange;
}

const LowStockPdfContent: React.FC<LowStockPdfContentProps> = ({
  reportDate,
  lowStock,
  statusFilter,
  dateRange,
}) => {
  const { items } = lowStock;
  const { profile } = useProfile();
  const { inventoryFolders: structuredLocations } = useOnboarding(); // NEW: Get structuredLocations from context

  if (!profile || !profile.companyProfile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const reportTitle = statusFilter === "low-stock"
    ? "LOW STOCK ITEMS"
    : statusFilter === "out-of-stock"
      ? "OUT OF STOCK ITEMS"
      : "LOW & OUT OF STOCK ITEMS";

  const getFolderDisplayName = (folderId: string) => {
    const foundLoc = (structuredLocations ?? []).find(folder => folder.id === folderId);
    return foundLoc?.name || "Unassigned";
  };

  return (
    <div className="bg-white text-gray-900 font-sans text-sm p-[20mm]">
      <div className="flex justify-between items-start mb-8">
        <div>
          {profile.companyProfile.companyLogoUrl ? (
            <img src={profile.companyProfile.companyLogoUrl} alt="Company Logo" className="max-h-20 object-contain mb-2" style={{ maxWidth: '1.5in' }} />
          ) : (
            <div className="max-h-20 mb-2" style={{ maxWidth: '1.5in' }}></div>
          )}
          <h1 className="text-5xl font-extrabold uppercase tracking-tight mb-2">
            {reportTitle}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">REPORT DATE: {parseAndValidateDate(reportDate) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
          <p className="text-sm font-semibold">DATA PERIOD: {formattedDateRange}</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">REPORT FOR:</p>
        <div className="bg-gray-50 p-3 border border-gray-200 rounded">
          <p className="font-semibold">{profile.companyProfile.companyName || "Your Company"}</p>
          <p>{profile.companyProfile.companyCurrency || "N/A"}</p>
          <p>{(profile.companyProfile.companyAddress?.split('\n')[0] || "N/A")}</p>
          <p>{(profile.companyProfile.companyAddress?.split('\n')[1] || "")}</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">SUMMARY:</p>
        <div className="bg-gray-50 p-3 border border-gray-200 rounded">
          <p className="font-semibold">Total {reportTitle} Items: {(items?.length ?? 0)}</p>
          <p className="text-xs text-gray-600 mt-1">
            This report lists inventory items that are currently at or below their reorder level, or completely out of stock.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED ITEMS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">SKU</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Quantity</th>
              <th className="py-2 px-4 text-right font-semibold">Reorder Level</th>
              <th className="py-2 px-4 text-left font-semibold">Folder</th>
            </tr>
          </thead>
          <tbody>
            {(items?.length ?? 0) > 0 ? (
              items?.map((item: InventoryItem) => (
                <tr key={item.id}>
                  <td className="py-2 px-4 border-r border-gray-200">{item.name ?? "N/A"}</td>
                  <td className="py-2 px-4 border-r border-gray-200">{item.sku ?? "N/A"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200 text-red-600">{item.quantity ?? 0}</td>
                  <td className="py-2 px-4 text-right">{item.reorderLevel ?? 0}</td>
                  <td className="py-2 px-4">{getFolderDisplayName(item.folderId ?? "")}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={5} className="py-2 px-4 text-center text-gray-600">No items found for this report.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-12 text-right">
        <p>Generated by Fortress on {parseAndValidateDate(reportDate) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
      </div>
    </div>
  );
};

export default LowStockPdfContent;
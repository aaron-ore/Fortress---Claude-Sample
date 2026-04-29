import React from "react";
import { format, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext";

interface GroupedDataItem {
  name: string;
  totalValue: number;
  totalQuantity: number;
}

interface InventoryValuationPdfContentProps {
  reportDate: string;
  inventoryValuation: {
    groupedData: GroupedDataItem[];
    totalOverallValue: number;
    totalOverallQuantity: number;
  };
  groupBy: "category" | "folder";
  dateRange?: DateRange;
}

const InventoryValuationPdfContent: React.FC<InventoryValuationPdfContentProps> = ({
  reportDate,
  inventoryValuation,
  groupBy,
  dateRange,
}) => {
  const { groupedData, totalOverallValue, totalOverallQuantity } = inventoryValuation;
  const { profile } = useProfile();

  if (!profile || !profile.companyProfile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

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
            INVENTORY VALUATION
          </h1>
          <p className="text-lg font-semibold text-gray-700">Grouped by: {(groupBy ?? "N/A").charAt(0).toUpperCase() + (groupBy ?? "N/A").slice(1)}</p>
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

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="font-bold mb-2">OVERALL SUMMARY:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Inventory Value:</span>
              <span>${(totalOverallValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Units On Hand:</span>
              <span>{(totalOverallQuantity ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">DETAILS BY {(groupBy ?? "N/A").toUpperCase()}:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">{(groupBy ?? "N/A").charAt(0).toUpperCase() + (groupBy ?? "N/A").slice(1)}</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Total Quantity</th>
              <th className="py-2 px-4 text-right font-semibold">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {(groupedData?.length ?? 0) > 0 ? (
              groupedData?.map((data: GroupedDataItem, index: number) => (
                <tr key={index}>
                  <td className="py-2 px-4 border-r border-gray-200">{data.name ?? "N/A"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">{(data.totalQuantity ?? 0).toLocaleString()}</td>
                  <td className="py-2 px-4 text-right">${(data.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={3} className="py-2 px-4 text-center text-gray-600">No data available for this report.</td>
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

export default InventoryValuationPdfContent;
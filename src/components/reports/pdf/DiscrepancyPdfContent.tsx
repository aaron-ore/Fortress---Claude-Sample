import React from "react";
import { format, isValid } from "date-fns";
import { type UserProfile } from "@/context/ProfileContext"; // Corrected import
import { parseAndValidateDate } from "@/utils/dateUtils";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext"; // Corrected import
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface DiscrepancyLog {
  id: string;
  timestamp: string;
  userId: string;
  organizationId: string;
  itemId: string;
  itemName: string;
  folderId: string;
  locationType: string;
  originalQuantity: number;
  countedQuantity: number;
  difference: number;
  reason: string;
  status: string;
}

interface DiscrepancyPdfContentProps {
  reportDate: string;
  stockDiscrepancy: {
    discrepancies: DiscrepancyLog[];
  };
  statusFilter: "all" | "pending" | "resolved";
  dateRange?: DateRange;
  allProfiles: UserProfile[];
}

const DiscrepancyPdfContent: React.FC<DiscrepancyPdfContentProps> = ({
  reportDate,
  stockDiscrepancy,
  statusFilter,
  dateRange,
  allProfiles,
}) => {
  const { discrepancies } = stockDiscrepancy;
  const { profile } = useProfile();
  const { inventoryFolders: structuredLocations } = useOnboarding(); // NEW: Get structuredLocations from context

  if (!profile || !profile.companyProfile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const reportTitle = statusFilter === "pending"
    ? "PENDING STOCK DISCREPANCIES"
    : statusFilter === "resolved"
      ? "RESOLVED STOCK DISCREPANCIES"
      : "STOCK DISCREPANCY REPORT";

  const getUserName = (userId: string) => {
    const user = (allProfiles ?? []).find((p: UserProfile) => p.id === userId); // Explicitly type p
    return user?.fullName || user?.email || "Unknown User";
  };

  const getFolderDisplayName = (folderId: string) => {
    const foundFolder = (structuredLocations ?? []).find(folder => folder.id === folderId);
    return foundFolder?.name || "Unknown Folder";
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
          <p className="font-semibold">Total {reportTitle} Records: {(discrepancies?.length ?? 0)}</p>
          <p className="text-xs text-gray-600 mt-1">
            This report details all recorded stock discrepancies, including original vs. counted quantities and reasons.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED DISCREPANCIES:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Folder</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Original Qty</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Counted Qty</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Diff</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Reason</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Status</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Reported By</th>
              <th className="py-2 px-4 text-left font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {(discrepancies?.length ?? 0) > 0 ? (
              discrepancies?.map((discrepancy: DiscrepancyLog) => {
                const discrepancyTimestamp = parseAndValidateDate(discrepancy.timestamp);
                return (
                  <tr key={discrepancy.id}>
                    <td className="py-2 px-4 border-r border-gray-200">{discrepancy.itemName ?? "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{getFolderDisplayName(discrepancy.folderId ?? "")} ({discrepancy.locationType?.replace('_', ' ') ?? "N/A"})</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{discrepancy.originalQuantity ?? 0}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{discrepancy.countedQuantity ?? 0}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200 text-red-600">{discrepancy.difference ?? 0}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{discrepancy.reason ?? "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{discrepancy.status ?? "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{getUserName(discrepancy.userId ?? "")}</td>
                    <td className="py-2 px-4">{discrepancyTimestamp ? format(discrepancyTimestamp, "MMM dd, yyyy HH:mm") : "N/A"}</td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={9} className="py-2 px-4 text-center text-gray-600">No discrepancies found for this report.</td>
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

export default DiscrepancyPdfContent;
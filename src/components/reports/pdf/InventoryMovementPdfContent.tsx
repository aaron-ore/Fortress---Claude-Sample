import { format, isValid } from "date-fns";
import { StockMovement } from "@/context/StockMovementContext";
import { type UserProfile } from "@/context/ProfileContext"; // Corrected import
import { parseAndValidateDate } from "@/utils/dateUtils";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext"; // Corrected import
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface InventoryMovementPdfContentProps {
  reportDate: string;
  inventoryMovement: {
    movements: StockMovement[];
  };
  dateRange?: DateRange;
  allProfiles: UserProfile[];
}

const InventoryMovementPdfContent: React.FC<InventoryMovementPdfContentProps> = ({
  reportDate,
  inventoryMovement,
  dateRange,
  allProfiles,
}) => {
  const { movements } = inventoryMovement;
  const { profile } = useProfile();
  const { inventoryFolders: structuredLocations } = useOnboarding(); // NEW: Get structuredLocations from context

  if (!profile || !profile.companyProfile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const getUserName = (userId: string) => {
    const user = (allProfiles ?? []).find((p: UserProfile) => p.id === userId); // Explicitly type p
    return user?.fullName || user?.email || "Unknown User";
  };

  const getFolderName = (folderId: string | undefined) => {
    if (!folderId) return "N/A";
    const folder = (structuredLocations ?? []).find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
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
            INVENTORY MOVEMENT
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">REPORT DATE: {parseAndValidateDate(reportDate) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
          <p className="text-sm font-semibold">DATA PERIOD: {formattedDateRange}</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">SUMMARY:</p>
        <div className="bg-gray-50 p-3 border border-gray-200 rounded">
          <p className="font-semibold">{profile.companyProfile.companyName || "Your Company"}</p>
          <p>{profile.companyProfile.companyCurrency || "N/A"}</p>
          <p>{(profile.companyProfile.companyAddress?.split('\n')[0] || "N/A")}</p>
          <p>{(profile.companyProfile.companyAddress?.split('\n')[1] || "")}</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED MOVEMENTS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Type</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Amount</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Old Qty</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">New Qty</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Reason</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">User</th>
              <th className="py-2 px-4 text-left font-semibold">Folder</th>
              <th className="py-2 px-4 text-left font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {(movements?.length ?? 0) > 0 ? (
              movements?.map((movement: StockMovement) => {
                const movementTimestamp = parseAndValidateDate(movement.timestamp);
                return (
                  <tr key={movement.id}>
                    <td className="py-2 px-4 border-r border-gray-200">{movement.itemName ?? "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{movement.type ?? "N/A"}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{movement.amount ?? 0}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{movement.oldQuantity ?? 0}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{movement.newQuantity ?? 0}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{movement.reason ?? "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{getUserName(movement.userId ?? "")}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{getFolderName(movement.folderId ?? "")}</td>
                    <td className="py-2 px-4">{movementTimestamp ? format(movementTimestamp, "MMM dd, yyyy HH:mm") : "N/A"}</td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={9} className="py-2 px-4 text-center text-gray-600">No inventory movements found for the selected criteria.</td>
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

export default InventoryMovementPdfContent;
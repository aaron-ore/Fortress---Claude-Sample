import React from "react";
import { InventoryItem } from "@/context/InventoryContext";
import { OrderItem } from "@/context/OrdersContext";
import { format, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext"; // Corrected import

interface DashboardSummaryPdfContentProps {
  reportDate: string;
  totalStockValue: number;
  totalUnitsOnHand: number;
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
  recentSalesOrders: OrderItem[];
  recentPurchaseOrders: OrderItem[];
  dateRange?: DateRange;
}

const DashboardSummaryPdfContent: React.FC<DashboardSummaryPdfContentProps> = ({
  reportDate,
  totalStockValue,
  totalUnitsOnHand,
  lowStockItems,
  outOfStockItems,
  recentSalesOrders,
  recentPurchaseOrders,
  dateRange,
}) => {
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
            DASHBOARD SUMMARY
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

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="font-bold mb-2">INVENTORY OVERVIEW:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Stock Value:</span>
              <span>${(totalStockValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Units On Hand:</span>
              <span>{(totalUnitsOnHand ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className={(lowStockItems?.length ?? 0) > 0 ? "font-semibold text-red-600" : "font-semibold"}>Low Stock Items:</span>
              <span className={(lowStockItems?.length ?? 0) > 0 ? "text-red-600" : ""}>{(lowStockItems?.length ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className={(outOfStockItems?.length ?? 0) > 0 ? "font-semibold text-red-600" : "font-semibold"}>Out-of-Stock Items:</span>
              <span className={(outOfStockItems?.length ?? 0) > 0 ? "text-red-600" : ""}>{(outOfStockItems?.length ?? 0)}</span>
            </div>
          </div>
        </div>
        <div>
          <p className="font-bold mb-2">RECENT ORDERS:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <p className="font-semibold">Recent Sales Orders:</p>
            {(recentSalesOrders?.length ?? 0) > 0 ? (
              <ul className="list-disc list-inside ml-4">
                {recentSalesOrders?.map((order: OrderItem) => (
                  <li key={order.id}>{order.id ?? "N/A"} - {order.customerSupplier ?? "N/A"} (${(order.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 ml-4">No recent sales orders.</p>
            )}
            <p className="font-semibold mt-4">Recent Purchase Orders:</p>
            {(recentPurchaseOrders?.length ?? 0) > 0 ? (
              <ul className="list-disc list-inside ml-4">
                {recentPurchaseOrders?.map((order: OrderItem) => (
                  <li key={order.id}>{order.id ?? "N/A"} - {order.customerSupplier ?? "N/A"} (${(order.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 ml-4">No recent purchase orders.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">LOW STOCK ITEMS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">SKU</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">On Hand</th>
              <th className="py-2 px-4 text-right font-semibold">Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            {(lowStockItems?.length ?? 0) > 0 ? (
              lowStockItems?.map((item: InventoryItem) => (
                <tr key={item.id}>
                  <td className="py-2 px-4 border-r border-gray-200">{item.name ?? "N/A"}</td>
                  <td className="py-2 px-4 border-r border-gray-200">{item.sku ?? "N/A"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200 text-red-600">{item.quantity ?? 0}</td>
                  <td className="py-2 px-4 text-right">{item.reorderLevel ?? 0}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={4} className="py-2 px-4 text-center text-gray-600">No low stock items.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">OUT-OF-STOCK ITEMS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold">SKU</th>
            </tr>
          </thead>
          <tbody>
            {(outOfStockItems?.length ?? 0) > 0 ? (
              outOfStockItems?.map((item: InventoryItem) => (
                <tr key={item.id}>
                  <td className="py-2 px-4 border-r border-gray-200">{item.name ?? "N/A"}</td>
                  <td className="py-2 px-4">{item.sku ?? "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={2} className="py-2 px-4 text-center text-gray-600">No out of stock items.</td>
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

export default DashboardSummaryPdfContent;
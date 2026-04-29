import React from "react";
import { format, isValid } from "date-fns";
import { OrderItem } from "@/context/OrdersContext";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext";

interface PurchaseOrderStatusPdfContentProps {
  reportDate: string;
  purchaseOrderStatus: {
    orders: OrderItem[];
  };
  statusFilter: "all" | "new-order" | "processing" | "packed" | "shipped" | "on-hold-problem" | "archived";
  dateRange?: DateRange;
}

const PurchaseOrderStatusPdfContent: React.FC<PurchaseOrderStatusPdfContentProps> = ({
  reportDate,
  purchaseOrderStatus,
  statusFilter,
  dateRange,
}) => {
  const { orders } = purchaseOrderStatus;
  const { profile } = useProfile();

  if (!profile || !profile.companyProfile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const reportTitle = statusFilter === "all"
    ? "PURCHASE ORDER STATUS REPORT"
    : `PURCHASE ORDERS (${(statusFilter ?? "N/A").replace(/-/g, ' ').toUpperCase()})`;

  const totalOrders = (orders?.length ?? 0);
  const totalAmount = (orders ?? []).reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);

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

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="font-bold mb-2">OVERALL SUMMARY:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Purchase Orders:</span>
              <span>{(totalOrders ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Value of Orders:</span>
              <span>${(totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED PURCHASE ORDERS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Order ID</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Supplier</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Order Date</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Due Date</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Status</th>
              <th className="py-2 px-4 text-right font-semibold">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {(orders?.length ?? 0) > 0 ? (
              orders?.map((order: OrderItem) => {
                const orderDate = parseAndValidateDate(order.date);
                const dueDate = parseAndValidateDate(order.dueDate);
                return (
                  <tr key={order.id}>
                    <td className="py-2 px-4 border-r border-gray-200">{order.id ?? "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{order.customerSupplier ?? "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{orderDate ? format(orderDate, "MMM dd, yyyy") : "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{dueDate ? format(dueDate, "MMM dd, yyyy") : "N/A"}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{order.status ?? "N/A"}</td>
                    <td className="py-2 px-4 text-right">${(order.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={6} className="py-2 px-4 text-center text-gray-600">No purchase orders found for this report.</td>
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

export default PurchaseOrderStatusPdfContent;
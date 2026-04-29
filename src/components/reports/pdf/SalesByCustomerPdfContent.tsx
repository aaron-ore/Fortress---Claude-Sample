import React from "react";
import { format, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext";

interface CustomerSalesData {
  customerName: string;
  totalSales: number;
  totalItems: number;
  lastOrderDate: string;
}

interface SalesByCustomerPdfContentProps {
  reportDate: string;
  salesByCustomer: {
    customerSales: CustomerSalesData[];
  };
  dateRange?: DateRange;
}

const SalesByCustomerPdfContent: React.FC<SalesByCustomerPdfContentProps> = ({
  reportDate,
  salesByCustomer,
  dateRange,
}) => {
  const { customerSales } = salesByCustomer;
  const { profile } = useProfile();

  if (!profile || !profile.companyProfile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const totalOverallSales = (customerSales ?? []).reduce((sum, data) => sum + (data.totalSales ?? 0), 0);
  const totalOverallUnits = (customerSales ?? []).reduce((sum, data) => sum + (data.totalItems ?? 0), 0);

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
            SALES BY CUSTOMER
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
          <p className="font-bold mb-2">OVERALL SALES SUMMARY:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Sales Revenue:</span>
              <span>${(totalOverallSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Units Sold:</span>
              <span>{(totalOverallUnits ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Number of Customers:</span>
              <span>{(customerSales?.length ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED SALES BY CUSTOMER:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Customer Name</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Total Sales</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Total Items</th>
              <th className="py-2 px-4 text-left font-semibold">Last Order Date</th>
            </tr>
          </thead>
          <tbody>
            {(customerSales?.length ?? 0) > 0 ? (
              customerSales?.map((data: CustomerSalesData, index: number) => (
                <tr key={index}>
                  <td className="py-2 px-4 border-r border-gray-200">{data.customerName ?? "N/A"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">${(data.totalSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">{(data.totalItems ?? 0).toLocaleString()}</td>
                  <td className="py-2 px-4">{parseAndValidateDate(data.lastOrderDate) ? format(parseAndValidateDate(data.lastOrderDate)!, "MMM dd, yyyy") : "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={4} className="py-2 px-4 text-center text-gray-600">No sales data available for this report.</td>
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

export default SalesByCustomerPdfContent;
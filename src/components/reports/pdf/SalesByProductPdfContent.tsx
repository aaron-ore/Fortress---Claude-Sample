import React from "react";
import { format, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext";

interface ProductSalesData {
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
}

interface SalesByProductPdfContentProps {
  reportDate: string;
  salesByProduct: {
    productSales: ProductSalesData[];
  };
  dateRange?: DateRange;
}

const SalesByProductPdfContent: React.FC<SalesByProductPdfContentProps> = ({
  reportDate,
  salesByProduct,
  dateRange,
}) => {
  const { productSales } = salesByProduct;
  const { profile } = useProfile();

  if (!profile || !profile.companyProfile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const totalOverallRevenue = (productSales ?? []).reduce((sum, data) => sum + (data.totalRevenue ?? 0), 0);
  const totalOverallUnits = (productSales ?? []).reduce((sum, data) => sum + (data.unitsSold ?? 0), 0);

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
            SALES BY PRODUCT
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
              <span>${(totalOverallRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Units Sold:</span>
              <span>{(totalOverallUnits ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Number of Products:</span>
              <span>{(productSales?.length ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED SALES BY PRODUCT:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Product Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">SKU</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Category</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Units Sold</th>
              <th className="py-2 px-4 text-right font-semibold">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {(productSales?.length ?? 0) > 0 ? (
              productSales?.map((data: ProductSalesData, index: number) => (
                <tr key={index}>
                  <td className="py-2 px-4 border-r border-gray-200">{data.productName ?? "N/A"}</td>
                  <td className="py-2 px-4 border-r border-gray-200">{data.sku ?? "N/A"}</td>
                  <td className="py-2 px-4 border-r border-gray-200">{data.category ?? "N/A"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">{(data.unitsSold ?? 0).toLocaleString()}</td>
                  <td className="py-2 px-4 text-right">${(data.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={5} className="py-2 px-4 text-center text-gray-600">No sales data available for this report.</td>
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

export default SalesByProductPdfContent;
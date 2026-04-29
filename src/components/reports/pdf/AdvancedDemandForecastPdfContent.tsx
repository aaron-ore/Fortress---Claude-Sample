import React from "react";
import { format, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { useProfile } from "@/context/ProfileContext";

interface ForecastDataPoint {
  name: string;
  "Historical Demand": number;
  "Forecasted Demand": number;
  "Upper Confidence": number;
  "Lower Confidence": number;
  "External Factor (Trend)": number;
}

interface AdvancedDemandForecastPdfContentProps {
  reportDate: string;
  advancedDemandForecast: {
    forecastData: ForecastDataPoint[];
    selectedItemName: string;
  };
}

const AdvancedDemandForecastPdfContent: React.FC<AdvancedDemandForecastPdfContentProps> = ({
  reportDate,
  advancedDemandForecast,
}) => {
  const { forecastData, selectedItemName } = advancedDemandForecast;
  const { profile } = useProfile();

  if (!profile || !profile.companyProfile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

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
            DEMAND FORECAST
          </h1>
          <p className="text-lg font-semibold text-gray-700">
            {selectedItemName === "All Items" ? "Overall Inventory" : `For: ${selectedItemName ?? "N/A"}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">REPORT DATE: {parseAndValidateDate(reportDate) && isValid(parseAndValidateDate(reportDate)!) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
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
        <p className="font-bold mb-2">FORECAST SUMMARY:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Month</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Historical Demand</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Forecasted Demand</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Lower Confidence</th>
              <th className="py-2 px-4 text-right font-semibold">External Factor</th>
            </tr>
          </thead>
          <tbody>
            {(forecastData?.length ?? 0) > 0 ? (
              forecastData?.map((dataPoint: ForecastDataPoint, index: number) => (
                <tr key={index}>
                  <td className="py-2 px-4 border-r border-gray-200">{dataPoint.name ?? "N/A"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">{(dataPoint["Historical Demand"] ?? 0) > 0 ? (dataPoint["Historical Demand"] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">{(dataPoint["Forecasted Demand"] ?? 0) > 0 ? (dataPoint["Forecasted Demand"] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">{(dataPoint["Lower Confidence"] ?? 0) > 0 ? (dataPoint["Lower Confidence"] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">{(dataPoint["Upper Confidence"] ?? 0) > 0 ? (dataPoint["Upper Confidence"] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                  <td className="py-2 px-4 text-right">{(dataPoint["External Factor (Trend)"] ?? 0) > 0 ? (dataPoint["External Factor (Trend)"] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={6} className="py-2 px-4 text-center text-gray-600">No forecast data available for this report.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-600 mt-12">
        <p className="font-bold mb-1">Notes:</p>
        <p>
          This report provides an advanced demand forecast based on historical sales data, simulated seasonality, and external market trends.
          The confidence intervals indicate the probable range of future demand. External factors are simulated for demonstration.
          For critical business decisions, always cross-reference with real-time market intelligence.
        </p>
      </div>

      <div className="text-xs text-gray-500 mt-12 text-right">
        <p>Generated by Fortress on {parseAndValidateDate(reportDate) && isValid(parseAndValidateDate(reportDate)!) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
      </div>
    </div>
  );
};

export default AdvancedDemandForecastPdfContent;
import React from "react";
import { format } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { useProfile } from "@/context/ProfileContext";
import { escapeHtml } from "@/utils/htmlSanitizer";

interface PackingSlipItem {
  productName: string;
  serialNumber: string;
}

interface PackingSlipPdfContentProps {
  slipNumber: string;
  shipDate: string;
  merchantName: string;
  merchantAddress?: string;
  partnerName?: string;
  paymentStatus?: "paid" | "pending";
  trackingNumber?: string;
  items: PackingSlipItem[];
  notes?: string;
}

const PackingSlipPdfContent: React.FC<PackingSlipPdfContentProps> = ({
  slipNumber,
  shipDate,
  merchantName,
  merchantAddress,
  partnerName,
  paymentStatus,
  trackingNumber,
  items,
  notes,
}) => {
  const { profile } = useProfile();

  // Brand from the company profile; default to CodePay when unset.
  const brandName = escapeHtml(profile?.companyProfile?.companyName || "CodePay");
  const logoUrl = profile?.companyProfile?.companyLogoUrl;
  const companyAddressLines = (profile?.companyProfile?.companyAddress?.split("\n") || []).map(escapeHtml);

  const dateObj = parseAndValidateDate(shipDate);
  const safeDate = dateObj ? format(dateObj, "PPP") : escapeHtml(shipDate || "—");

  const safeMerchant = escapeHtml(merchantName || "—");
  const safeAddressLines = (merchantAddress || "").split("\n").map(escapeHtml).filter(Boolean);
  const safePartner = partnerName ? escapeHtml(partnerName) : null;
  const safeTracking = escapeHtml(trackingNumber || "");
  const safeNotes = notes ? escapeHtml(notes) : null;
  const safeSlipNumber = escapeHtml(slipNumber || "—");

  return (
    <div className="bg-white text-gray-900 font-sans text-sm p-[20mm]">
      {/* Header / branding */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-12 w-auto object-contain" />
          ) : null}
          <div>
            <div className="text-2xl font-extrabold tracking-tight">{brandName}</div>
            {companyAddressLines.map((line, i) => (
              <div key={i} className="text-xs text-gray-500">{line}</div>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold uppercase text-gray-800">Packing Slip</div>
          <div className="text-xs text-gray-500 mt-1">Slip #: {safeSlipNumber}</div>
          <div className="text-xs text-gray-500">Date: {safeDate}</div>
        </div>
      </div>

      {/* Ship to + tracking */}
      <div className="flex justify-between gap-8 mb-6">
        <div>
          <div className="text-[0.65rem] font-bold uppercase text-gray-500 mb-1">Ship To</div>
          <div className="font-semibold">{safeMerchant}</div>
          {safePartner && <div className="text-xs text-gray-600">Partner: {safePartner}</div>}
          {safeAddressLines.length > 0 ? (
            safeAddressLines.map((line, i) => <div key={i} className="text-sm text-gray-700">{line}</div>)
          ) : (
            <div className="text-sm text-gray-400 italic">No shipping address on file</div>
          )}
        </div>
        <div className="text-right min-w-[55mm]">
          <div className="text-[0.65rem] font-bold uppercase text-gray-500 mb-1">Tracking #</div>
          <div className="border border-gray-400 rounded px-3 py-2 min-h-[10mm] text-sm">
            {safeTracking || <span className="text-gray-300">________________________</span>}
          </div>
          {paymentStatus && (
            <div className="mt-2 text-xs">
              Payment:{" "}
              <span className={paymentStatus === "paid" ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>
                {paymentStatus === "paid" ? "PAID" : "PENDING"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Items with serial numbers */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100 text-left text-[0.7rem] uppercase text-gray-600">
            <th className="border border-gray-300 px-2 py-1.5 w-[10mm]">#</th>
            <th className="border border-gray-300 px-2 py-1.5">Product</th>
            <th className="border border-gray-300 px-2 py-1.5">Serial Number</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item, i) => (
            <tr key={i} className="text-sm">
              <td className="border border-gray-300 px-2 py-1.5 text-gray-500">{i + 1}</td>
              <td className="border border-gray-300 px-2 py-1.5">{escapeHtml(item.productName || "—")}</td>
              <td className="border border-gray-300 px-2 py-1.5 font-mono">{escapeHtml(item.serialNumber || "—")}</td>
            </tr>
          ))}
          {(items ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="border border-gray-300 px-2 py-4 text-center text-gray-400">No items on this slip.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="text-sm text-gray-600 mb-10">
        Total units: <span className="font-semibold text-gray-900">{(items ?? []).length}</span>
      </div>

      {safeNotes && (
        <div className="mb-8 text-sm">
          <div className="text-[0.65rem] font-bold uppercase text-gray-500 mb-1">Notes</div>
          <div className="text-gray-700 whitespace-pre-line">{safeNotes}</div>
        </div>
      )}

      {/* Signature line */}
      <div className="flex justify-between gap-12 mt-16">
        <div className="flex-1">
          <div className="border-t border-gray-500 pt-1 text-xs text-gray-600">Received by (signature)</div>
        </div>
        <div className="flex-1">
          <div className="border-t border-gray-500 pt-1 text-xs text-gray-600">Date</div>
        </div>
      </div>
    </div>
  );
};

export default PackingSlipPdfContent;

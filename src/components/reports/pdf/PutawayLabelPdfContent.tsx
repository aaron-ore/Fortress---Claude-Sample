import React from "react";
import { format, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { InventoryFolder } from "@/context/OnboardingContext";

interface PutawayLabelPdfContentProps {
  itemName: string;
  itemSku: string;
  receivedQuantity: number;
  suggestedLocation: string;
  lotNumber?: string;
  expirationDate?: string;
  serialNumber?: string;
  qrCodeSvg: string;
  printDate: string;
  structuredLocations: InventoryFolder[];
}

const PutawayLabelPdfContent: React.FC<PutawayLabelPdfContentProps> = ({
  itemName,
  itemSku,
  receivedQuantity,
  suggestedLocation,
  lotNumber,
  expirationDate,
  serialNumber,
  qrCodeSvg,
  printDate,
  structuredLocations,
}) => {
  const expirationDateObj = expirationDate ? parseAndValidateDate(expirationDate) : null;
  const printDateObj = parseAndValidateDate(printDate);

  const getFolderDisplayName = (folderId: string) => {
    const foundLoc = (structuredLocations ?? []).find(folder => folder.id === folderId);
    return (foundLoc?.name || folderId) ?? "N/A";
  };

  return (
    <div className="bg-white text-gray-900 font-sans text-xs p-2 w-[50mm] h-[50mm] border border-black flex flex-col overflow-hidden">
      <div className="flex justify-center mb-1 flex-shrink-0 p-1 bg-white">
        <div dangerouslySetInnerHTML={{ __html: qrCodeSvg ?? "" }} className="w-[25mm] h-[25mm] object-contain" />
      </div>

      <p className="font-bold text-sm text-center mb-1 leading-tight flex-shrink-0 truncate">{itemName ?? "N/A"}</p>

      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[0.6rem] flex-grow overflow-hidden">
        <div>
          <span className="font-bold">SKU:</span> {itemSku ?? "N/A"}
        </div>
        <div>
          <span className="font-bold">Qty:</span> {receivedQuantity ?? 0}
        </div>
        {lotNumber && (
          <div>
            <span className="font-bold">Lot:</span> {lotNumber ?? "N/A"}
          </div>
        )}
        {expirationDateObj && isValid(expirationDateObj) && (
          <div>
            <span className="font-bold">Exp:</span> {format(expirationDateObj, "MM/yy")}
          </div>
        )}
        {serialNumber && (
          <div>
            <span className="font-bold">SN:</span> {serialNumber ?? "N/A"}
          </div>
        )}
        <div className="col-span-2">
          <span className="font-bold">Loc:</span> <span className="text-blue-700 font-extrabold">{getFolderDisplayName(suggestedLocation ?? "")}</span>
        </div>
      </div>

      <div className="text-right text-[0.5rem] mt-1 flex-shrink-0">
        Date: {printDateObj && isValid(printDateObj) ? format(printDateObj, "MMM dd, yyyy HH:mm") : "N/A"}
      </div>
    </div>
  );
};

export default PutawayLabelPdfContent;
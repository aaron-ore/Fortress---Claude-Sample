import React from "react";
import { Diamond } from "lucide-react";
import { escapeHtml } from "@/utils/htmlSanitizer"; // Import escapeHtml

interface FolderLabelPdfContentProps {
  folderName: string;
  color: string;
  qrCodeSvg: string;
  className?: string;
}

const FolderLabelPdfContent = React.forwardRef<HTMLDivElement, FolderLabelPdfContentProps>(({
  folderName,
  color,
  qrCodeSvg,
  className,
}, ref) => {
  // Escape folderName before rendering
  const safeFolderName = escapeHtml(folderName ?? "N/A");

  return (
    <div ref={ref} className={`bg-white text-gray-900 font-sans w-[101.6mm] h-[50.8mm] border border-black relative overflow-hidden ${className || ''}`}>
      <div className="absolute top-[2mm] left-[2mm] w-[45mm] h-[45mm] flex items-center justify-center z-0 p-1 bg-white">
        {/* qrCodeSvg is already generated as SVG, assuming it's safe from generateQrCodeSvg */}
        <div dangerouslySetInnerHTML={{ __html: qrCodeSvg ?? "" }} className="w-full h-full object-contain" />
      </div>

      <div className="absolute top-[2mm] right-[2mm] z-10">
        <Diamond className="h-6 w-6 text-gray-700" />
      </div>

      <div className="absolute top-[2mm] right-[2mm] w-[50mm] h-[45mm] flex flex-col justify-center items-center z-10">
        <div className="flex flex-col items-center leading-none">
          <span className="text-[0.6rem] font-bold uppercase text-gray-700">FOLDER</span>
          <span className="text-3xl font-extrabold text-black text-center px-2 rounded-sm" style={{ backgroundColor: color ?? "#FFFFFF" }}>{safeFolderName}</span>
        </div>
      </div>
    </div>
  );
});

FolderLabelPdfContent.displayName = "FolderLabelPdfContent";

export default FolderLabelPdfContent;
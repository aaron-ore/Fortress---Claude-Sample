import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

interface BarcodePreviewProps {
  value: string;
  /** jsbarcode symbology. CODE128 handles alphanumeric values; use EAN13/UPC for numeric retail codes. */
  format?: string;
  className?: string;
}

/**
 * Renders a scannable 1D barcode (Code128 by default) for a value. Retail
 * products often carry a printed UPC/EAN barcode in addition to the app's QR.
 */
const BarcodePreview: React.FC<BarcodePreviewProps> = ({ value, format = "CODE128", className }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format,
        displayValue: true,
        height: 50,
        margin: 8,
        fontSize: 14,
        background: "#ffffff",
      });
      setError(false);
    } catch {
      setError(true);
    }
  }, [value, format]);

  if (!value) return null;
  if (error) {
    return <p className="text-xs text-destructive">“{value}” isn't valid for a {format} barcode.</p>;
  }
  return <svg ref={ref} className={className} />;
};

export default BarcodePreview;

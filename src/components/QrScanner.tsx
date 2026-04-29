import { forwardRef } from "react";

export interface QrScannerRef {
  // These methods are now managed by CameraScannerDialog, so QrScanner itself doesn't expose them.
  // Keeping the interface empty or removing it if not strictly needed elsewhere.
}

interface QrScannerProps {
  // These props are no longer needed as CameraScannerDialog manages the Html5Qrcode instance directly.
  // onScan: (decodedText: string) => void;
  // onError: (errorMessage: string) => void;
  // onReady: () => void;
  // onLoading: (loading: boolean) => void;
  // isOpen: boolean;
}

// This component is now purely presentational, rendering only the div for the scanner.
// The actual Html5Qrcode instance management is handled by CameraScannerDialog.
const QrScanner = forwardRef<HTMLDivElement, QrScannerProps>(
  ({ /* no props needed anymore */ }, ref) => {
    return (
      <div id="qr-code-full-region" ref={ref as React.Ref<HTMLDivElement>} className="w-full h-full" />
    );
  }
);

QrScanner.displayName = "QrScanner";

export default QrScanner;
import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XCircle, QrCode, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import CameraFeed from "./CameraFeed"; // Import the new CameraFeed component

interface CameraScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  description?: string;
}

const CameraScannerDialog: React.FC<CameraScannerDialogProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Scan Barcode / QR Code",
  description = "Point your camera at a barcode or QR code to scan.",
}) => {
  const [manualInputMode, setManualInputMode] = useState(false);
  const [manualInputValue, setManualInputValue] = useState("");
  const [cameraFeedKey, setCameraFeedKey] = useState(0); // Key to force CameraFeed re-mount
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Reset states when dialog opens
  useEffect(() => {
    if (isOpen) {
      setManualInputMode(false);
      setManualInputValue("");
      setCameraFeedKey(prev => prev + 1); // Force CameraFeed to re-mount and re-initialize
      setIsCameraLoading(true);
      setCameraError(null);
    }
  }, [isOpen]);

  const handleManualInputSubmit = () => {
    if (manualInputValue.trim()) {
      onScanSuccess(manualInputValue.trim());
      showSuccess("Manual input submitted!");
      onClose();
    } else {
      showError("Enter barcode/QR value.");
    }
  };

  const handleCameraFeedLoading = useCallback((loading: boolean) => {
    setIsCameraLoading(loading);
  }, []);

  const handleCameraFeedError = useCallback((error: string | null) => {
    setCameraError(error);
  }, []);

  const handleRetryCamera = () => {
    setCameraFeedKey(prev => prev + 1); // Force CameraFeed to re-mount and re-initialize
    setIsCameraLoading(true);
    setCameraError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] flex flex-col h-[80vh] max-h-[600px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-grow flex flex-col items-center justify-center bg-black rounded-md overflow-hidden relative p-0">
          {manualInputMode ? (
            <div className="flex flex-col items-center justify-center p-6 w-full h-full bg-background text-foreground">
              <Keyboard className="h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="manual-barcode-input" className="text-lg font-semibold mb-2">Enter Barcode / QR Value</Label>
              <Input
                id="manual-barcode-input"
                placeholder="Type code here..."
                value={manualInputValue}
                onChange={(e) => setManualInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualInputSubmit();
                  }
                }}
                className="w-full max-w-xs mb-4"
              />
              <Button onClick={handleManualInputSubmit} className="w-full max-w-xs">Submit</Button>
            </div>
          ) : (
            <div className="relative w-full pb-[100%]">
              {isCameraLoading && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-lg z-10">
                  Loading camera...
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/70 text-white text-center p-4 z-10">
                  <XCircle className="h-8 w-8 mb-2" />
                  <p className="font-semibold">Camera Error:</p>
                  <p className="text-sm">{cameraError}</p>
                  <p className="text-xs mt-2">Please ensure a back camera is available and permissions are granted.</p>
                  <Button onClick={handleRetryCamera} className="mt-4" variant="secondary">Retry Camera</Button>
                </div>
              )}
              <div className="absolute inset-0">
                <CameraFeed
                  key={cameraFeedKey} // Force re-mount on key change
                  isActive={isOpen && !manualInputMode}
                  onScanSuccess={onScanSuccess}
                  onLoading={handleCameraFeedLoading}
                  onError={handleCameraFeedError}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between p-4 pt-2 gap-2">
          <Button variant="secondary" onClick={() => setManualInputMode(prev => !prev)} className="w-full sm:w-auto">
            {manualInputMode ? (
              <>
                <QrCode className="h-4 w-4 mr-2" /> Use Camera
              </>
            ) : (
              <>
                <Keyboard className="h-4 w-4 mr-2" /> Manual Input
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraScannerDialog;
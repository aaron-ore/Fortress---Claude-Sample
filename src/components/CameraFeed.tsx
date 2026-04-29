import React, { useState, useRef, useEffect, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeFullConfig, Html5QrcodeCameraScanConfig } from "html5-qrcode";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const QR_SCANNER_DIV_ID = "qr-code-full-region-internal"; // Unique ID for this component's div
const MAX_START_ATTEMPTS = 3; // Max attempts for initial camera start (excluding device enumeration retries)
const RETRY_DELAY_MS = 1500; // 1.5 seconds delay between retries
const CAMERA_STARTUP_TIMEOUT_MS = 10000; // 10 seconds for camera to start
const MIN_LOADING_DISPLAY_TIME = 500; // Minimum 500ms for the loading overlay

interface CameraFeedProps {
  onScanSuccess: (decodedText: string) => void;
  onLoading: (loading: boolean) => void;
  onError: (errorMessage: string | null) => void;
  isActive: boolean; // Prop to control start/stop from parent
}

const CameraFeed: React.FC<CameraFeedProps> = ({ onScanSuccess, onLoading, onError, isActive }) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isCameraStartedRef = useRef(false);
  const isStartingRef = useRef(false);
  const currentAttemptIndexRef = useRef(0);
  const loadingStartTimeRef = useRef<number | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null); // Ref for the scanner div

  const [internalScannerError, setInternalScannerError] = useState<string | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(true);

  const html5QrcodeConstructorConfig: Html5QrcodeFullConfig = {
    formatsToSupport: [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
    ],
    verbose: false,
  };

  const html5QrcodeCameraScanConfig: Html5QrcodeCameraScanConfig = {
    fps: 10,
    // Removed aspectRatio: 1.0 to allow native camera aspect ratio for better compatibility
    disableFlip: false,
  };

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && isCameraStartedRef.current) {
      console.log("[CameraFeed] Attempting to stop scanner...");
      try {
        await html5QrCodeRef.current.stop();
        console.log("[CameraFeed] Scanner stopped successfully.");
      } catch (e) {
        console.warn("[CameraFeed] Error during scanner stop (might be already stopped or camera not found):", e);
      } finally {
        isCameraStartedRef.current = false;
        setInternalIsLoading(false);
        onLoading(false);
        isStartingRef.current = false;
      }
    } else {
      console.log("[CameraFeed] No active scanner instance to stop.");
    }
  }, [onLoading]);

  const clearScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      console.log("[CameraFeed] Attempting to clear scanner instance...");
      try {
        await html5QrCodeRef.current.clear();
        console.log("[CameraFeed] Scanner instance cleared.");
      } catch (e) {
        console.warn("[CameraFeed] Error during scanner clear:", e);
      } finally {
        html5QrCodeRef.current = null;
        isCameraStartedRef.current = false;
        isStartingRef.current = false;
        currentAttemptIndexRef.current = 0;
        setInternalIsLoading(false);
        onLoading(false);
      }
    } else {
      console.log("[CameraFeed] No scanner instance to clear.");
    }
  }, [onLoading]);

  const attemptCameraStart = useCallback(async () => {
    if (isStartingRef.current) {
      console.log("[CameraFeed] Start already in progress, skipping.");
      return;
    }
    if (isCameraStartedRef.current) {
      console.log("[CameraFeed] Camera already started, no need to restart.");
      setInternalScannerError(null);
      onError(null);
      setInternalIsLoading(false);
      onLoading(false);
      return;
    }
    if (!isActive) {
      console.log("[CameraFeed] Not starting scanner: isActive is false.");
      return;
    }
    if (!scannerDivRef.current) {
      console.error("[CameraFeed] Scanner div element not found. Cannot start scanner.");
      setInternalScannerError("Scanner display area not ready.");
      onError("Scanner display area not ready.");
      setInternalIsLoading(false);
      onLoading(false);
      return;
    }

    isStartingRef.current = true;
    setInternalIsLoading(true);
    onLoading(true);
    setInternalScannerError(null);
    onError(null);
    loadingStartTimeRef.current = Date.now();
    currentAttemptIndexRef.current = 0; // Reset attempts for a new start cycle

    const executeStartAttempt = async () => {
      if (!isActive) { // Check again before each retry
        console.log("[CameraFeed] Aborting retry: isActive is false.");
        isStartingRef.current = false;
        setInternalIsLoading(false);
        onLoading(false);
        return;
      }
      if (isCameraStartedRef.current) { // Check if it somehow started in between retries
        console.log("[CameraFeed] Camera already started during retry, aborting further attempts.");
        isStartingRef.current = false;
        setInternalIsLoading(false);
        onLoading(false);
        return;
      }

      currentAttemptIndexRef.current++;
      console.log(`[CameraFeed] Attempting camera start (attempt ${currentAttemptIndexRef.current}/${MAX_START_ATTEMPTS})`);

      let cameraSelection: string | MediaTrackConstraints;

      try {
        // Ensure a fresh Html5Qrcode instance for each start attempt
        if (html5QrCodeRef.current) {
          await clearScanner(); // Clear previous instance before creating a new one
        }
        html5QrCodeRef.current = new Html5Qrcode(QR_SCANNER_DIV_ID, html5QrcodeConstructorConfig);

        // Step 1: Explicitly request camera permissions first
        console.log("[CameraFeed] Requesting camera permissions via getUserMedia...");
        const permissionPromise = new Promise<MediaStream>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Camera permission request timed out.")), CAMERA_STARTUP_TIMEOUT_MS);
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => { clearTimeout(timeout); resolve(stream); })
            .catch(err => { clearTimeout(timeout); reject(err); });
        });
        const stream = await permissionPromise;
        // Immediately stop the stream after getting permission, html5-qrcode will start its own
        stream.getTracks().forEach(track => track.stop());
        console.log("[CameraFeed] Camera permissions granted and temporary stream stopped.");

        // Strategy: Enumerate devices and try to find a back camera, otherwise use the first one
        console.log("[CameraFeed] Enumerating camera devices for explicit selection.");
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          console.log("[CameraFeed] Found camera devices:", devices);
          // Prioritize back camera
          const backCamera = devices.find(device => device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("environment"));
          cameraSelection = backCamera ? backCamera.id : devices[0].id;
          console.log("[CameraFeed] Using specific camera ID:", cameraSelection);
        } else {
          console.warn("[CameraFeed] No camera devices found during enumeration.");
          throw new Error("No camera devices found.");
        }
        
        const html5QrcodeStartPromise = new Promise<void>(async (resolve, reject) => {
          try {
            if (!html5QrCodeRef.current) {
              throw new Error("Html5Qrcode instance is null before start attempt.");
            }
            await html5QrCodeRef.current.start(
              cameraSelection,
              html5QrcodeCameraScanConfig,
              async (decodedText) => {
                console.log("[CameraFeed] Scan successful:", decodedText);
                await stopScanner(); // Stop camera after successful scan
                onScanSuccess(decodedText);
                resolve(); // Resolve the startup promise on successful scan
              },
              (errorMessage) => {
                if (!errorMessage.includes("No QR code found")) {
                  console.warn("[CameraFeed] Scan error (not 'No QR code found'):", errorMessage);
                }
              }
            );
            console.log("[CameraFeed] Html5Qrcode scanner started and ready.");
            isCameraStartedRef.current = true;
            resolve(); // Resolve the startup promise on successful camera start
          } catch (err) {
            reject(err); // Reject on any error during camera start
          }
        });

        const timeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Html5Qrcode scanner startup timed out.")), CAMERA_STARTUP_TIMEOUT_MS)
        );

        await Promise.race([html5QrcodeStartPromise, timeoutPromise]);

        const elapsedTime = Date.now() - (loadingStartTimeRef.current || 0);
        if (elapsedTime < MIN_LOADING_DISPLAY_TIME) {
            const remainingTime = MIN_LOADING_DISPLAY_TIME - elapsedTime;
            console.log(`[CameraFeed] Delaying onReady/onLoading(false) by ${remainingTime}ms to meet minimum loading display time.`);
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        setInternalScannerError(null);
        onError(null);
        setInternalIsLoading(false);
        onLoading(false);
        isStartingRef.current = false;
      } catch (err: any) {
        console.error(`[CameraFeed] Error during camera start or permission request on attempt ${currentAttemptIndexRef.current}:`, err);
        isCameraStartedRef.current = false; // Ensure this is false on error
        let errorMessage = "Failed to start camera. ";
        if (err.name === "NotAllowedError") {
          errorMessage = "Camera access denied. Please grant permission in your browser's site settings. ";
        } else if (err.name === "NotFoundError") {
          errorMessage = "No camera devices found. Ensure a camera is connected and enabled. ";
        } else if (err.message === "Camera permission request timed out." || err.message === "Html5Qrcode scanner startup timed out.") {
          errorMessage = "Camera startup timed out. ";
        } else if (err.name === "NotReadableError") {
          errorMessage += "Camera in use or hardware issue. Close other camera apps. ";
        } else if (err.name === "OverconstrainedError") {
          errorMessage += "Camera settings issue. Try restarting device/apps. ";
        } else {
          errorMessage += `Unknown error: ${err.message}. Ensure working camera. `;
        }
        
        if (currentAttemptIndexRef.current < MAX_START_ATTEMPTS) {
          console.log(`[CameraFeed] Retrying camera start in ${RETRY_DELAY_MS}ms...`);
          setTimeout(executeStartAttempt, RETRY_DELAY_MS);
        } else {
          setInternalScannerError(errorMessage);
          onError(errorMessage);
          setInternalIsLoading(false);
          onLoading(false);
          isStartingRef.current = false;
        }
      }
    };

    executeStartAttempt(); // Initial call to start the process
  }, [isActive, onScanSuccess, onLoading, onError, stopScanner, clearScanner]);


  const handleRetryScan = useCallback(async () => {
    console.log("[CameraFeed] Manual retry initiated.");
    await stopScanner(); // Ensure it's stopped before retrying
    await new Promise(resolve => setTimeout(resolve, 500)); // Give some time to release camera resources
    attemptCameraStart(); // Call the main attempt function
  }, [stopScanner, attemptCameraStart]);

  // Effect to manage scanner lifecycle based on isActive prop
  useEffect(() => {
    console.log(`[CameraFeed] useEffect (isActive): isActive=${isActive}, isCameraStartedRef.current=${isCameraStartedRef.current}`);
    if (isActive) {
      attemptCameraStart(); // Call the main attempt function
    } else {
      stopScanner();
    }

    // Cleanup function for when the component unmounts
    return () => {
      console.log("[CameraFeed] Component unmounting. Performing full cleanup.");
      clearScanner();
    };
  }, [isActive, attemptCameraStart, stopScanner, clearScanner]);

  return (
    <div ref={scannerDivRef} className="relative w-full h-full">
      {internalIsLoading && !internalScannerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-lg z-10">
          Loading camera...
        </div>
      )}
      {internalScannerError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/70 text-white text-center p-4 z-10">
          <XCircle className="h-8 w-8 mb-2" />
          <p className="font-semibold">Camera Error:</p>
          <p className="text-sm">{internalScannerError}</p>
          <Button onClick={handleRetryScan} className="mt-4" variant="secondary">Retry Camera</Button>
        </div>
      )}
      <div id={QR_SCANNER_DIV_ID} className="w-full h-full" />
    </div>
  );
};

export default CameraFeed;
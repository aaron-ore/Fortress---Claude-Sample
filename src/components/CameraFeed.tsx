import React, { useState, useRef, useEffect, useCallback } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const DUPLICATE_SCAN_COOLDOWN_MS = 1500; // ignore the same code held in frame (continuous mode)

interface CameraFeedProps {
  onScanSuccess: (decodedText: string) => void;
  onLoading: (loading: boolean) => void;
  onError: (errorMessage: string | null) => void;
  isActive: boolean; // Prop to control start/stop from parent
  /** Keep scanning after each successful decode (for receiving many items). */
  continuous?: boolean;
}

/**
 * Camera scanner backed by ZXing (@zxing/browser). ZXing decodes QR *and* 1D
 * barcodes (UPC/EAN/Code128/Code39, etc.) reliably across browsers — notably
 * iOS WebKit, where the previous html5-qrcode 1D path did not work. The whole
 * video frame is scanned, so the same view reads either a QR or a barcode with
 * no mode switch.
 */
const CameraFeed: React.FC<CameraFeedProps> = ({ onScanSuccess, onLoading, onError, isActive, continuous = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const startingRef = useRef(false);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  // True only while a scan is live. Cleared by stop() so any decode callback that
  // fires after the camera is closed is ignored (no accidental post-close scans).
  const scanningRef = useRef(false);
  // Hold the latest onScanSuccess in a ref so `start` doesn't depend on it —
  // otherwise the parent passing a fresh handler each render would tear down and
  // restart the camera on every re-render (and let scans leak in around close).
  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const stop = useCallback(() => {
    // Flip this first so any in-flight decode callback bails immediately.
    scanningRef.current = false;
    try {
      controlsRef.current?.stop();
    } catch {
      /* already stopped */
    }
    controlsRef.current = null;
    // Explicitly release the camera so reopening doesn't stall on iOS waiting
    // for the previous (still-held) stream to free up.
    const video = videoRef.current;
    if (video && video.srcObject) {
      try {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
      video.srcObject = null;
    }
    startingRef.current = false;
  }, []);

  const start = useCallback(async () => {
    if (!isActive || startingRef.current || controlsRef.current) return;
    if (!videoRef.current) return;

    startingRef.current = true;
    setLoading(true);
    onLoading(true);
    setError(null);
    onError(null);

    try {
      if (!readerRef.current) {
        // TRY_HARDER + an explicit format list (QR plus the common retail 1D
        // symbologies) makes 1D barcodes decode reliably; a short attempt delay
        // scans frames frequently.
        const hints = new Map<DecodeHintType, unknown>();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
        ]);
        readerRef.current = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 });
      }
      scanningRef.current = true;
      const controls = await readerRef.current.decodeFromConstraints(
        {
          // Request a high-resolution stream — default iOS capture is too
          // low-res for thin 1D barcode bars to separate.
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        videoRef.current,
        (result) => {
          if (!result) return; // per-frame "not found" — ignore
          if (!scanningRef.current) return; // camera stopped/closed — drop late callbacks
          const text = result.getText();
          if (continuous) {
            const now = Date.now();
            if (text === lastScanRef.current.code && now - lastScanRef.current.time < DUPLICATE_SCAN_COOLDOWN_MS) return;
            lastScanRef.current = { code: text, time: now };
            onScanSuccessRef.current(text);
          } else {
            stop();
            onScanSuccessRef.current(text);
          }
        },
      );
      controlsRef.current = controls;
      setLoading(false);
      onLoading(false);
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      let message = "Failed to start camera. ";
      if (name === "NotAllowedError") {
        message = "Camera access denied. Allow camera access in your browser settings, then retry.";
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        message = "No usable camera found. Ensure a camera is available and not in use by another app.";
      } else if (name === "NotReadableError") {
        message = "Camera is in use by another app. Close it and retry.";
      } else {
        message += err instanceof Error ? err.message : "Please ensure a working camera and try again.";
      }
      scanningRef.current = false;
      setError(message);
      onError(message);
      setLoading(false);
      onLoading(false);
    } finally {
      startingRef.current = false;
    }
  }, [isActive, continuous, onLoading, onError, stop]);

  useEffect(() => {
    if (isActive) start();
    else stop();
    return () => stop();
  }, [isActive, start, stop]);

  const handleRetry = useCallback(() => {
    stop();
    setTimeout(() => start(), 300);
  }, [stop, start]);

  return (
    <div className="relative w-full h-full bg-black">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-lg z-10">
          Loading camera...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/70 text-white text-center p-4 z-10">
          <XCircle className="h-8 w-8 mb-2" />
          <p className="font-semibold">Camera Error:</p>
          <p className="text-sm">{error}</p>
          <Button onClick={handleRetry} className="mt-4" variant="secondary">Retry Camera</Button>
        </div>
      )}
      {/* playsInline + muted are required for autoplay on iOS WebKit */}
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
      {/* Center framing guide — scanning is full-frame, so QR or barcode both work anywhere in view. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-3/4 h-1/3 border-2 border-white/70 rounded-lg" />
      </div>
    </div>
  );
};

export default CameraFeed;

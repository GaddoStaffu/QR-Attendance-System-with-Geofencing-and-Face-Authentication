import React, { useRef, useEffect } from "react";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: unknown) => void;
  onClose?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
}) => {
  const scannerRef = useRef<HTMLDivElement | null>(null);

  // Try to get the best camera constraints for compatibility
  const getCameraConstraints = () => {
    // Prefer environment camera, fallback to user if not available
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      return navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        if (videoInputs.length > 1) {
          // If more than one camera, prefer environment
          return { facingMode: { ideal: "environment" } };
        }
        // Fallback to default camera
        return { facingMode: "environment" };
      });
    }
    return Promise.resolve({ facingMode: "environment" });
  };

  const handleStopScanner = () => {
    if (scannerRef.current) {
      const videoElement = scannerRef.current.querySelector("video");
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoElement.srcObject = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      handleStopScanner();
    };
  }, []);

  // State for dynamic constraints
  const [constraints, setConstraints] = React.useState<{
    facingMode: string | { ideal: string };
  }>({
    facingMode: "environment",
  });

  useEffect(() => {
    getCameraConstraints().then((result) => setConstraints(result));
  }, []);

  return (
    <div
      className="w-full max-w-xs h-72 bg-gray-200 rounded-lg overflow-hidden relative"
      ref={scannerRef}
    >
      <Scanner
        onScan={(detectedCodes: IDetectedBarcode[]) => {
          if (detectedCodes.length > 0 && detectedCodes[0]?.rawValue) {
            handleStopScanner();
            onScanSuccess(detectedCodes[0].rawValue);
          }
        }}
        onError={(error) => {
          if (onScanError) onScanError(error);
        }}
        constraints={constraints}
        classNames={{ container: "w-full h-full object-cover" }}
      />
      {onClose && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
            onClick={() => {
              handleStopScanner();
              if (onClose) onClose();
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;

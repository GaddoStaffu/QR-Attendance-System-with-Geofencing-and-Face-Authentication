import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";

interface FaceCaptureProps {
  onCapture: (base64Image: string) => void; // Callback to return the captured image
  feedbackMessage: string; // Message to display to the user
  isActive: boolean; // Control whether the camera is active
}

const FaceCaptureComponent: React.FC<FaceCaptureProps> = ({
  onCapture,
  feedbackMessage,
  isActive,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [feedback, setFeedback] = useState<string>(feedbackMessage);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        setFeedback(feedbackMessage);
      } catch (err) {
        console.error("Error loading face-api.js models:", err);
        setFeedback("Failed to load face detection models.");
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        setFeedback(feedbackMessage);
      } catch (err) {
        console.error("Error starting camera:", err);
        setFeedback(
          "Failed to initialize camera. Please check your permissions."
        );
      }
    };

    const detectFace = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      try {
        const detections = await faceapi
          .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detections) {
          setFeedback("Stay still...");
          if (!detectionTimeoutRef.current) {
            detectionTimeoutRef.current = setTimeout(() => {
              captureImage();
            }, 500); // Automatically capture after 1 second
          }
        } else {
          setFeedback(feedbackMessage);
          if (detectionTimeoutRef.current) {
            clearTimeout(detectionTimeoutRef.current);
            detectionTimeoutRef.current = null;
          }
        }
      } catch (err) {
        console.error("Error detecting face:", err);
        setFeedback("An error occurred. Please try again.");
      }
    };

    const captureImage = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Set canvas dimensions to match the native resolution of the video feed
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      // Draw the video frame onto the canvas
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      try {
        // Convert the canvas to a Base64 string with maximum quality
        const base64Image = canvas.toDataURL("image/jpeg", 1.0); // Use maximum quality
        onCapture(base64Image.split(",")[1]); // Return the Base64 image to the parent
      } catch (err) {
        console.error("Error capturing image:", err);
        setFeedback("An error occurred. Please try again.");
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      setFeedback("Camera stopped.");
    };

    if (isActive) {
      loadModels();
      startCamera();
      const interval = setInterval(detectFace, 500); // Check for a face every 500ms

      return () => {
        clearInterval(interval);
        if (detectionTimeoutRef.current) {
          clearTimeout(detectionTimeoutRef.current);
        }
        stopCamera();
      };
    } else {
      stopCamera();
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    }
  }, [isActive, feedbackMessage]);

  return (
    <div className="relative w-full max-w-md">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-auto border border-gray-300 rounded-lg shadow-md transform scale-x-[-1]" // Mirror the video feed
      />
      <canvas ref={canvasRef} className="hidden" />
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 200"
          className="w-48 h-48 opacity-50"
        >
          <circle
            cx="100"
            cy="100"
            r="100"
            stroke="blue"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>
      <p className="text-center text-gray-600 font-medium mt-4">{feedback}</p>
    </div>
  );
};

export default FaceCaptureComponent;
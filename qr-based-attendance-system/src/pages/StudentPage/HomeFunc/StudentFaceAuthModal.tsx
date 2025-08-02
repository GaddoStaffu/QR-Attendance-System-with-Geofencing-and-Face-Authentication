import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";

interface FaceAuthModalProps {
  onSuccess: (base64Image: string) => void; // Callback to pass the captured base64 image to the parent
  onClose: () => void; // Callback to close the modal
}

const StudentFaceAuthModal: React.FC<FaceAuthModalProps> = ({
  onSuccess,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [feedback, setFeedback] = useState<string>(
    "Initializing face authentication..."
  );
  const [loading, setLoading] = useState<boolean>(true);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        setFeedback("Models loaded. Please position your face in the circle.");
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
        setFeedback("Please position your face in the circle.");
        setLoading(false);
      } catch (err) {
        console.error("Error starting camera:", err);
        setFeedback(
          "Failed to initialize camera. Please check your permissions."
        );
        setLoading(false);
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
              handleCapture(); // Capture the full frame
            }, 1000); // Automatically capture after 1 second
          }
        } else {
          setFeedback("Please position your face in the circle.");
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

    const interval = setInterval(detectFace, 500); // Check for a face every 500ms

    loadModels();
    startCamera();

    return () => {
      clearInterval(interval);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, []);

  const handleCapture = async () => {
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
      // Convert the full frame to a Base64 string with maximum quality
      const base64Image = canvas.toDataURL("image/jpeg", 1.0); // Use maximum quality
      setFeedback("Face captured successfully!");
      onSuccess(base64Image.split(",")[1]); // Pass the Base64 image (without the prefix) to the parent
      onClose(); // Close the modal
    } catch (err) {
      console.error("Error capturing face:", err);
      setFeedback("An error occurred. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
          Face Authentication
        </h2>
        <p className="text-center text-gray-600 mb-4">{feedback}</p>

        <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <p className="text-gray-600">Loading...</p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" // Mirror the video feed
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
                r="80"
                stroke="blue"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentFaceAuthModal;

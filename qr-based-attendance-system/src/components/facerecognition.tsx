import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import "../index.css";
import { Button } from "./ui/button";

const FaceRecognition = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // State to track loading status
  const [isDetectingFace, setIsDetectingFace] = useState(false); // State for detecting face
  const [faceDetectionError, setFaceDetectionError] = useState<string | null>(
    null
  ); // State for error message

  useEffect(() => {
    // Start video stream immediately on component mount
    startVideo();

    // Load face-api.js models after video is initialized
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    };

    // Only start processing after both the video stream and models are loaded
    const checkVideoAndModels = async () => {
      await loadModels();
      setIsLoading(false); // Models are loaded, hide loading message
      setIsVideoReady(true); // Enable face recognition when video is ready
    };

    checkVideoAndModels();

    // Cleanup the video stream when component is unmounted
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const startVideo = async () => {
    if (videoRef.current) {
      // Prompt for user permission and start video stream immediately
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      videoRef.current.srcObject = stream;

      // Set video ready status when video starts
      videoRef.current.onloadeddata = () => {
        setIsVideoReady(true); // Video is ready to process
      };
    }
  };

  const handleFaceVerification = async () => {
    setIsDetectingFace(true); // Start loading face detection process
    setFaceDetectionError(null); // Clear any previous error message

    if (videoRef.current && isVideoReady && canvasRef.current) {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Resize canvas to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Extract the first detected face
          const faceBox = detections[0].detection.box;
          const { x, y, width, height } = faceBox;

          // Crop the face region
          const faceCanvas = document.createElement("canvas");
          faceCanvas.width = width;
          faceCanvas.height = height;
          const faceContext = faceCanvas.getContext("2d");

          if (faceContext) {
            faceContext.drawImage(
              canvas,
              x,
              y,
              width,
              height,
              0,
              0,
              width,
              height
            );

            // Convert cropped face to an image URL
            const faceImageUrl = faceCanvas.toDataURL("image/png");
            setFaceImage(faceImageUrl);
          }
        }
      } else {
        // Set error message if no face is detected
        setFaceDetectionError(
          "No face detected. Please ensure your face is visible."
        );
      }
    } else {
      console.warn("Video is not ready or no video source found.");
      setFaceDetectionError("Error with video or model loading.");
    }

    setIsDetectingFace(false); // Hide loading once face is detected or error occurs
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <video
        ref={videoRef}
        width="640"
        height="480"
        autoPlay
        muted
        className="border-2 border-gray-300 rounded-md"
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {isLoading ? (
        <p>Loading face detection models... Please wait.</p>
      ) : (
        <Button
          variant="outline"
          onClick={handleFaceVerification}
          disabled={!isVideoReady || isDetectingFace} // Disable button during detection
        >
          {isDetectingFace ? "Detecting..." : "Detect Face"}
        </Button>
      )}
      {isDetectingFace && <p>Detecting face... Please wait.</p>}
      {faceDetectionError && (
        <p className="text-red-500 mt-2">{faceDetectionError}</p> // Display error message
      )}
      {faceImage && (
        <div className="mt-4">
          <p>Detected Face:</p>
          <img
            src={faceImage}
            alt="Captured Face"
            className="border-2 rounded-md mt-2"
          />
        </div>
      )}
    </div>
  );
};

export default FaceRecognition;

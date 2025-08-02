import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import FaceCaptureComponent from "./StudentFaceCapture";

const API_URL = import.meta.env.VITE_API_URL;
const ANGLES = [
  "Front-facing",
  "Left angle",
  "Right angle",
  "Up angle",
  "Down angle",
];

const StudentRegisterFace: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0); // Track the current angle step
  const [images, setImages] = useState<string[]>([]); // Store base64 images for all angles
  const [showPopup, setShowPopup] = useState<boolean>(true); // Show popup for step confirmation
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true); // Track camera state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Prevent multiple submissions
  const [isFaceRegistered, setIsFaceRegistered] = useState<boolean | null>(null); // Track if face is registered
  const navigate = useNavigate();

  // Check if the face is already registered when the component mounts
  useEffect(() => {
    const checkFaceRegistration = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("User is not authenticated");

        const response = await axios.get(`${API_URL}/face-auth/is_face_registered`, {
          params: { token },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setIsFaceRegistered(response.data.is_registered);
      } catch (err) {
        console.error("Error checking face registration:", err);
        alert("An error occurred while checking face registration.");
      }
    };

    checkFaceRegistration();
  }, []);

  const handleCapture = (base64Image: string) => {
    // Store the captured image
    setImages((prev) => [...prev, base64Image]);

    // If there are more steps, show the popup for the next step
    if (currentStep < ANGLES.length - 1) {
      setShowPopup(true); // Show the popup for the next step
    } else if (images.length === ANGLES.length - 1) {
      // Ensure the final image is captured before submitting
      setIsCameraActive(false); // Stop the camera immediately after the final capture
      submitImages([...images, base64Image]);
    }
  };

  const submitImages = async (finalImages: string[]) => {
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("User is not authenticated");

      // Decide which endpoint to call based on `isFaceRegistered`
      const endpoint = isFaceRegistered ? "/face-auth/overwrite_face" : "/face-auth/register_face";

      // Submit the images to the appropriate endpoint
      const response = await axios.post(
        `${API_URL}${endpoint}`,
        {
          token,
          images: finalImages, // Send all 5 base64 images to the backend
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message);
      navigate("/student-dashboard/profile"); // Redirect to the profile page
    } catch (err) {
      console.error("Error submitting images:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false); // Reset the submission state
    }
  };

  const handlePopupConfirm = () => {
    // Hide the popup but do not increment the step yet
    setShowPopup(false);
  };

  const handleNextStep = () => {
    // Increment the step after the current step is completed
    if (currentStep < ANGLES.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setShowPopup(true); // Show the popup for the next step
    }
  };

  const handleCancel = () => {
    // Stop the camera and navigate back
    setIsCameraActive(false);
    navigate("/student-dashboard/profile");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Register Your Face
      </h1>

      {!showPopup && isCameraActive && (
        <FaceCaptureComponent
          isActive={isCameraActive} // Pass the camera state as a prop
          onCapture={(base64Image) => {
            handleCapture(base64Image);
            handleNextStep(); // Move to the next step after capturing the image
          }}
          feedbackMessage={`Please position your face for ${ANGLES[currentStep]}.`}
        />
      )}

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            {currentStep === 0 ? (
              <>
                <h2 className="text-xl font-bold text-center mb-4 text-gray-800">
                  Instructions
                </h2>
                <p className="text-center text-gray-600 mb-4">
                  Follow these instructions for the best results:
                </p>
                <ul className="list-disc list-inside text-left max-w-md mx-auto text-sm mb-4 text-gray-600">
                  <li>Ensure good lighting. Avoid backlight or shadows.</li>
                  <li>
                    Face the camera directly. Avoid tilting or rotating your
                    head unless instructed.
                  </li>
                  <li>
                    Remove any sunglasses, masks, or hair covering your face.
                  </li>
                  <li>Position your face within the blue circle.</li>
                </ul>
                <div className="flex justify-center">
                  <button
                    className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition ml-4"
                    onClick={handlePopupConfirm}
                  >
                    Confirm
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-center mb-4 text-gray-800">
                  Step {currentStep + 1}: {ANGLES[currentStep]}
                </h2>
                <p className="text-center text-gray-600 mb-4">
                  Please position your face for the "{ANGLES[currentStep]}"
                  angle and click "OK" to proceed.
                </p>
                <div className="flex justify-center">
                  <button
                    className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition ml-4"
                    onClick={handlePopupConfirm}
                  >
                    OK
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRegisterFace;
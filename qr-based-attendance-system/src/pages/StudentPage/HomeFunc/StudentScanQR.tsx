import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import QRScanner from "./QRScanner";
import StudentFaceAuthModal from "./StudentFaceAuthModal";

const API_URL = import.meta.env.VITE_API_URL;

const StudentScanQR: React.FC = () => {
  const navigate = useNavigate();
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(true); // State to control QRScanner visibility
  const [isFaceAuthOpen, setIsFaceAuthOpen] = useState<boolean>(false);
  const [roomIdForFaceAuth, setRoomIdForFaceAuth] = useState<number | null>(
    null
  );
  const [geofenceLocation, setGeofenceLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleScanSuccess = async (decodedText: string) => {
    console.log(`QR Code scanned: ${decodedText}`);

    // Close the QRScanner modal
    setIsQRScannerOpen(false);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setErrorMessage("You are not logged in. Please log in to join a room.");
        return;
      }

      const roomId = parseInt(decodedText); // Assuming the QR code contains the room_id
      if (isNaN(roomId)) {
        setErrorMessage("Invalid QR Code. Please try again.");
        return;
      }

      // Fetch room settings
      const roomSettingsResponse = await axios.get(
        `${API_URL}/attendance/scan_qr`,
        {
          params: { room_id: roomId, token },
        }
      );

      const { isFaceAuth, isGeofence, is_archived } = roomSettingsResponse.data;

      if (is_archived) {
        setErrorMessage("This room is archived. You cannot Mark Attendance.");
        return;
      }
      if (isGeofence) {
        // Handle geolocation
        try {
          const location = await getGeolocation();
          setGeofenceLocation(location); // Save geolocation for later use
          console.log("Geolocation fetched:", location);

          if (isFaceAuth) {
            // If both geofencing and face authentication are required, open the FaceAuth modal
            setRoomIdForFaceAuth(roomId);
            setIsFaceAuthOpen(true);
          } else {
            // If only geofencing is required, mark attendance
            await takeAttendance(roomId, token, undefined, location);
          }
        } catch (error) {
          console.error("Error fetching geolocation:", error);
          setErrorMessage(
            "Failed to fetch your location. Please enable location services and try again."
          );
        }
      } else if (isFaceAuth) {
        // If only face authentication is required, open the FaceAuth modal
        setRoomIdForFaceAuth(roomId);
        setIsFaceAuthOpen(true);
      } else {
        // Handle attendance without face authentication or geolocation
        await takeAttendance(roomId, token);
      }
    } catch (error: any) {
      console.error("Error fetching room settings:", error);
      if (error.response) {
        setErrorMessage(error.response.data.detail || "An error occurred.");
      } else {
        setErrorMessage("An error occurred while processing the QR code.");
      }
    }
  };

  const getGeolocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true, // Request high accuracy
          timeout: 30000, // Increase timeout to 30 seconds
          maximumAge: 0, // Prevent using cached location data
        }
      );
    });
  };

  const takeAttendance = async (
    roomId: number,
    token: string,
    base64Image?: string,
    geofenceLocation?: { latitude: number; longitude: number }
  ) => {
    try {
      const requestBody: any = {
        room_id: roomId,
        token: token,
      };

      // Include face authentication data if provided
      if (base64Image) {
        requestBody.base64_image = base64Image; // Send the base64 image
      }

      // Include geolocation data if provided
      if (geofenceLocation) {
        requestBody.geofence_location = geofenceLocation;
      }

      const response = await axios.post(
        `${API_URL}/attendance/take_attendance`,
        requestBody
      );

      alert(response.data.message);
      navigate("/student-dashboard/home");
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      if (error.response) {
        setErrorMessage(error.response.data.detail || "An error occurred.");
      } else {
        setErrorMessage("An error occurred while marking attendance.");
      }
    }
  };

  const handleFaceAuthSuccess = async (base64_image: string) => {
    setIsFaceAuthOpen(false);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setErrorMessage("You are not logged in. Please log in to join a room.");
      return;
    }

    try {
      // Use the saved geolocation (if available) along with the base64 image
      await takeAttendance(
        roomIdForFaceAuth!,
        token,
        base64_image, // Pass the base64 image as a string
        geofenceLocation || undefined
      );
    } catch (error: any) {
      console.error(
        "Error during face authentication:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.detail ||
          "An error occurred during face authentication."
      );
    }
  };

  const handleCloseFaceAuth = () => {
    setIsFaceAuthOpen(false);
    setRoomIdForFaceAuth(null);
  };

  const closeErrorModal = () => {
    setErrorMessage(null); // Close the error modal
    setIsQRScannerOpen(false); // Close the QRScanner modal
    setIsFaceAuthOpen(false); // Close the FaceAuth modal
    navigate("/student-dashboard/home"); // Navigate back to the home page
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
      <div className="text-center text-white mb-4">
        <h1 className="text-2xl font-bold">Scan QR Code</h1>
        <p className="text-sm">Point your camera at the QR code to scan it.</p>
      </div>

      {/* QR Scanner */}
      {isQRScannerOpen && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => {
            setIsQRScannerOpen(false); // Close the QRScanner modal
            navigate("/student-dashboard/home");
          }}
        />
      )}

      {/* Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-80 text-center">
            <h2 className="text-xl font-bold mb-4 text-red-600">Error</h2>
            <p className="text-gray-700 mb-4">{errorMessage}</p>
            <button
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
              onClick={closeErrorModal}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Face Authentication Modal */}
      {isFaceAuthOpen && (
        <StudentFaceAuthModal
          onSuccess={handleFaceAuthSuccess}
          onClose={handleCloseFaceAuth}
        />
      )}
    </div>
  );
};

export default StudentScanQR;

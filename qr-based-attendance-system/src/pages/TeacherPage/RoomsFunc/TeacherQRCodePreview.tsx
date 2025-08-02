import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios"; // Import axios

const API_URL = import.meta.env.VITE_API_URL;

const TeacherQRCodePreview: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>(); // Extract roomId from the URL
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null); // State to store QR code URL
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State for error messages

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        if (!roomId) {
          setErrorMessage("Room ID is missing.");
          return;
        }

        const token = localStorage.getItem("access_token");
        if (!token) {
          setErrorMessage("You are not logged in.");
          return;
        }

        const response = await axios.get(
          `${API_URL}/rooms/${roomId}/qr_code_preview`,
          {
            responseType: "blob", // Expect a blob response for the QR code image
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Create a blob URL for the QR code image
        const url = URL.createObjectURL(response.data);
        setQrCodeUrl(url);
        setErrorMessage(null); // Clear any previous error messages
      } catch (error: any) {
        console.error("Error fetching QR code preview:", error);
        if (error.response && error.response.status === 404) {
          setErrorMessage(
            "Please generate a QR code for attendance at the room settings."
          );
        } else if (error.response && error.response.data) {
          setErrorMessage(
            error.response.data.detail || "Failed to fetch QR code preview."
          );
        } else {
          setErrorMessage(
            "An error occurred while fetching the QR code preview."
          );
        }
      }
    };

    fetchQRCode();
  }, [roomId]);

  return (
    <div className="p-4">
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
      {qrCodeUrl ? (
        <div className="flex flex-col items-center">
          <img
            src={qrCodeUrl}
            alt="QR Code Preview"
            className="w-64 h-64 object-contain border rounded shadow"
          />
        </div>
      ) : (
        !errorMessage && <p>Loading QR code...</p>
      )}
    </div>
  );
};

export default TeacherQRCodePreview;

import { Button } from "@/components/ui/button";
import React from "react";
import { useParams } from "react-router-dom";
import axios from "axios"; // Import axios

const API_URL = import.meta.env.VITE_API_URL;

const TeacherGenerateQRCode: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>(); // Extract roomId from the URL

  const handleGenerateQRCode = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("You are not logged in.");
        return;
      }

      const response = await axios.post(
        `${API_URL}/rooms/${roomId}/settings/generate_qr_code`,
        {}, // Empty body for POST request
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Add Authorization header
          },
        }
      );

      // Debugging: Log the response status
      console.log("Response status:", response.status);

      if (response.status === 200 || response.status === 201) {
        alert(`${response.data.message}`);
      }
    } catch (error: any) {
      console.error("Error generating QR code:", error);
      if (error.response && error.response.data) {
        alert(error.response.data.detail || "Failed to generate QR code.");
      } else {
        alert("An error occurred while generating the QR code.");
      }
    }
  };

  return (
    <div>
      <Button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={handleGenerateQRCode}
      >
        Generate QR Code
      </Button>
    </div>
  );
};

export default TeacherGenerateQRCode;

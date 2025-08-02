import { Button } from "@/components/ui/button";
import React from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const TeacherDownloadQRCode: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>(); // Extract roomId from the URL

  const handleDownloadQRCode = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("You are not logged in.");
        return;
      }

      // Make a GET request to download the QR code
      const response = await axios.get(
        `${API_URL}/rooms/${roomId}/settings/download_qr_code`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Add Authorization header
          },
          responseType: "blob", // Ensure the response is treated as a binary file
        }
      );

      // Create a URL for the downloaded file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Extract the filename from the response headers or use a default name
      const contentDisposition = response.headers["content-disposition"];
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "") ||
          "qr_code.png"
        : "qr_code.png";

      link.setAttribute("download", filename); // Set the filename
      document.body.appendChild(link);
      link.click(); // Trigger the download
      link.remove(); // Clean up the link element
    } catch (error: any) {
      console.error("Error downloading QR code:", error);
      alert("Failed to download QR code. Please try again.");
    }
  };

  return (
    <div>
      <Button
        onClick={handleDownloadQRCode}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Download QR Code
      </Button>
    </div>
  );
};

export default TeacherDownloadQRCode;

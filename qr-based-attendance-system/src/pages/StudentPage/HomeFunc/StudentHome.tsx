import React from "react";
import { Button } from "@/components/ui/button";
import { ScanQrCode, DoorOpen } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

const StudentHome: React.FC = () => {
  const navigate = useNavigate();

  const handleJoinRoomOpen = () => {
    navigate("/student-dashboard/home/join-room"); // Navigate to the join-room route
  };

  return (
    <div className="p-4">
      <div className="relative flex justify-center items-center mb-8 h-48 md:h-64">
        {/* Corrected image path */}
        <img
          src="/images/bg2-upscale-3.9x.jpg"
          className="absolute inset-0 w-full h-full object-cover"
          alt="Background"
        />
        <div className="relative z-10">
          {/* Corrected image path */}
          <img
            src="/images/ustp_logo.jpg"
            alt="USTP Logo"
            className="h-24 md:h-48 rounded-full border-4 border-white shadow-lg"
          />
        </div>
      </div>
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-4xl">
          Welcome to{" "}
          <span className="font-bold">
            QR Attendance System Student Platform
          </span>
        </h1>
      </div>
      <div className="bg-gray-100 p-4 md:p-8 rounded-lg shadow-md w-full flex flex-col md:flex-row gap-4 justify-center items-center mb-8">
        <Button
          className="bg-blue-400 text-white py-4 md:py-6 px-6 md:px-10 rounded text-lg md:text-2xl flex flex-col items-center justify-center w-full md:w-40 h-32 md:h-40 hover:bg-blue-700"
          onClick={() => navigate("/student-dashboard/home/scan-qr")}
        >
          <ScanQrCode className="w-12 md:w-16 h-12 md:h-16" />
          <span>Scan QR</span>
        </Button>
        <Button
          className="bg-green-500 text-white py-4 md:py-6 px-6 md:px-10 rounded text-lg md:text-2xl flex flex-col items-center justify-center w-full md:w-40 h-32 md:h-40 hover:bg-green-700"
          onClick={handleJoinRoomOpen}
        >
          <DoorOpen className="w-12 md:w-16 h-12 md:h-16" />
          <span>Join Room</span>
        </Button>
      </div>
      <div className="bg-gray-100 p-4 md:p-8 rounded-lg shadow-md h-full w-full">
        {/* This part wil be about new attendance or stuff */}
      </div>
      <Outlet /> {/* Render nested routes here */}
    </div>
  );
};

export default StudentHome;

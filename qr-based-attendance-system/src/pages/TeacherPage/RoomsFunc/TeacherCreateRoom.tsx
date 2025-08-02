import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const TeacherCreateRoom: React.FC = () => {
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [geofencing, setGeofencing] = useState(false);
  const [faceAuthentication, setFaceAuthentication] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!className || !section) {
      setError("Class Name and Section are required.");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("You are not logged in. Please log in and try again.");
        return;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload.user_id;

      const newRoom = {
        user_id: userId,
        class_name: className,
        section: section,
        description: description || null,
        isGeofence: geofencing,
        geofence_id: null,
        isFaceAuth: faceAuthentication,
        created_at: new Date().toISOString(),
        room_code: `${className}-${section}`,
      };

      const response = await axios.post(
        `${API_URL}/rooms/create_room`,
        newRoom,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        navigate("/teacher-dashboard/rooms"); // Redirect to the room management page
      }
    } catch (error: any) {
      setError(
        error.response?.data?.detail ||
          "Failed to create room. Please try again."
      );
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Create a New Room</h1>
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition duration-200"
          onClick={() => navigate("/teacher-dashboard/rooms")}
        >
          Cancel
        </button>
      </div>

      {/* Form Section */}
      <div className="bg-white p-8 rounded-lg shadow-md">
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Class Name */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Class Name
          </label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Enter class name"
          />
        </div>

        {/* Section */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Section
          </label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="Enter section"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Description
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
          />
        </div>

        {/* Settings */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Settings
          </label>
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={geofencing}
                onChange={(e) => setGeofencing(e.target.checked)}
              />
              <span className="ml-2 text-gray-700">Enable Geofencing</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={faceAuthentication}
                onChange={(e) => setFaceAuthentication(e.target.checked)}
              />
              <span className="ml-2 text-gray-700">
                Enable Face Authentication
              </span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end">
          <button
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition duration-200"
            onClick={handleCreateRoom}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherCreateRoom;

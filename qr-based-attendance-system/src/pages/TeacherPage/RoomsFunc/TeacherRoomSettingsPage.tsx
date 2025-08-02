import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeacherGenerateQRCode from "./TeacherGenerateQRCode";
import TeacherDownloadQRCode from "./TeacherDownloadQRCode";
import axios from "axios";
import TeacherArchiveRoomButton from "./TeacherArchiveRoomButton";

const TeacherRoomSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const API_URL = import.meta.env.VITE_API_URL;

  const [isGeofence, setIsGeofence] = useState<boolean>(false);
  const [isFaceAuth, setIsFaceAuth] = useState<boolean>(false);
  const [geofenceName, setGeofenceName] = useState<string | null>(null);
  const [availableGeofences, setAvailableGeofences] = useState<any[]>([]);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<number | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [className, setClassName] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Retrieve the token from localStorage
  const token = localStorage.getItem("access_token");

  const handleUpdateRoomDetails = async () => {
    try {
      if (!token) {
        setErrorMessage("You are not logged in.");
        return;
      }

      await axios.put(
        `${API_URL}/rooms/${roomId}/update_room_details`,
        {
          class_name: className, // Use class_name instead of className
          section: section,
          description: description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Room details updated successfully!");
    } catch (error: any) {
      setErrorMessage("Failed to update room details.");
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (!token) {
          setErrorMessage("You are not logged in.");
          setIsLoading(false);
          return;
        }

        // Fetch attendance settings
        const attendanceResponse = await axios.get(
          `${API_URL}/rooms/${roomId}/settings/attendance_settings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setIsGeofence(attendanceResponse.data.isGeofence);
        setIsFaceAuth(attendanceResponse.data.isFaceAuth);

        // Fetch current geofence
        const geofenceResponse = await axios.get(
          `${API_URL}/geofence/${roomId}/get_geofence_byroom`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (geofenceResponse.data.alert) {
          setGeofenceName(null);
        } else {
          setGeofenceName(geofenceResponse.data.geofence_name);
        }

        // Fetch available geofences
        const availableGeofencesResponse = await axios.get(
          `${API_URL}/geofence/get_all_geofences`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setAvailableGeofences(availableGeofencesResponse.data);
        setErrorMessage(null);
      } catch (error: any) {
        setErrorMessage("Failed to fetch settings or geofence details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [roomId, token]);

  const handleSaveAttendanceSettings = async () => {
    try {
      if (!token) {
        setErrorMessage("You are not logged in.");
        return;
      }

      await axios.put(
        `${API_URL}/rooms/${roomId}/settings/attendance_settings`,
        { isGeofence, isFaceAuth },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Attendance settings updated successfully!");
    } catch (error: any) {
      setErrorMessage("Failed to update attendance settings.");
    }
  };

  const handleSaveGeofence = async () => {
    try {
      if (!token) {
        setErrorMessage("You are not logged in.");
        return;
      }

      if (!selectedGeofenceId) {
        alert("Please select a geofence location.");
        return;
      }

      await axios.put(
        `${API_URL}/rooms/${roomId}/set_geofence`,
        { geofence_id: selectedGeofenceId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Geofence location updated successfully!");
      setGeofenceName(
        availableGeofences.find(
          (geofence) => geofence.geofence_id === selectedGeofenceId
        )?.location
      );
    } catch (error: any) {
      setErrorMessage("Failed to update geofence location.");
    }
  };

  const handleBack = () => {
    navigate(`/teacher-dashboard/rooms/${roomId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg">Loading settings...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-lg">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 min-h-screen space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-end">
        <button
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          onClick={handleBack}
        >
          Back
        </button>
      </div>

      {/* Room Details Section */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Update Class Details
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Class Name
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Section
            </label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter section"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room description"
            />
          </div>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleUpdateRoomDetails}
          >
            Save Room Details
          </button>
        </div>
      </div>

      {/* Attendance and Geofence Settings Section */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Attendance Settings Section */}
        <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Attendance Settings
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable Geofence</span>
              <input
                type="checkbox"
                checked={isGeofence}
                onChange={(e) => setIsGeofence(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                Enable Face Authentication
              </span>
              <input
                type="checkbox"
                checked={isFaceAuth}
                onChange={(e) => setIsFaceAuth(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
            </div>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleSaveAttendanceSettings}
            >
              Save Attendance Settings
            </button>
          </div>
        </div>

        {/* Geofence Settings Section */}
        <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Geofence Settings
          </h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <strong>Current Geofence:</strong> {geofenceName || "Not Set"}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Geofence Location
              </label>
              <select
                value={selectedGeofenceId || ""}
                onChange={(e) => setSelectedGeofenceId(Number(e.target.value))}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${
                  isGeofence
                    ? "focus:ring-blue-500"
                    : "bg-gray-200 cursor-not-allowed"
                }`}
                disabled={!isGeofence}
              >
                <option value="" disabled>
                  Select a geofence location
                </option>
                {availableGeofences.map((geofence) => (
                  <option
                    key={geofence.geofence_id}
                    value={geofence.geofence_id}
                  >
                    {geofence.location}
                  </option>
                ))}
              </select>
            </div>
            <button
              className={`px-4 py-2 rounded ${
                isGeofence
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!isGeofence}
              onClick={handleSaveGeofence}
            >
              Save Geofence Location
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Room Settings
        </h2>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
          onClick={() =>
            navigate(
              `/teacher-dashboard/rooms/${roomId}/settings/manage_students`
            )
          }
        >
          Manage Students
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full mt-3"
          onClick={() =>
            navigate(
              `/teacher-dashboard/rooms/${roomId}/settings/generate_report`
            )
          }
        >
          Export Attendance
        </button>
        {token && <TeacherArchiveRoomButton roomId={roomId} token={token} />}
      </div>
    </div>
  );
};

export default TeacherRoomSettingsPage;
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudentAttendanceSchedules from "./StudentAttendanceSchedules";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const StudentRoomDetails: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(""); // Search query state
  const [sortField, setSortField] = useState<string>("date"); // Sort field state
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // Sort order state

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setErrorMessage(
            "You are not logged in. Please log in to view room details."
          );
          setIsLoading(false);
          return;
        }

        const response = await axios.get(`${API_URL}/rooms/get_room_details`, {
          params: { room_id: roomId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setRoomData(response.data);
        setErrorMessage(null);
      } catch (error: any) {
        setErrorMessage(
          error.response?.data?.detail || "Failed to fetch room details."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading room details...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-500 text-center mb-4">{errorMessage}</p>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={() => navigate("/student-dashboard/rooms")}
        >
          Back to Room List
        </button>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-700 text-center mb-4">
          No room details available.
        </p>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={() => navigate("/student-dashboard/rooms")}
        >
          Back to Room List
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={() => navigate("/student-dashboard/rooms")}
        >
          Back to Room List
        </button>
      </div>

      {/* Room Details Section */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {roomData.class_name}
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Section:</strong> {roomData.section}
          </p>
          <p>
            <strong>Owner:</strong> {roomData.owner?.first_name || "Unknown"}{" "}
            {roomData.owner?.last_name || ""}
          </p>
          <p>
            <strong>Description:</strong>{" "}
            {roomData.description || "No Description"}
          </p>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Search Input */}
          <input
            type="text"
            className="w-full sm:w-1/2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by schedule name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Sort Controls */}
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-600">
              Sort By:
              <select
                className="ml-2 p-2 border border-gray-300 rounded-lg focus:outline-none"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
              >
                <option value="date">Date</option>
                <option value="status">Status</option>
              </select>
            </label>
            <button
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Schedules Section */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          Attendance Schedules
        </h3>
        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
          {roomId && (
            <StudentAttendanceSchedules
              roomId={roomId}
              searchQuery={searchQuery} // Pass search query to child
              sortField={sortField} // Pass sort field to child
              sortOrder={sortOrder} // Pass sort order to child
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentRoomDetails;

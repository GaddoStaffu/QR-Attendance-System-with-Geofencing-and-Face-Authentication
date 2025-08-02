import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentRoomCard from "./StudentRoomCard";

const API_URL = import.meta.env.VITE_API_URL; // Ensure this is set in your .env file

const StudentRoomManagement: React.FC = () => {
  const [roomsData, setRoomsData] = useState<any[]>([]); // Stores the rooms the student has joined
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]); // Stores the filtered rooms
  const [searchQuery, setSearchQuery] = useState<string>(""); // Search query state
  const [filterGeofence, setFilterGeofence] = useState<boolean>(false); // Geofencing filter state
  const [filterFaceAuth, setFilterFaceAuth] = useState<boolean>(false); // Face Authentication filter state
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Error message state
  const navigate = useNavigate();

  useEffect(() => {
  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("No token found");
        setErrorMessage(
          "You are not logged in. Please log in to view your rooms."
        );
        return;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload.user_id;

      const response = await fetch(
        `${API_URL}/rooms/joined_rooms?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Filter out archived rooms
        const nonArchivedRooms = data.filter((room: any) => !room.is_archived);

        setRoomsData(nonArchivedRooms); // Populate the rooms data with non-archived rooms
        setFilteredRooms(nonArchivedRooms); // Initialize filtered rooms
      } else {
        console.error("Failed to fetch joined rooms");
        setErrorMessage(
          "Failed to fetch your joined rooms. Please try again later."
        );
      }
    } catch (error) {
      console.error("Error fetching joined rooms:", error);
      setErrorMessage("An error occurred while fetching your joined rooms.");
    }
  };

  fetchRooms();
}, []);

  // Handle search and filter logic
  useEffect(() => {
    let filtered = roomsData;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((room) =>
        [room.class_name, room.section, room.description]
          .filter(Boolean)
          .some((field) =>
            field.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Filter by Geofencing
    if (filterGeofence) {
      filtered = filtered.filter((room) => room.isGeofence);
    }

    // Filter by Face Authentication
    if (filterFaceAuth) {
      filtered = filtered.filter((room) => room.isFaceAuth);
    }

    setFilteredRooms(filtered);
  }, [searchQuery, filterGeofence, filterFaceAuth, roomsData]);

  const handleRoomClick = (roomId: string) => {
    navigate(`/student-dashboard/rooms/${roomId}`); // Navigate to room details
  };

  return (
    <div className="p-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-2xl font-bold mb-4 sm:mb-0">My Classrooms</h2>

        {/* Search Input */}
        <div className="relative w-full sm:w-1/3">
          <input
            type="text"
            className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by class name, section, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1016.65 16.65z"
            />
          </svg>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-blue-600"
              checked={filterGeofence}
              onChange={(e) => setFilterGeofence(e.target.checked)}
            />
            <span className="ml-2 text-gray-700">Geofencing</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-blue-600"
              checked={filterFaceAuth}
              onChange={(e) => setFilterFaceAuth(e.target.checked)}
            />
            <span className="ml-2 text-gray-700">Face Authentication</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
      )}

      {/* Room Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => (
            <StudentRoomCard
              key={room.room_id}
              className={room.class_name}
              section={room.section}
              description={room.description}
              geofencing={room.isGeofence}
              faceAuthentication={room.isFaceAuth}
              onClick={() => handleRoomClick(room.room_id)} // Navigate to room details
            />
          ))
        ) : (
          <p className="text-gray-500 text-center col-span-full">
            No classrooms match your search or filters.
          </p>
        )}
      </div>
    </div>
  );
};

export default StudentRoomManagement;

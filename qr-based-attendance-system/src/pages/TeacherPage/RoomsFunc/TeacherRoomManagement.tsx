import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TeacherRoomCard from "./TeacherRoomCard";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const TeacherRoomManagement: React.FC = () => {
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGeofence, setFilterGeofence] = useState(false);
  const [filterFaceAuth, setFilterFaceAuth] = useState(false);
  const navigate = useNavigate();

  // Fetch rooms from the backend
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No token found");
          return;
        }

        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.user_id;

        const response = await axios.get(`${API_URL}/rooms/get_rooms`, {
          params: { user_id: userId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Filter out archived rooms and sort by creation date (newest first)
        const filteredRooms = response.data.rooms
          .filter((room: any) => !room.is_archived) // Only include rooms where is_archived is false
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

        setRoomsData(filteredRooms);
        setFilteredRooms(filteredRooms); // Initialize filtered rooms
      } catch (error: any) {
        console.error("Error fetching rooms:", error);
        if (error.response) {
          console.error("Server responded with:", error.response.data);
        }
      }
    };

    fetchRooms();
  }, []);

  // Handle dynamic search and filtering
  useEffect(() => {
    let filtered = roomsData;

    // Filter by search query (dynamic search across multiple fields)
    if (searchQuery) {
      filtered = filtered.filter((room) =>
        [room.class_name, room.section, room.description]
          .filter(Boolean) // Ensure no null/undefined values
          .some((field) =>
            field.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Filter by geofencing
    if (filterGeofence) {
      filtered = filtered.filter((room) => room.isGeofence);
    }

    // Filter by face authentication
    if (filterFaceAuth) {
      filtered = filtered.filter((room) => room.isFaceAuth);
    }

    setFilteredRooms(filtered);
  }, [searchQuery, filterGeofence, filterFaceAuth, roomsData]);

  const handleRoomClick = (roomId: string) => {
    navigate(`/teacher-dashboard/rooms/${roomId}`);
  };

  const handleCreateRoom = () => {
    navigate(`/teacher-dashboard/rooms/create`);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Classroom Management
        </h2>
        <button
          className="bg-green-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-green-600 transition duration-200"
          onClick={handleCreateRoom}
        >
          + Create Room
        </button>
      </div>
      {/* Search and Filter Section */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Search Bar */}
          <div className="relative w-full sm:w-1/2">
            <input
              type="text"
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by class name, section, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
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

          {/* Filters */}
          <div className="flex items-center space-x-4">
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
      </div>

      {/* Room Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => (
            <TeacherRoomCard
              key={room.room_id}
              className={room.class_name}
              section={room.section}
              description={room.description}
              geofencing={room.isGeofence}
              faceAuthentication={room.isFaceAuth}
              onClick={() => handleRoomClick(room.room_id)} // Pass the click handler
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

export default TeacherRoomManagement;
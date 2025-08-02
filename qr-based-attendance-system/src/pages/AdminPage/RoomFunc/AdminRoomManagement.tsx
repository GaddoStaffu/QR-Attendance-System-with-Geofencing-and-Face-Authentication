import axios from "axios";
import React, { useEffect, useState } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import AdminRoomDetails from "./AdminRoomDetails";

const API_URL = import.meta.env.VITE_API_URL;

interface Room {
  is_archived: boolean;
  room_id: number;
  owner_first_name: string;
  owner_last_name: string;
  owner_email?: string;
  classname: string;
  section: string;
  description: string;
  isGeofence: boolean;
  isFaceAuth: boolean;
  geofence_id?: number;
  geofence_location?: string;
}

const AdminRoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin-rooms/get_rooms`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        setRooms(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setError("Failed to fetch rooms. Please try again later.");
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const handleEditRoom = (roomId: number) => {
    const foundRoom = rooms.find((r) => r.room_id === roomId) || null;
    setSelectedRoom(foundRoom);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedRoom(null);
  };

  const columns: TableColumn<Room>[] = [
    {
      name: "Room ID",
      selector: (row) => row.room_id,
      sortable: true,
    },
    {
      name: "Owner",
      cell: (row) =>
        row.owner_first_name && row.owner_last_name
          ? `${row.owner_first_name} ${row.owner_last_name}`
          : "N/A",
      sortable: true,
    },
    {
      name: "Class Name",
      selector: (row) => row.classname || "N/A",
      sortable: true,
    },
    {
      name: "Section",
      selector: (row) => row.section || "N/A",
      sortable: true,
    },
    {
      name: "Description",
      selector: (row) => row.description || "N/A",
      sortable: false,
    },
    {
      name: "Archived",
      selector: (row) => (row.is_archived ? "Yes" : "No"),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
          onClick={() => handleEditRoom(row.room_id)}
        >
          Edit
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  const filteredRooms = rooms.filter((room) =>
    Object.values(room).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Room Management</h1>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rooms..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-600">Loading rooms...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRooms}
          pagination
          highlightOnHover
          striped
          responsive
          className="bg-white shadow rounded-lg"
        />
      )}

      {/* Details/Edit Modal */}
      {showDetailsModal && selectedRoom && (
        <AdminRoomDetails room={selectedRoom} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default AdminRoomManagement;

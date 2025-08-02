import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminGeofenceAddLocation from "./AdminGeofenceAddLocation";
import axios from "axios";
import DataTable, { TableColumn } from "react-data-table-component";

const API_URL = import.meta.env.VITE_API_URL;

interface Geofence {
  geofence_id: number;
  location: string;
  latitude: number;
  longitude: number;
  radius: number;
}

const AdminGeofencingManagement: React.FC = () => {
  const navigate = useNavigate(); // Initialize the useNavigate hook
  const [geofences, setGeofences] = useState<Geofence[]>([]); // State to store the list of geofences
  const [loading, setLoading] = useState(true); // State to handle loading state
  const [error, setError] = useState<string | null>(null); // State to handle errors
  const [searchQuery, setSearchQuery] = useState<string>(""); // State for search input

  useEffect(() => {
    const fetchGeofences = async () => {
      try {
        const response = await axios.get(`${API_URL}/geofence/get_geofences`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        setGeofences(response.data); // Store the list of geofences in state
        setLoading(false); // Set loading to false after data is fetched
      } catch (error) {
        console.error("Error fetching geofences:", error);
        setError("Failed to fetch geofences. Please try again later.");
        setLoading(false); // Set loading to false even if there's an error
      }
    };

    fetchGeofences();
  }, []);

  // Define columns for the data table
  const columns: TableColumn<Geofence>[] = [
    {
      name: "Location",
      selector: (row) => row.location,
      sortable: true,
    },
    {
      name: "Latitude",
      selector: (row) => row.latitude,
      sortable: true,
    },
    {
      name: "Longitude",
      selector: (row) => row.longitude,
      sortable: true,
    },
    {
      name: "Radius (m)",
      selector: (row) => row.radius,
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          className="bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 transition duration-200"
          onClick={() => handleEdit(row.geofence_id)}
        >
          Edit
        </button>
      ),
    },
  ];

  const handleEdit = (geofenceId: number) => {
    // Navigate to the edit page
    navigate(`/admin-dashboard/geofences/edit/${geofenceId}`);
  };

  // Filter geofences based on the search query
  const filteredGeofences = geofences.filter((geofence) =>
    Object.values(geofence).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Geofence Management
        </h1>
        <AdminGeofenceAddLocation />
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search geofences..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Geofence List Section */}
      {loading ? (
        <p className="text-gray-600">Loading geofences...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredGeofences}
          pagination
          highlightOnHover
          striped
          responsive
          className="bg-white shadow rounded-lg"
        />
      )}

      <Outlet /> {/* Render nested routes here */}
    </div>
  );
};

export default AdminGeofencingManagement;
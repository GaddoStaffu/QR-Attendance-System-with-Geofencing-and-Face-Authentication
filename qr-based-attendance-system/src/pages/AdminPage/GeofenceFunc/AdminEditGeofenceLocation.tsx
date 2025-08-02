import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const AdminEditGeofenceLocation: React.FC = () => {
  const { geofenceId } = useParams<{ geofenceId: string }>(); // Get geofenceId from URL
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    location: "",
    latitude: "",
    longitude: "",
    radius: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeofenceDetails = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/geofence/get_geofence/${geofenceId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );
        const { location, latitude, longitude, radius } = response.data;
        setFormData({
          location,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          radius: radius.toString(),
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching geofence details:", error);
        alert("Failed to fetch geofence details. Please try again.");
        navigate(-1); // Go back if fetching fails
      }
    };

    fetchGeofenceDetails();
  }, [geofenceId, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(
        `${API_URL}/geofence/update_geofence/${geofenceId}`,
        {
          location: formData.location,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseFloat(formData.radius),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      alert("Geofence updated successfully!");
      navigate(-1); // Go back after successful update
    } catch (error) {
      console.error("Error updating geofence:", error);
      alert("Failed to update geofence. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this geofence?")) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/geofence/delete_geofence/${geofenceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      alert("Geofence deleted successfully!");
      navigate(-1); // Go back after successful deletion
    } catch (error) {
      console.error("Error deleting geofence:", error);
      alert("Failed to delete geofence. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-96">
          <p>Loading geofence details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Edit Geofence Location</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Location Name
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              name="latitude"
              value={formData.latitude}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              name="longitude"
              value={formData.longitude}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Radius (meters)
            </label>
            <input
              type="number"
              name="radius"
              value={formData.radius}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
              onClick={handleDelete}
            >
              Delete
            </button>
            <div>
              <button
                type="button"
                className="bg-gray-300 text-gray-700 py-2 px-4 rounded mr-2 hover:bg-gray-400"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEditGeofenceLocation;

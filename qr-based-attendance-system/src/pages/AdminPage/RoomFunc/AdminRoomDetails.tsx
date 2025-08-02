import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import DataTable, { TableColumn } from "react-data-table-component";

const API_URL = import.meta.env.VITE_API_URL;

interface Room {
  room_id: number;
  classname: string;
  section: string;
  description: string;
  isGeofence: boolean;
  geofence_id?: number;
  isFaceAuth: boolean;
  is_archived: boolean;
  owner_first_name: string;
  owner_last_name: string;
  owner_email?: string;
  geofence_location?: string;
}

interface Participant {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface Geofence {
  geofence_id: number;
  location: string;
}

interface AdminRoomDetailsProps {
  room: Room;
  onClose: () => void;
}

const AdminRoomDetails: React.FC<AdminRoomDetailsProps> = ({
  room,
  onClose,
}) => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(room.classname || "");
  const [editSection, setEditSection] = useState(room.section || "");
  const [editDescription, setEditDescription] = useState(
    room.description || ""
  );
  const [editGeofence, setEditGeofence] = useState<number | "">(
    room.geofence_id || ""
  );
  const [editIsGeofence, setEditIsGeofence] = useState(
    room.isGeofence ?? false
  );
  const [editIsFaceAuth, setEditIsFaceAuth] = useState(
    room.isFaceAuth ?? false
  );
  const [editIsArchived, setEditIsArchived] = useState(
    room.is_archived ?? false
  );
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const partRes = await axios.get(
          `${API_URL}/admin-rooms/get_room_participants/${room.room_id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );
        setParticipants(partRes.data);

        const geoRes = await axios.get(
          `${API_URL}/geofence/get_all_geofences`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );
        setGeofences(geoRes.data);
      } catch (err) {
        setParticipants([]);
        setGeofences([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [room.room_id]);

  const handleEdit = () => {
    setEditMode(true);
    setEditName(room.classname || "");
    setEditSection(room.section || "");
    setEditDescription(room.description || "");
    setEditGeofence(room.geofence_id || "");
    setEditIsGeofence(room.isGeofence ?? false);
    setEditIsFaceAuth(room.isFaceAuth ?? false);
    setEditIsArchived(room.is_archived ?? false);
  };

  const handleSave = async () => {
    const confirmed = window.confirm("Are you sure you want to save changes?");
    if (!confirmed) return;
    try {
      await axios.put(
        `${API_URL}/admin-rooms/edit_room/${room.room_id}`,
        {
          class_name: editName,
          section: editSection,
          description: editDescription,
          isGeofence: editIsGeofence,
          geofence_id:
            editIsGeofence && editGeofence !== "" ? editGeofence : null,
          isFaceAuth: editIsFaceAuth,
          is_archived: editIsArchived,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      setEditMode(false);
      window.location.href = "/admin-dashboard/rooms";
    } catch (err) {
      alert("Failed to update room.");
    }
  };

  const participantColumns: TableColumn<Participant>[] = [
    {
      name: "Name",
      selector: (row) => `${row.first_name} ${row.last_name}`,
      sortable: true,
    },
    {
      name: "Email",
      selector: (row) => row.email,
      sortable: true,
    },
    {
      name: "Role",
      selector: (row) => row.role,
      sortable: true,
    },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <p>Loading room details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl">
        {/* Top: Room Info */}
        <div className="mb-6 border-b pb-4">
          <h2 className="text-3xl font-bold mb-2">{room.classname}</h2>
          <div className="flex flex-wrap gap-4 mb-2">
            <div>
              <strong>Room ID:</strong> {room.room_id}
            </div>
            <div>
              <strong>Section:</strong> {room.section || "N/A"}
            </div>
            <div>
              <strong>Archived:</strong> {room.is_archived ? "Yes" : "No"}
            </div>
          </div>
          <div className="mb-2">
            <strong>Description:</strong> {room.description || "N/A"}
          </div>
          <div className="flex flex-wrap gap-4 mb-2">
            <div>
              <strong>Geofence Enabled:</strong>{" "}
              {room.isGeofence ? (
                <span className="text-green-600 font-semibold">Yes</span>
              ) : (
                "No"
              )}
            </div>
            <div>
              <strong>Geofence Location:</strong>{" "}
              {room.geofence_location || "N/A"}
            </div>
            <div>
              <strong>Face Authentication:</strong>{" "}
              {room.isFaceAuth ? (
                <span className="text-green-600 font-semibold">Yes</span>
              ) : (
                "No"
              )}
            </div>
          </div>
          <div>
            <strong>Owner:</strong>{" "}
            {room.owner_first_name && room.owner_last_name
              ? `${room.owner_first_name} ${room.owner_last_name}`
              : "N/A"}
            {room.owner_email && (
              <span className="ml-2 text-gray-600">({room.owner_email})</span>
            )}
          </div>
        </div>

        {/* Middle: Participants */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Participants</h3>
          <DataTable
            columns={participantColumns}
            data={participants}
            pagination
            highlightOnHover
            striped
            responsive
            noDataComponent={
              <p className="text-gray-600">No participants found.</p>
            }
            className="bg-white shadow rounded-lg"
          />
        </div>

        {/* Bottom: Edit Button or Edit Form */}
        <div className="flex flex-col gap-2">
          {editMode ? (
            <div className="mb-2">
              <div>
                <label>Class Name:</label>
                <input
                  className="border px-2 py-1 rounded w-full"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label>Section:</label>
                <input
                  className="border px-2 py-1 rounded w-full"
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                />
              </div>
              <div>
                <label>Description:</label>
                <input
                  className="border px-2 py-1 rounded w-full"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={editIsGeofence}
                  onChange={() => setEditIsGeofence((v) => !v)}
                  id="isGeofence"
                />
                <label htmlFor="isGeofence">
                  Enable Geofence
                  {room.isGeofence && (
                    <span className="ml-2 text-green-600 font-semibold">
                      (Currently Enabled)
                    </span>
                  )}
                </label>
              </div>
              <div>
                <label>Geofence Location:</label>
                <select
                  className="border px-2 py-1 rounded w-full"
                  value={editGeofence}
                  onChange={(e) =>
                    setEditGeofence(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  disabled={!editIsGeofence}
                >
                  <option value="">None</option>
                  {geofences.map((g) => (
                    <option key={g.geofence_id} value={g.geofence_id}>
                      {g.location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={editIsFaceAuth}
                  onChange={() => setEditIsFaceAuth((v) => !v)}
                  id="isFaceAuth"
                />
                <label htmlFor="isFaceAuth">
                  Enable Face Authentication
                  {room.isFaceAuth && (
                    <span className="ml-2 text-green-600 font-semibold">
                      (Currently Enabled)
                    </span>
                  )}
                </label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={editIsArchived}
                  onChange={() => setEditIsArchived((v) => !v)}
                  id="isArchived"
                />
                <label htmlFor="isArchived">Archive Room</label>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button
                  className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded self-end"
              onClick={handleEdit}
            >
              Edit Room
            </button>
          )}
          <button
            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRoomDetails;

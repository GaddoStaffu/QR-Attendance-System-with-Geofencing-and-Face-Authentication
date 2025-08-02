import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import axios from "axios";
import TeacherEditAttendanceScheduleModal from "./TeacherEditAttendanceScheduleModal";

interface TeacherAttendanceSchedulesProps {
  roomId: string;
  scheduleUpdated: boolean; // Prop to track if the schedule was updated
}

const API_URL = import.meta.env.VITE_API_URL;

// Utility function to format time to 12-hour format
const formatTimeTo12Hour = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

// Utility function to format date to "Month Day, Year"
const formatDateToMonthDayYear = (date: string) => {
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  return new Date(date).toLocaleDateString(undefined, options);
};

const TeacherAttendanceSchedules: React.FC<TeacherAttendanceSchedulesProps> = ({
  roomId,
  scheduleUpdated,
}) => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State for managing the edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);

  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No token found");
          setErrorMessage("You are not logged in.");
          return;
        }

        const response = await axios.get(
          `${API_URL}/attendance/${roomId}/attendance_schedule`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const fetchedSchedules = response.data || [];
        setSchedules(fetchedSchedules);
        setErrorMessage(null);
      } catch (error: any) {
        console.error("Error fetching schedules:", error);
        setErrorMessage(
          error.response?.data?.detail || "Failed to fetch schedules."
        );
        setSchedules([]);
      }
    };

    fetchSchedules();
  }, [roomId, scheduleUpdated]); // Fetch schedules when roomId or scheduleUpdated changes

  const filteredSchedules = schedules
    .filter(
      (schedule) =>
        schedule.schedule_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        schedule.schedule_description
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const handleView = (scheduleId: number) => {
    // Navigate to the attendance details page
    navigate(`/teacher-dashboard/rooms/${roomId}/${scheduleId}`);
  };

  const handleEdit = (schedule: any) => {
    setSelectedSchedule(schedule); // Set the selected schedule
    setIsEditModalOpen(true); // Open the modal
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false); // Close the modal
    setSelectedSchedule(null); // Clear the selected schedule
  };

  const handleUpdate = () => {
    // Refresh the schedules after editing
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No token found");
          setErrorMessage("You are not logged in.");
          return;
        }

        const response = await axios.get(
          `${API_URL}/attendance/${roomId}/attendance_schedule`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const fetchedSchedules = response.data || [];
        setSchedules(fetchedSchedules);
        setErrorMessage(null);
      } catch (error: any) {
        console.error("Error fetching schedules:", error);
        setErrorMessage(
          error.response?.data?.detail || "Failed to fetch schedules."
        );
        setSchedules([]);
      }
    };

    fetchSchedules();
  };

  return (
    <div>
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search schedules..."
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="newest">Sort by Newest</option>
          <option value="oldest">Sort by Oldest</option>
        </select>
      </div>

      {filteredSchedules.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {filteredSchedules.map((schedule) => (
            <div
              key={schedule.schedule_id}
              className="border rounded p-2 shadow-sm bg-white flex flex-col justify-between h-32"
            >
              <div>
                <h3 className="font-semibold text-sm truncate">
                  {schedule.schedule_name}
                </h3>
                <p className="text-xs text-gray-600 truncate">
                  {schedule.schedule_description || "No description available"}
                </p>
                <p className="text-xs">
                  <strong>Date:</strong>{" "}
                  {formatDateToMonthDayYear(schedule.date)}
                </p>
                <p className="text-xs">
                  <strong>Time:</strong>{" "}
                  {`${formatTimeTo12Hour(
                    schedule.start_time
                  )} - ${formatTimeTo12Hour(schedule.end_time)}`}
                </p>
              </div>
              <div className="flex justify-between mt-1">
                <button
                  className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
                  onClick={() => handleView(schedule.schedule_id)} // Navigate to details
                >
                  View
                </button>
                <button
                  className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                  onClick={() => handleEdit(schedule)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !errorMessage && <p>No attendance schedules found.</p>
      )}

      {/* Render the Edit Modal */}
      {isEditModalOpen && selectedSchedule && (
        <TeacherEditAttendanceScheduleModal
          scheduleId={selectedSchedule.schedule_id}
          scheduleInfo={selectedSchedule}
          onClose={handleModalClose}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default TeacherAttendanceSchedules;

import React, { useEffect, useState } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;
interface AttendanceSchedule {
  schedule_id: string;
  schedule_name: string;
  schedule_description?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "present" | "late" | "absent" | "pending";
  taken_at?: string | number | Date;
}

interface Props {
  roomId: string;
  searchQuery: string;
  sortField: string; // Accept sort field as a prop
  sortOrder: "asc" | "desc"; // Accept sort order as a prop
}

const StudentAttendanceSchedules: React.FC<Props> = ({
  roomId,
  searchQuery,
  sortField,
  sortOrder,
}) => {
  const [attendanceSchedules, setAttendanceSchedules] = useState<
    AttendanceSchedule[]
  >([]);
  const [filteredSchedules, setFilteredSchedules] = useState<
    AttendanceSchedule[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAttendanceSchedules = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setErrorMessage(
            "You are not logged in. Please log in to view attendance schedules."
          );
          setIsLoading(false);
          return;
        }

        const response = await axios.get(
          `${API_URL}/attendance/${roomId}/student_attendance_status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setAttendanceSchedules(response.data.attendance_status);
        setFilteredSchedules(response.data.attendance_status); // Initialize filtered schedules
        setErrorMessage(null);
      } catch (error: any) {
        console.error("Error fetching attendance schedules:", error);
        setErrorMessage(
          error.response?.data?.detail ||
            "Failed to fetch attendance schedules."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceSchedules();
  }, [roomId]);

  // Handle filtering and sorting
  useEffect(() => {
    let filtered = attendanceSchedules;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (schedule) =>
          schedule.schedule_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (schedule.schedule_description &&
            schedule.schedule_description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // Sort the filtered schedules
    filtered = filtered.sort((a, b) => {
      if (sortField === "date") {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortField === "status") {
        const statusOrder = ["present", "late", "absent", "pending"];
        const statusA = statusOrder.indexOf(a.status);
        const statusB = statusOrder.indexOf(b.status);
        return sortOrder === "asc" ? statusA - statusB : statusB - statusA;
      }
      return 0;
    });

    setFilteredSchedules(filtered);
  }, [searchQuery, sortField, sortOrder, attendanceSchedules]);

  if (isLoading) {
    return <p className="text-gray-500">Loading attendance schedules...</p>;
  }

  if (errorMessage) {
    return <p className="text-red-500">{errorMessage}</p>;
  }

  if (filteredSchedules.length === 0) {
    return <p className="text-gray-500">No attendance schedules available.</p>;
  }

  return (
    <div className="space-y-4">
      {filteredSchedules.map((schedule) => (
        <div
          key={schedule.schedule_id}
          className="bg-white p-4 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-bold text-gray-800">
            {schedule.schedule_name}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {schedule.schedule_description || "No Description"}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Date:</strong>{" "}
            {new Date(schedule.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Time:</strong>{" "}
            {new Date(`1970-01-01T${schedule.start_time}`).toLocaleTimeString(
              "en-US",
              {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }
            )}{" "}
            -{" "}
            {new Date(`1970-01-01T${schedule.end_time}`).toLocaleTimeString(
              "en-US",
              {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }
            )}
          </p>
          <p
            className={`text-sm font-medium ${
              schedule.status === "present"
                ? "text-green-600"
                : schedule.status === "late"
                ? "text-yellow-600"
                : schedule.status === "absent"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            <strong>Status:</strong> {schedule.status}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Taken At:</strong>{" "}
            {schedule.taken_at
              ? new Date(schedule.taken_at).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })
              : "N/A"}
          </p>
        </div>
      ))}
    </div>
  );
};

export default StudentAttendanceSchedules;
